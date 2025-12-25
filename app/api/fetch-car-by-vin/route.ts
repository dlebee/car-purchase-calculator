import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { vin } = await request.json();

    if (!vin) {
      return NextResponse.json(
        { error: 'VIN is required' },
        { status: 400 }
      );
    }

    // Use NHTSA VIN Decoder API (free, no API key required)
    // Let NHTSA handle VIN validation
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch car details from NHTSA VIN decoder' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // NHTSA returns an array with one result object
    if (!data.Results || data.Results.length === 0) {
      return NextResponse.json(
        { error: 'No vehicle data found for this VIN' },
        { status: 404 }
      );
    }

    const vehicle = data.Results[0];
    
    // NHTSA may return warnings/errors even for valid VINs
    // If we have Make and Model, use the data regardless of warnings
    // Only fail if we don't have the essential data
    if (!vehicle.Make || !vehicle.Model || vehicle.Make === '' || vehicle.Model === '') {
      // If we don't have Make/Model, check for errors
      const errors: string[] = [];
      if (vehicle.ErrorCode && vehicle.ErrorCode !== '0' && vehicle.ErrorCode !== '') {
        const errorText = vehicle.ErrorText || `Error Code: ${vehicle.ErrorCode}`;
        errors.push(errorText);
      }
      // Check for additional error text (NHTSA can return multiple errors)
      if (vehicle.AdditionalErrorText && vehicle.AdditionalErrorText.trim() !== '') {
        errors.push(vehicle.AdditionalErrorText);
      }
      
      if (errors.length > 0) {
        return NextResponse.json(
          { error: errors.join('; ') },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'No vehicle data found for this VIN' },
        { status: 404 }
      );
    }
    
    // Log warnings if present but don't fail - NHTSA can return warnings even for valid VINs
    if (vehicle.ErrorCode && vehicle.ErrorCode !== '0' && vehicle.ErrorCode !== '') {
      console.log(`VIN ${vin} has warnings but data retrieved:`, {
        errorCode: vehicle.ErrorCode,
        errorText: vehicle.ErrorText,
        make: vehicle.Make,
        model: vehicle.Model,
      });
    }

    // Extract and format the data
    const make = vehicle.Make || '';
    const model = vehicle.Model || '';
    const year = vehicle.ModelYear ? parseInt(vehicle.ModelYear) : new Date().getFullYear();
    
    // Try to extract trim/tier from various fields
    let tier = '';
    if (vehicle.Trim) {
      tier = vehicle.Trim;
    } else if (vehicle.Series) {
      tier = vehicle.Series;
    } else if (vehicle.Trim2) {
      tier = vehicle.Trim2;
    }

    return NextResponse.json({
      success: true,
      data: {
        make: make,
        model: model,
        year: year,
        tier: tier,
        mileage: 0, // NHTSA doesn't provide mileage
      },
    });
  } catch (error) {
    console.error('Error fetching car by VIN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

