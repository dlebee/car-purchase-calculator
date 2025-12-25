import { NextRequest, NextResponse } from 'next/server';
import { Car } from '@/lib/types';
import { calculateCarMetrics } from '@/lib/carCalculations';

export async function POST(request: NextRequest) {
  try {
    const { cars, overrides, customPrompt } = await request.json();

    if (!cars || !Array.isArray(cars) || cars.length === 0) {
      return NextResponse.json(
        { error: 'At least one car is required for comparison' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')));
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please ensure OPENAI_API_KEY is set in your Vercel environment variables.',
          details: process.env.NODE_ENV === 'development' 
            ? 'Make sure you have a .env.local file with OPENAI_API_KEY'
            : 'Make sure OPENAI_API_KEY is configured in Vercel project settings and redeploy after adding it.'
        },
        { status: 500 }
      );
    }

    // Apply overrides if provided (PREVIEW ONLY - does not modify original car data)
    const carsWithOverrides = cars.map((car: Car) => ({
      ...car,
      ...(overrides?.downPayment !== undefined && { downPayment: overrides.downPayment }),
      ...(overrides?.termLength !== undefined && { termLength: overrides.termLength }),
      ...(overrides?.apr !== undefined && { apr: overrides.apr }),
    }));

    // Calculate metrics for each car (with overrides applied)
    const carsWithMetrics = carsWithOverrides.map((car: Car) => {
      const metrics = calculateCarMetrics(car);
      return {
        ...car,
        metrics: {
          monthlyPayment: metrics.monthlyPayment,
          monthlyPaymentWithTax: metrics.monthlyPaymentWithTax,
          totalInterest: metrics.totalInterest,
          totalTax: metrics.totalTax,
          totalCost: metrics.totalCost,
          discount: metrics.discount,
          discountPercent: metrics.discountPercent,
          financedAmount: metrics.financedAmount,
        },
      };
    });

    // Analyze the dataset to determine what's relevant
    const hasSecondOwnerVehicles = carsWithOverrides.some((car: Car) => car.mileage > 100);
    const hasWarrantyInfo = carsWithOverrides.some((car: Car) => 
      car.warrantyType || 
      car.warrantyRemainingMonths !== undefined || 
      car.warrantyRemainingMiles !== undefined ||
      car.warrantyTransferrable !== undefined
    );
    const hasHighMileageVehicles = carsWithOverrides.some((car: Car) => car.mileage > 50000);
    const hasOldVehicles = carsWithOverrides.some((car: Car) => {
      const currentYear = new Date().getFullYear();
      return (currentYear - car.year) > 5;
    });

    // Build comparison data for OpenAI
    const comparisonData = carsWithMetrics.map((car: any) => {
      // Determine ownership status based on mileage (>100 miles = second owner)
      const isSecondOwner = car.mileage > 100;
      const ownershipStatus = isSecondOwner ? 'Second Owner' : 'First Owner';
      
      // Calculate car age
      const currentYear = new Date().getFullYear();
      const carAge = currentYear - car.year;
      
      // Build warranty information
      const warrantyInfo: any = {};
      if (car.warrantyType) {
        warrantyInfo.type = car.warrantyType;
      }
      if (car.warrantyRemainingMonths !== undefined && car.warrantyRemainingMonths !== null) {
        warrantyInfo.remainingMonths = car.warrantyRemainingMonths;
      }
      if (car.warrantyRemainingMiles !== undefined && car.warrantyRemainingMiles !== null) {
        warrantyInfo.remainingMiles = car.warrantyRemainingMiles.toLocaleString();
      }
      if (car.warrantyTransferrable !== undefined && car.warrantyTransferrable !== null) {
        warrantyInfo.transferrable = car.warrantyTransferrable ? 'Yes' : 'No';
      }
      if (Object.keys(warrantyInfo).length === 0) {
        warrantyInfo.status = 'Not specified';
      }
      
      return {
        vehicle: `${car.year} ${car.make} ${car.model}${car.tier ? ` ${car.tier}` : ''}`,
        year: car.year,
        age: carAge,
        mileage: car.mileage.toLocaleString(),
        ownershipStatus: ownershipStatus,
        listedPrice: car.listedPrice,
        negotiatedPrice: car.negotiatedPrice,
        downPayment: car.downPayment,
        apr: (car.apr * 100).toFixed(2) + '%',
        termLength: car.termLength,
        monthlyPayment: car.metrics.monthlyPaymentWithTax,
        totalInterest: car.metrics.totalInterest,
        totalCost: car.metrics.totalCost,
        discount: car.metrics.discount,
        discountPercent: car.metrics.discountPercent,
        creditScore: car.creditScore,
        warranty: warrantyInfo,
      };
    });

    const overridesInfo = overrides ? {
      downPayment: overrides.downPayment !== undefined ? `$${overrides.downPayment.toLocaleString()}` : null,
      termLength: overrides.termLength !== undefined ? `${overrides.termLength} months` : null,
      apr: overrides.apr !== undefined ? `${(overrides.apr * 100).toFixed(2)}%` : null,
    } : null;

    // Call OpenAI API for analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: (() => {
              let content = `You are an expert automotive financial advisor. Analyze car purchase comparisons and provide 
            clear, actionable insights. You MUST consider the following factors for each vehicle:
            
            FINANCIAL FACTORS:
            - Total cost of ownership (including all fees, interest, taxes)
            - Value proposition (price vs features, age, mileage)
            - Financing terms and their impact
            - Best overall value considering all costs
            
            VEHICLE CONDITION & LONGEVITY FACTORS:
            - Vehicle age and expected longevity (consider make/model reliability reputation)
            - Mileage and its impact on remaining useful life`;
              
              if (hasSecondOwnerVehicles) {
                content += `\n            - Ownership status (first vs second owner - second owner vehicles may have reduced warranty coverage)`;
              }
              
              if (hasWarrantyInfo) {
                content += `\n            - Warranty coverage:
              * Type of warranty (Manufacturer, Extended, CPO, None)
              * Remaining warranty period (months and/or miles)`;
                if (hasSecondOwnerVehicles) {
                  content += `\n              * Transferability status (critical for second owner vehicles)`;
                }
                content += `\n              * Impact of warranty on long-term ownership costs`;
              }
              
              if (hasSecondOwnerVehicles) {
                content += `\n            \n            OWNERSHIP CONSIDERATIONS:
            - Cars with >100 miles are considered second owner vehicles
            - Second owner vehicles may have reduced or non-transferrable warranties
            - Consider warranty transferability when comparing vehicles`;
              }
              
              if (hasHighMileageVehicles) {
                content += `\n            - High mileage vehicles (>50,000 miles) may require more maintenance`;
              }
              
              if (hasOldVehicles) {
                content += `\n            - Older vehicles (>5 years) may have higher maintenance costs and lower resale value`;
              }
              
              content += `\n            - Factor in potential repair costs after warranty expiration
            - Consider depreciation curves based on age and mileage
            
            OTHER FACTORS:
            - Potential negotiation opportunities
            - Risks or concerns specific to each vehicle
            - Long-term value retention
            
            Be concise, practical, and objective. Format your response using markdown with clear sections, headers (##), bullet points (-), and bold text (**) where appropriate.`;
              
              if (hasSecondOwnerVehicles) {
                content += `\n            Always highlight warranty transferability issues for second owner vehicles, as this significantly impacts long-term costs.`;
              }
              
              if (hasWarrantyInfo) {
                content += `\n            Pay special attention to warranty details and their impact on long-term ownership costs.`;
              }
              
              return content;
            })(),
          },
          {
            role: 'user',
            content: (() => {
              let content = `Please analyze this car comparison:
            
${JSON.stringify(comparisonData, null, 2)}`;

              if (overridesInfo) {
                content += `\n\nIMPORTANT: This comparison uses standardized overrides applied to ALL vehicles for fair comparison:`;
                if (overridesInfo.downPayment) content += `\n- Down Payment: ${overridesInfo.downPayment}`;
                if (overridesInfo.termLength) content += `\n- Term Length: ${overridesInfo.termLength}`;
                if (overridesInfo.apr) content += `\n- APR: ${overridesInfo.apr}`;
                content += `\n\nAll financial metrics (monthly payment, total interest, total cost) shown above are calculated using these standardized values, not the individual car's original terms. This allows for an apples-to-apples comparison.`;
              }

              if (hasSecondOwnerVehicles) {
                content += `\n\nCRITICAL ANALYSIS REQUIREMENTS:
1. For each vehicle, assess:
   - Expected longevity based on make/model reputation, age, and mileage`;
                if (hasWarrantyInfo) {
                  content += `\n   - Warranty coverage and transferability (especially important for second owner vehicles)`;
                }
                content += `\n   - Potential repair costs after warranty expiration
   - Depreciation impact based on age/mileage

2. For second owner vehicles (>100 miles):
   - Emphasize warranty transferability status
   - Highlight potential risks if warranty is not transferrable
   - Consider impact on resale value

3. Compare vehicles considering:
   - Total cost of ownership over expected useful life`;
                if (hasWarrantyInfo) {
                  content += `\n   - Warranty protection value`;
                }
                content += `\n   - Long-term reliability and maintenance costs
   - Resale value potential`;
              } else {
                content += `\n\nANALYSIS REQUIREMENTS:
1. For each vehicle, assess:
   - Expected longevity based on make/model reputation, age, and mileage`;
                if (hasWarrantyInfo) {
                  content += `\n   - Warranty coverage and its impact on long-term costs`;
                }
                content += `\n   - Potential repair costs after warranty expiration
   - Depreciation impact based on age/mileage

2. Compare vehicles considering:
   - Total cost of ownership over expected useful life`;
                if (hasWarrantyInfo) {
                  content += `\n   - Warranty protection value`;
                }
                content += `\n   - Long-term reliability and maintenance costs
   - Resale value potential`;
              }

              if (customPrompt) {
                content += `\n\nADDITIONAL USER REQUEST:\n${customPrompt}\n\nPlease incorporate this into your analysis.`;
              }

              content += `\n\nProvide a comprehensive analysis comparing these vehicles, highlighting the best value considering both financial and longevity factors, key differences, and recommendations. Format your response using markdown.`;
              
              return content;
            })(),
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('OpenAI API error:', errorData);
      
      let errorMessage = 'Failed to analyze comparison';
      if (errorData.error) {
        if (errorData.error.code === 'insufficient_quota') {
          errorMessage = 'OpenAI API quota exceeded. Please check your billing and plan at https://platform.openai.com/account/billing';
        } else if (errorData.error.code === 'invalid_api_key') {
          errorMessage = 'Invalid OpenAI API key. Please check your API key configuration.';
        } else if (errorData.error.message) {
          errorMessage = `OpenAI API error: ${errorData.error.message}`;
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return NextResponse.json({
      success: true,
      analysis: analysis,
    });
  } catch (error) {
    console.error('Error analyzing comparison:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

