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
          dealerFinancingMarkupCost: metrics.dealerFinancingMarkupCost,
          totalAllFees: metrics.totalAllFees,
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

    // Expected residual value ranges by term length (for lease analysis)
    const expectedResidualRanges: Record<number, { expected: number; min: number; max: number }> = {
      24: { expected: 65.0, min: 63.0, max: 67.0 },
      36: { expected: 60.0, min: 58.0, max: 62.0 },
      48: { expected: 53.0, min: 51.0, max: 55.0 },
      60: { expected: 46.0, min: 44.0, max: 48.0 },
      72: { expected: 39.0, min: 37.0, max: 41.0 },
    };

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
      
      // Get expected residual range for this term length
      const residualRange = expectedResidualRanges[car.termLength] || null;
      
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
        buyRateApr: car.buyRateApr !== undefined && car.buyRateApr > 0 ? (car.buyRateApr * 100).toFixed(2) + '%' : null,
        termLength: car.termLength,
        monthlyPayment: car.metrics.monthlyPaymentWithTax,
        totalInterest: car.metrics.totalInterest,
        totalCost: car.metrics.totalCost,
        discount: car.metrics.discount,
        discountPercent: car.metrics.discountPercent,
        creditScore: car.creditScore,
        dealerFees: car.dealerFees || 0,
        registrationFees: car.registrationFees || 0,
        titleFees: car.titleFees || 0,
        otherFees: car.otherFees || 0,
        totalFees: car.metrics.totalAllFees,
        dealerFinancingMarkup: car.metrics.dealerFinancingMarkupCost || 0,
        warranty: warrantyInfo,
        expectedResidualRange: residualRange ? {
          expected: residualRange.expected,
          min: residualRange.min,
          max: residualRange.max,
          termLength: car.termLength,
        } : null,
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
            
            DEALERSHIP TACTICS & NEGOTIATION FACTORS:
            - APR Markup: Check if dealership offers discount but marks up APR - compare total cost, not just discount
            - Down Payment: Evaluate if down payment is necessary or if money could be better used elsewhere
            - Fee Analysis: Identify unnecessary fees (dealer/doc fees, prep fees, protection packages) vs legitimate fees (registration, title, taxes)
            - Dealer Financing Markup: If buyRateApr is provided, check for dealer markup on financing - this is hidden profit
            - Fee Negotiation: Dealer fees are often negotiable - recommend negotiating or asking dealer to reduce vehicle price instead
            - Total Fee Reasonableness: Total fees (excluding tax) should typically be $500-$1,200 - flag excessive fees
            
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

              content += `\n\nDEALERSHIP TACTICS TO CHECK:
              
1. **APR Markup Tactic**: Check if any dealership offers a discount on the vehicle price but simultaneously marks up the APR. Compare the total cost (price + interest), not just the discount. A lower price with a higher APR may cost more over the loan term than a higher price with a lower APR. If buyRateApr is provided, calculate the dealer financing markup cost.

2. **Down Payment Evaluation**: For purchases, down payments do provide equity, but evaluate if the down payment amount is necessary. Consider if that money could be better invested elsewhere or kept for emergencies. Only recommend higher down payments if they significantly reduce total interest costs.

3. **Fee Analysis & Negotiation**:
   - **Negotiable Fees** (often overpriced): Dealer/Doc fees ($200-$800, actual cost $50-$150), Dealer Prep fees ($200-$500, often already included), Acquisition fees ($500-$900, sometimes negotiable)
   - **Unnecessary Fees** (should be refused): VIN Etching ($200-$400), Paint/Fabric Protection ($300-$800), Tire/Wheel Protection ($400-$1,200), Extended Warranties on new vehicles ($1,500-$4,000)
   - **Legitimate Fees** (usually non-negotiable): Registration fees ($50-$200), Title fees ($50-$400), Sales tax
   - **Total Fee Reasonableness**: Total fees (excluding sales tax) should typically be between $500-$1,200. Flag any vehicle with total fees significantly higher than this range.
   - **Recommendation**: For each vehicle, identify which fees are negotiable and recommend negotiating them down or asking the dealer to reduce the vehicle price by that amount instead.

4. **Dealer Financing Markup**: If buyRateApr is provided, check for dealer markup on financing. This represents hidden profit the dealer makes by marking up the interest rate above what the lender actually offers. Flag this as a negotiation opportunity - you can ask the dealer to match the buy rate or reduce the vehicle price by the markup amount.

5. **Discount vs APR Trade-off**: When comparing vehicles, if one has a larger discount but higher APR, calculate the total cost difference. The vehicle with the lower total cost (price + interest + fees) is the better deal, not necessarily the one with the biggest discount.

6. **Residual Value Negotiation** (for leases): Each vehicle includes an expectedResidualRange based on its termLength. Use these ranges to evaluate if the residual value is reasonable:
   - **24 months**: Expected 65.0%, Acceptable Range: 63.0% - 67.0%
   - **36 months**: Expected 60.0%, Acceptable Range: 58.0% - 62.0%
   - **48 months**: Expected 53.0%, Acceptable Range: 51.0% - 55.0%
   - **60 months**: Expected 46.0%, Acceptable Range: 44.0% - 48.0%
   - **72 months**: Expected 39.0%, Acceptable Range: 37.0% - 41.0%
   
   If a vehicle's residual value is provided and falls outside the acceptable range for its term length, flag this as a negotiation opportunity. Residual values significantly above the expected range may indicate the dealer is inflating residual to make monthly payments appear lower, while recouping costs elsewhere. Residual values significantly below expected may indicate the dealer is being conservative, which could be negotiated upward.

Provide a comprehensive analysis comparing these vehicles, highlighting the best value considering both financial and longevity factors, key differences, and specific recommendations for negotiating fees, financing terms, and residual values (if applicable). Include a negotiation recommendations table with columns: Vehicle, Parameter, Current Value, Target Value, Priority, and Strategy. Format your response using markdown.`;
              
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

