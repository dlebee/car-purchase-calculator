'use client';

import { Car } from '@/lib/types';
import { calculateCarMetrics } from '@/lib/carCalculations';

interface ComparisonTableProps {
  cars: Car[];
  downPaymentOverride?: number;
  termOverride?: number;
}

export default function ComparisonTable({ cars, downPaymentOverride, termOverride }: ComparisonTableProps) {
  if (cars.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
        Select cars to compare
      </div>
    );
  }

  // Apply overrides if provided (PREVIEW ONLY - does not modify saved car data)
  // Creates new objects with spread operator to avoid mutating original cars
  const carsWithOverride = cars.map((car) => ({
    ...car,
    ...(downPaymentOverride !== undefined && { downPayment: downPaymentOverride }),
    ...(termOverride !== undefined && { termLength: termOverride }),
  }));

  const allMetrics = carsWithOverride.map((car) => calculateCarMetrics(car));
  
  // Get baseline (best-priced car) metrics for comparison
  const baselineMetrics = allMetrics[0]; // First car is the best-priced (lowest total cost)
  const baselineCar = carsWithOverride[0]; // Use car with override for baseline comparisons

  const fields = [
    { label: 'Year', key: 'year' as keyof Car },
    { label: 'Make', key: 'make' as keyof Car },
    { label: 'Model', key: 'model' as keyof Car },
    { label: 'Tier', key: 'tier' as keyof Car },
    { label: 'VIN', key: 'vin' as keyof Car },
    { label: 'Dealership', key: 'dealership' as keyof Car },
    { label: 'Listed Price', key: 'listedPrice' as keyof Car, format: 'currency' },
    { label: 'Negotiated Price', key: 'negotiatedPrice' as keyof Car, format: 'currency' },
    { label: 'APR', key: 'apr' as keyof Car, format: 'percentage' },
    { label: 'Term Length (months)', key: 'termLength' as keyof Car },
    { label: 'Tax Rate (%)', key: 'taxRate' as keyof Car, format: 'percentage' },
    { label: 'Tax Amount', key: 'tax' as keyof Car, format: 'currency' },
    { label: 'Credit Score', key: 'creditScore' as keyof Car },
    { label: 'Mileage', key: 'mileage' as keyof Car, format: 'number' },
    { label: 'Down Payment', key: 'downPayment' as keyof Car, format: 'currency' },
    { label: 'Monthly Payment', key: 'monthlyPayment', format: 'currency', calculated: true },
    { label: 'Monthly Payment w/ Tax', key: 'monthlyPaymentWithTax', format: 'currency', calculated: true },
    { label: 'Total Interest', key: 'totalInterest', format: 'currency', calculated: true },
    { label: 'Total Tax', key: 'totalTax', format: 'currency', calculated: true },
    { label: 'Total Cost', key: 'totalCost', format: 'currency', calculated: true },
    { label: 'Discount', key: 'discount', format: 'currency', calculated: true },
    { label: 'Discount %', key: 'discountPercent', format: 'percentage', calculated: true },
  ];

  const formatValue = (
    value: any,
    format?: string
  ): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (format === 'currency') {
      return `$${Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    if (format === 'percentage') {
      // If it's already a percentage (like taxRate), show as-is
      // If it's a decimal (like APR), multiply by 100
      const numValue = Number(value);
      if (numValue > 1 || numValue === 0) {
        // Already a percentage
        return `${numValue.toFixed(2)}%`;
      } else {
        // Decimal, convert to percentage
        return `${(numValue * 100).toFixed(2)}%`;
      }
    }

    if (format === 'number') {
      return Number(value).toLocaleString();
    }

    return String(value);
  };

  const getValue = (car: Car, metrics: ReturnType<typeof calculateCarMetrics>, field: typeof fields[0], originalCar: Car): any => {
    if (field.calculated) {
      if (field.key === 'monthlyPayment') return metrics.monthlyPayment;
      if (field.key === 'monthlyPaymentWithTax') return metrics.monthlyPaymentWithTax;
      if (field.key === 'totalInterest') return metrics.totalInterest;
      if (field.key === 'totalTax') return metrics.totalTax;
      if (field.key === 'totalCost') return metrics.totalCost;
      if (field.key === 'discount') return metrics.discount;
      if (field.key === 'discountPercent') return metrics.discountPercent / 100;
    }
    // For overrides, show override value if active, otherwise show original
    if (field.key === 'downPayment' && downPaymentOverride !== undefined) {
      return downPaymentOverride;
    }
    if (field.key === 'termLength' && termOverride !== undefined) {
      return termOverride;
    }
    return originalCar[field.key as keyof Car];
  };

  // Fields that should show differences
  const fieldsWithDifferences = [
    'totalCost',
    'monthlyPaymentWithTax',
    'totalInterest',
    'totalTax',
    'negotiatedPrice',
    'listedPrice',
    'monthlyPayment',
    'apr',
    'taxRate',
    'tax',
  ];

  const getDifference = (
    field: typeof fields[0],
    value: any,
    metrics: ReturnType<typeof calculateCarMetrics>
  ): number | null => {
    if (!fieldsWithDifferences.includes(field.key)) return null;
    
    let baselineValue: number;
    if (field.calculated) {
      if (field.key === 'monthlyPayment') baselineValue = baselineMetrics.monthlyPayment;
      else if (field.key === 'monthlyPaymentWithTax') baselineValue = baselineMetrics.monthlyPaymentWithTax;
      else if (field.key === 'totalInterest') baselineValue = baselineMetrics.totalInterest;
      else if (field.key === 'totalTax') baselineValue = baselineMetrics.totalTax;
      else if (field.key === 'totalCost') baselineValue = baselineMetrics.totalCost;
      else return null;
    } else {
      if (field.key === 'negotiatedPrice') baselineValue = baselineCar.negotiatedPrice;
      else if (field.key === 'listedPrice') baselineValue = baselineCar.listedPrice;
      else if (field.key === 'apr') baselineValue = baselineCar.apr;
      else if (field.key === 'taxRate') baselineValue = baselineCar.taxRate;
      else if (field.key === 'tax') baselineValue = baselineCar.tax;
      else if (field.key === 'downPayment') baselineValue = baselineCar.downPayment;
      else return null;
    }
    
    const currentValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return currentValue - baselineValue;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
              Field
            </th>
            {cars.map((car, index) => (
              <th
                key={car.id}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]"
              >
                {car.year} {car.make} {car.model}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {fields.map((field) => (
            <tr key={field.label} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                {field.label}
              </td>
              {cars.map((car, index) => {
                const carWithOverride = carsWithOverride[index];
                const originalCar = cars[index];
                const value = getValue(carWithOverride, allMetrics[index], field, originalCar);
                const difference = getDifference(field, value, allMetrics[index]);
                const showDifference = difference !== null && index > 0 && Math.abs(difference) > 0.01;
                const isOverridden = 
                  (field.key === 'downPayment' && downPaymentOverride !== undefined) ||
                  (field.key === 'termLength' && termOverride !== undefined);
                
                return (
                  <td
                    key={car.id}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex flex-col">
                      <span className={isOverridden ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>
                        {formatValue(value, field.format)}
                        {isOverridden && <span className="text-xs ml-1">(override)</span>}
                      </span>
                      {showDifference && (
                        <span className={`text-xs mt-1 ${
                          difference > 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {difference > 0 ? '+' : ''}{formatValue(difference, field.format)}
                          {difference > 0 && ' more'}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

