'use client';

import { Car } from '@/lib/types';
import { calculateCarMetrics } from '@/lib/carCalculations';

interface ComparisonTableProps {
  cars: Car[];
  downPaymentOverride?: number;
  termOverride?: number;
  aprOverride?: number;
  onExportCSV?: () => void;
  onDeleteCar?: (carId: string) => void;
}

export default function ComparisonTable({ cars, downPaymentOverride, termOverride, aprOverride, onExportCSV, onDeleteCar }: ComparisonTableProps) {
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
    ...(aprOverride !== undefined && { apr: aprOverride }),
  }));

  const allMetrics = carsWithOverride.map((car) => calculateCarMetrics(car));
  
  // Get baseline (best-priced car) metrics for comparison
  const baselineMetrics = allMetrics[0]; // First car is the best-priced (lowest total cost)
  const baselineCar = carsWithOverride[0]; // Use car with override for baseline comparisons

  // Fields to display in the table (simplified)
  const fields = [
    // Cost Breakdown
    { label: 'Listed Price', key: 'listedPrice' as keyof Car, format: 'currency' },
    { label: 'Discount', key: 'discount', format: 'currency', calculated: true, showPercent: true },
    { label: 'Total Fees', key: 'totalAllFees', format: 'currency', calculated: true },
    { label: 'Total Taxes', key: 'totalTax', format: 'currency', calculated: true },
    { label: 'Down Payment', key: 'downPayment' as keyof Car, format: 'currency' },
    { label: 'Financed Amount', key: 'financedAmount', format: 'currency', calculated: true },
    { label: 'Total Interest', key: 'totalInterest', format: 'currency', calculated: true },
    { label: 'Avg Yearly Interest', key: 'averageAnnualInterest', format: 'currency', calculated: true },
    { label: 'Total Cost', key: 'totalCost', format: 'currency', calculated: true },
  ];

  // Monthly amounts (separate section)
  const monthlyFields = [
    { label: 'Monthly Payment', key: 'monthlyPayment', format: 'currency', calculated: true },
    { label: 'Monthly Payment w/ Tax', key: 'monthlyPaymentWithTax', format: 'currency', calculated: true },
  ];

  // All fields for CSV export (includes everything)
  const allFieldsForExport = [
    // Basic Vehicle Info
    { label: 'Year', key: 'year' as keyof Car },
    { label: 'Make', key: 'make' as keyof Car },
    { label: 'Model', key: 'model' as keyof Car },
    { label: 'Tier', key: 'tier' as keyof Car },
    { label: 'VIN', key: 'vin' as keyof Car },
    { label: 'Mileage', key: 'mileage' as keyof Car, format: 'number' },
    { label: 'Seats', key: 'seats' as keyof Car },
    
    // Dealership Info
    { label: 'Dealership', key: 'dealership' as keyof Car },
    { label: 'Rep Name', key: 'repName' as keyof Car },
    { label: 'Rep Phone', key: 'repPhone' as keyof Car },
    
    // Pricing Breakdown
    { label: 'Listed Price', key: 'listedPrice' as keyof Car, format: 'currency' },
    { label: 'Negotiated Price', key: 'negotiatedPrice' as keyof Car, format: 'currency' },
    { label: 'Discount', key: 'discount', format: 'currency', calculated: true },
    { label: 'Discount %', key: 'discountPercent', format: 'percentage', calculated: true },
    
    // Down Payment
    { label: 'Down Payment', key: 'downPayment' as keyof Car, format: 'currency' },
    
    // Tax Breakdown
    { label: 'Tax Rate (%)', key: 'taxRate' as keyof Car, format: 'percentage' },
    { label: 'Flat Tax Fee', key: 'flatTaxFee' as keyof Car, format: 'currency' },
    { label: 'Tax Amount', key: 'tax' as keyof Car, format: 'currency' },
    { label: 'Total Tax', key: 'totalTax', format: 'currency', calculated: true },
    
    // Fees Breakdown
    { label: 'Dealer Fees', key: 'dealerFees' as keyof Car, format: 'currency' },
    { label: 'Government Fees', key: 'governmentFees' as keyof Car, format: 'currency' },
    { label: 'Other Fees', key: 'otherFees' as keyof Car, format: 'currency' },
    { label: 'Total Fees', key: 'totalAllFees', format: 'currency', calculated: true },
    
    // Financing Terms
    { label: 'APR', key: 'apr' as keyof Car, format: 'percentage' },
    { label: 'Term Length (months)', key: 'termLength' as keyof Car },
    
    // Monthly Payments
    { label: 'Monthly Payment', key: 'monthlyPayment', format: 'currency', calculated: true },
    { label: 'Monthly Payment w/ Tax', key: 'monthlyPaymentWithTax', format: 'currency', calculated: true },
    
    // Interest Breakdown
    { label: 'Total Interest Paid', key: 'totalInterest', format: 'currency', calculated: true },
    { label: 'Avg Annual Interest', key: 'averageAnnualInterest', format: 'currency', calculated: true },
    
    // Totals
    { label: 'Total Cost', key: 'totalCost', format: 'currency', calculated: true },
    
    // Additional Info
    { label: 'Credit Score', key: 'creditScore' as keyof Car },
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

  const getValue = (car: Car, metrics: ReturnType<typeof calculateCarMetrics>, field: typeof fields[0] | typeof monthlyFields[0] | typeof allFieldsForExport[0], originalCar: Car): any => {
    if (field.calculated) {
      if (field.key === 'monthlyPayment') return metrics.monthlyPayment;
      if (field.key === 'monthlyPaymentWithTax') return metrics.monthlyPaymentWithTax;
      if (field.key === 'totalInterest') return metrics.totalInterest;
      if (field.key === 'averageAnnualInterest') return metrics.averageAnnualInterest;
      if (field.key === 'totalTax') return metrics.totalTax;
      if (field.key === 'totalAllFees') return metrics.totalAllFees;
      if (field.key === 'totalCost') return metrics.totalCost;
      if (field.key === 'discount') return metrics.discount;
      if (field.key === 'discountPercent') return metrics.discountPercent / 100;
      if (field.key === 'adjustedCost') return metrics.adjustedCost;
      if (field.key === 'financedAmount') return metrics.financedAmount;
    }
    // For overrides, show override value if active, otherwise show original
    if (field.key === 'downPayment' && downPaymentOverride !== undefined) {
      return downPaymentOverride;
    }
    if (field.key === 'termLength' && termOverride !== undefined) {
      return termOverride;
    }
    if (field.key === 'apr' && aprOverride !== undefined) {
      return aprOverride;
    }
    return originalCar[field.key as keyof Car];
  };

  const getDiscountPercent = (car: Car, metrics: ReturnType<typeof calculateCarMetrics>): number | null => {
    return metrics.discountPercent !== null && metrics.discountPercent !== undefined ? metrics.discountPercent : null;
  };

  // Fields that should show differences (all fields show differences)
  const fieldsWithDifferences = [
    'listedPrice',
    'discount',
    'totalAllFees',
    'totalTax',
    'downPayment',
    'financedAmount',
    'totalInterest',
    'averageAnnualInterest',
    'totalCost',
    'monthlyPayment',
  ];

  const getDifference = (
    field: typeof fields[0] | typeof allFieldsForExport[0],
    value: any,
    metrics: ReturnType<typeof calculateCarMetrics>
  ): number | null => {
    if (!fieldsWithDifferences.includes(field.key)) return null;
    
    let baselineValue: number;
    if (field.calculated) {
      if (field.key === 'monthlyPayment') baselineValue = baselineMetrics.monthlyPayment;
      else if (field.key === 'monthlyPaymentWithTax') baselineValue = baselineMetrics.monthlyPaymentWithTax;
      else if (field.key === 'totalInterest') baselineValue = baselineMetrics.totalInterest;
      else if (field.key === 'averageAnnualInterest') baselineValue = baselineMetrics.averageAnnualInterest;
      else if (field.key === 'totalTax') baselineValue = baselineMetrics.totalTax;
      else if (field.key === 'totalAllFees') baselineValue = baselineMetrics.totalAllFees;
      else if (field.key === 'totalCost') baselineValue = baselineMetrics.totalCost;
      else if (field.key === 'adjustedCost') baselineValue = baselineMetrics.adjustedCost;
      else if (field.key === 'financedAmount') baselineValue = baselineMetrics.financedAmount;
      else if (field.key === 'discount') baselineValue = baselineMetrics.discount;
      else return null;
    } else {
      if (field.key === 'listedPrice') baselineValue = baselineCar.listedPrice;
      else if (field.key === 'downPayment') baselineValue = baselineCar.downPayment;
      else return null;
    }
    
    const currentValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    const diff = currentValue - baselineValue;
    // For discount, flip the difference (negative discount is better, so show positive diff as better)
    if (field.key === 'discount') {
      return -diff;
    }
    return diff;
  };

  const formatValueForCSV = (value: any, format?: string): string => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (format === 'currency') {
      return Number(value).toFixed(2);
    }

    if (format === 'percentage') {
      const numValue = Number(value);
      if (numValue > 1 || numValue === 0) {
        return numValue.toFixed(2);
      } else {
        return (numValue * 100).toFixed(2);
      }
    }

    if (format === 'number') {
      return Number(value).toString();
    }

    // Escape commas and quotes for CSV
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportToCSV = () => {
    // Check if any overrides are active
    const hasOverrides = downPaymentOverride !== undefined || termOverride !== undefined || aprOverride !== undefined;
    
    // Create CSV header
    const headers = ['Field', ...cars.map(car => {
      const parts = [car.year, car.make, car.model];
      if (car.tier && car.tier.trim() !== '') {
        parts.push(car.tier);
      }
      return parts.join(' ');
    })];
    
    // Create CSV rows
    const rows: string[][] = [];
    
    // Add override information as first rows if overrides are active
    if (hasOverrides) {
      rows.push(['', '']); // Empty row for spacing
      rows.push(['COMPARISON OVERRIDES (Applied to all vehicles)', '']);
      if (downPaymentOverride !== undefined) {
        rows.push(['Down Payment Override', formatValueForCSV(downPaymentOverride, 'currency')]);
      }
      if (termOverride !== undefined) {
        rows.push(['Term Length Override (months)', formatValueForCSV(termOverride, 'number')]);
      }
      if (aprOverride !== undefined) {
        rows.push(['APR Override (%)', formatValueForCSV(aprOverride * 100, 'percentage')]);
      }
      rows.push(['', '']); // Empty row for spacing
      rows.push(['NOTE: All financial metrics below are calculated using the standardized overrides above', '']);
      rows.push(['', '']); // Empty row for spacing
    }
    
    allFieldsForExport.forEach((field) => {
      const row: string[] = [field.label];
      cars.forEach((car, index) => {
        const carWithOverride = carsWithOverride[index];
        const originalCar = cars[index];
        const value = getValue(carWithOverride, allMetrics[index], field, originalCar);
        const difference = getDifference(field, value, allMetrics[index]);
        const showDifference = difference !== null && index > 0 && Math.abs(difference) > 0.01;
        
        let cellValue = formatValueForCSV(value, field.format || 'number');
        if (showDifference) {
          const diffStr = formatValueForCSV(difference, field.format);
          cellValue += ` (${difference > 0 ? '+' : ''}${diffStr})`;
        }
        
        // Add override indicator for overridden fields
        const isOverridden = 
          (field.key === 'downPayment' && downPaymentOverride !== undefined) ||
          (field.key === 'termLength' && termOverride !== undefined) ||
          (field.key === 'apr' && aprOverride !== undefined);
        if (isOverridden) {
          cellValue += ' [OVERRIDE]';
        }
        
        row.push(cellValue);
      });
      rows.push(row);
    });
    
    // Convert to CSV string
    const csvContent = [
      headers.map(h => h.includes(',') ? `"${h.replace(/"/g, '""')}"` : h).join(','),
      ...rows.map(row => {
        // Handle rows with fewer columns than headers
        while (row.length < headers.length) {
          row.push('');
        }
        return row.join(',');
      })
    ].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `car-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (onExportCSV) {
      onExportCSV();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comparison Table</h3>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors text-sm"
        >
          Export to CSV
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-30">
                Field
              </th>
              {cars.map((car, index) => (
                <th
                  key={car.id}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px] bg-gray-50 dark:bg-gray-700"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">
                        {car.year} {car.make} {car.model}{car.tier && car.tier.trim() !== '' ? ` ${car.tier}` : ''}
                      </span>
                    </div>
                    {onDeleteCar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCar(car.id);
                        }}
                        className="p-0.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete car"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {fields.map((field) => (
            <tr key={field.label} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
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
                  (field.key === 'termLength' && termOverride !== undefined) ||
                  (field.key === 'apr' && aprOverride !== undefined);
                
                // Special handling for discount field to show percentage in parentheses
                const discountPercent = field.key === 'discount' && (field as any).showPercent 
                  ? getDiscountPercent(carWithOverride, allMetrics[index])
                  : null;
                
                // Show tax rate for tax field
                const showTaxRate = field.key === 'totalTax' && (field as any).showTaxRate;
                const taxRate = showTaxRate ? carWithOverride.taxRate : null;
                
                // Show APR for total interest field
                const showApr = field.key === 'totalInterest' && (field as any).showApr;
                const apr = showApr ? carWithOverride.apr : null;
                
                return (
                  <td
                    key={car.id}
                    className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex flex-col">
                      <span className={`text-xs ${isOverridden ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>
                        {formatValue(value, field.format)}
                        {discountPercent !== null && (
                          <span className="text-[10px] ml-1 text-gray-500 dark:text-gray-400">
                            ({discountPercent >= 0 ? '-' : '+'}{Math.abs(discountPercent).toFixed(1)}%)
                          </span>
                        )}
                        {taxRate !== null && taxRate > 0 && (
                          <span className="text-[10px] ml-1 text-gray-500 dark:text-gray-400">
                            ({taxRate.toFixed(2)}%)
                          </span>
                        )}
                        {apr !== null && apr > 0 && (
                          <span className="text-[10px] ml-1 text-gray-500 dark:text-gray-400">
                            ({(apr * 100).toFixed(2)}% APR)
                          </span>
                        )}
                        {isOverridden && <span className="text-[10px] ml-1">(override)</span>}
                      </span>
                      {showDifference && (
                        <span className={`text-[10px] mt-0.5 ${
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
        
        {/* Monthly amounts section */}
        <div className="border-t-2 border-gray-300 dark:border-gray-600 mt-2">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1 bg-gray-50 dark:bg-gray-700">
            Monthly Amounts
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {monthlyFields.map((field) => (
              <tr key={field.label} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
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
                    (field.key === 'termLength' && termOverride !== undefined) ||
                    (field.key === 'apr' && aprOverride !== undefined);
                  
                  return (
                    <td
                      key={car.id}
                      className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300"
                    >
                      <div className="flex flex-col">
                        <span className={`text-xs ${isOverridden ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}>
                          {formatValue(value, field.format)}
                          {isOverridden && <span className="text-[10px] ml-1">(override)</span>}
                        </span>
                        {showDifference && (
                          <span className={`text-[10px] mt-0.5 ${
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
      </div>
    </div>
  );
}

