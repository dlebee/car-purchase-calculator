'use client';

import { Car } from '@/lib/types';
import { calculateCarMetrics } from '@/lib/carCalculations';

interface ComparisonTableProps {
  cars: Car[];
}

export default function ComparisonTable({ cars }: ComparisonTableProps) {
  if (cars.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
        Select cars to compare
      </div>
    );
  }

  const allMetrics = cars.map((car) => calculateCarMetrics(car));

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
    { label: 'Notes', key: 'notes' as keyof Car },
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

  const getValue = (car: Car, metrics: ReturnType<typeof calculateCarMetrics>, field: typeof fields[0]): any => {
    if (field.calculated) {
      if (field.key === 'monthlyPayment') return metrics.monthlyPayment;
      if (field.key === 'monthlyPaymentWithTax') return metrics.monthlyPaymentWithTax;
      if (field.key === 'totalInterest') return metrics.totalInterest;
      if (field.key === 'totalTax') return metrics.totalTax;
      if (field.key === 'totalCost') return metrics.totalCost;
      if (field.key === 'discount') return metrics.discount;
      if (field.key === 'discountPercent') return metrics.discountPercent / 100;
    }
    return car[field.key];
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
                const value = getValue(car, allMetrics[index], field);
                return (
                  <td
                    key={car.id}
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
                  >
                    {formatValue(value, field.format)}
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

