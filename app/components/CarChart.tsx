'use client';

import { Car } from '@/lib/types';
import { calculateCarMetrics } from '@/lib/carCalculations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Florida fee ranges for validation
const FLORIDA_FEE_RANGES = {
  dealerFees: { min: 600, max: 999, typical: 950 },
  registrationFees: { min: 14.50, max: 257.50, typical: 225 },
  titleFees: { min: 75.75, max: 85.75, typical: 75.75 },
  otherFees: { min: 0, max: 100, typical: 28 },
};

interface CarChartProps {
  car: Car | null;
  downPaymentOverride?: number;
  aprOverride?: number;
  termOverride?: number;
  aprOverrideString?: string; // Raw string value for display/editing
  onDownPaymentOverrideChange?: (value: string) => void;
  onAprOverrideChange?: (value: string) => void;
  onTermOverrideChange?: (value: string) => void;
}

export default function CarChart({ 
  car, 
  downPaymentOverride, 
  aprOverride, 
  termOverride,
  aprOverrideString,
  onDownPaymentOverrideChange,
  onAprOverrideChange,
  onTermOverrideChange
}: CarChartProps) {
  if (!car) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
        Select a car to view payment breakdown
      </div>
    );
  }

  // Apply overrides if provided (PREVIEW ONLY - does not modify saved car data)
  const carWithOverride = {
    ...car,
    ...(downPaymentOverride !== undefined && { downPayment: downPaymentOverride }),
    ...(aprOverride !== undefined && { apr: aprOverride }),
    ...(termOverride !== undefined && { termLength: termOverride }),
  };

  const hasOverrides = downPaymentOverride !== undefined || aprOverride !== undefined || termOverride !== undefined;

  const metrics = calculateCarMetrics(carWithOverride);
  
  // Calculate start date (first day of next month)
  const today = new Date();
  const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  // Generate comparison terms (e.g., if selected is 48, show 36, 48, 60, 72)
  const selectedTerm = carWithOverride.termLength;
  const availableTerms = [36, 48, 60, 72];
  const comparisonTerms = availableTerms.filter(term => term !== selectedTerm).slice(0, 3);
  const allTerms = [selectedTerm, ...comparisonTerms].sort((a, b) => a - b);
  
  // Calculate metrics for all terms (including selected) - use overrides for base values
  const allMetrics = allTerms.map(term => {
    const carWithTerm = { ...carWithOverride, termLength: term };
    return {
      term,
      metrics: calculateCarMetrics(carWithTerm),
    };
  });
  
  // Get max term length for chart range
  const maxTerm = Math.max(...allTerms);
  
  // Create chart data with all terms
  const chartData: any[] = [];
  
  // Create data points for each month up to max term
  for (let month = 1; month <= maxTerm; month++) {
    const paymentDate = new Date(firstDayNextMonth);
    paymentDate.setMonth(paymentDate.getMonth() + month - 1);
    const dateLabel = `${paymentDate.getFullYear().toString().slice(-2)}/${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
    
    const dataPoint: any = {
      month,
      dateLabel,
    };
    
    // Add data for each term (only if that term has reached this month)
    allMetrics.forEach(({ term, metrics: termMetrics }) => {
      if (month <= term) {
        const entry = termMetrics.paymentSchedule[month - 1];
        if (entry) {
          dataPoint[`Interest (${term}m)`] = entry.cumulativeInterest;
          dataPoint[`Principal (${term}m)`] = entry.cumulativePrincipal;
        }
      }
    });
    
    chartData.push(dataPoint);
  }

  const totalCost = metrics.totalCost;
  const payoffTime = carWithOverride.termLength;
  const payoffTimeYears = (payoffTime / 12).toFixed(1);
  const payoffDateStr = metrics.payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Check for fees outside Florida expected ranges
  const feeWarnings: Array<{ name: string; value: number; range: string; typical: number }> = [];
  if (car.dealerFees > FLORIDA_FEE_RANGES.dealerFees.max) {
    feeWarnings.push({
      name: 'Dealer Fees',
      value: car.dealerFees,
      range: `$${FLORIDA_FEE_RANGES.dealerFees.min}-${FLORIDA_FEE_RANGES.dealerFees.max}`,
      typical: FLORIDA_FEE_RANGES.dealerFees.typical,
    });
  }
  if (car.registrationFees > FLORIDA_FEE_RANGES.registrationFees.max) {
    feeWarnings.push({
      name: 'Registration Fees',
      value: car.registrationFees,
      range: `$${FLORIDA_FEE_RANGES.registrationFees.min}-${FLORIDA_FEE_RANGES.registrationFees.max}`,
      typical: FLORIDA_FEE_RANGES.registrationFees.typical,
    });
  }
  if (car.titleFees > FLORIDA_FEE_RANGES.titleFees.max) {
    feeWarnings.push({
      name: 'Title Fees',
      value: car.titleFees,
      range: `$${FLORIDA_FEE_RANGES.titleFees.min}-${FLORIDA_FEE_RANGES.titleFees.max}`,
      typical: FLORIDA_FEE_RANGES.titleFees.typical,
    });
  }
  if (car.otherFees > FLORIDA_FEE_RANGES.otherFees.max) {
    feeWarnings.push({
      name: 'Other Fees',
      value: car.otherFees,
      range: `$${FLORIDA_FEE_RANGES.otherFees.min}-${FLORIDA_FEE_RANGES.otherFees.max}`,
      typical: FLORIDA_FEE_RANGES.otherFees.typical,
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Payment Breakdown: {car.year} {car.make} {car.model}
      </h3>
      {feeWarnings.length > 0 && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">
                ⚠️ Fees Exceed Florida Expected Ranges
              </h4>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <ul className="list-disc list-inside space-y-1">
                  {feeWarnings.map((warning, index) => (
                    <li key={index}>
                      <strong>{warning.name}:</strong> ${warning.value.toFixed(2)} exceeds expected range ({warning.range}). Typical: ${warning.typical.toFixed(2)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs italic">
                  Consider negotiating these fees or comparing with other dealers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {hasOverrides && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                ⚠️ Preview Mode: Overrides Active
              </h4>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                <ul className="list-disc list-inside space-y-1">
                  {downPaymentOverride !== undefined && (
                    <li>
                      <strong>Down Payment:</strong> ${downPaymentOverride.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (original: ${car.downPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </li>
                  )}
                  {aprOverride !== undefined && (
                    <li>
                      <strong>APR:</strong> {(aprOverride * 100).toFixed(2)}% (original: {(car.apr * 100).toFixed(2)}%)
                    </li>
                  )}
                  {termOverride !== undefined && (
                    <li>
                      <strong>Term Length:</strong> {termOverride} months (original: {car.termLength} months)
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-xs italic">
                  All calculations below reflect these override values. This does not modify saved car data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 rounded-lg">
            <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-0.5">Payoff Time</div>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
              {payoffTime} months
            </div>
            <div className="text-[9px] text-gray-600 dark:text-gray-400 mt-0.5">
              ({payoffTimeYears} years)
            </div>
            <div className="text-[9px] text-gray-600 dark:text-gray-400 mt-1 pt-1 border-t border-blue-200 dark:border-blue-700">
              Paid off by: <span className="font-semibold">{payoffDateStr}</span>
            </div>
          </div>
          {metrics.discount !== 0 && (
            <div className={`p-2 rounded-lg border ${
              metrics.discount >= 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-0.5">
                Discount (Listed vs Negotiated)
              </div>
              <div className="flex items-baseline gap-1">
                <div className={`text-xs font-bold ${
                  metrics.discount >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  ${Math.abs(metrics.discount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[9px] text-gray-600 dark:text-gray-400">
                  ({metrics.discountPercent >= 0 ? '-' : '+'}{Math.abs(metrics.discountPercent).toFixed(1)}%)
                </div>
              </div>
              {metrics.discount < 0 && (
                <div className="text-[9px] text-gray-600 dark:text-gray-400 mt-1 italic">
                  Paying more than listed price
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
          {/* Override Controls - positioned right above cost breakdown */}
          <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Down Payment
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={downPaymentOverride !== undefined ? downPaymentOverride.toString() : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        onDownPaymentOverrideChange?.('');
                      } else {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) {
                          onDownPaymentOverrideChange?.(val);
                        }
                      }
                    }}
                    placeholder={`$${car.downPayment.toLocaleString()}`}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {downPaymentOverride !== undefined && (
                    <button
                      onClick={() => onDownPaymentOverrideChange?.('')}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  APR (%)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={aprOverrideString !== undefined ? aprOverrideString : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty, numbers, and decimal points (including partial decimals like "2." or ".5")
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        onAprOverrideChange?.(val);
                      }
                    }}
                    placeholder={`${(car.apr * 100).toFixed(2)}%`}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {aprOverride !== undefined && (
                    <button
                      onClick={() => onAprOverrideChange?.('')}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                  Term Length
                </label>
                <div className="flex items-center gap-1">
                  <select
                    value={termOverride !== undefined ? termOverride.toString() : ''}
                    onChange={(e) => onTermOverrideChange?.(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">{car.termLength}m</option>
                    <option value="36">36m</option>
                    <option value="48">48m</option>
                    <option value="60">60m</option>
                    <option value="72">72m</option>
                  </select>
                  {termOverride !== undefined && (
                    <button
                      onClick={() => onTermOverrideChange?.('')}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cost Breakdown</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Negotiated Price:</span>
              <span className="font-semibold text-gray-900 dark:text-white">${car.negotiatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {carWithOverride.downPayment > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">- Down Payment:</span>
                <span className="font-semibold text-gray-900 dark:text-white">${carWithOverride.downPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-1">
              <span className="text-gray-600 dark:text-gray-400">Adjusted Cost:</span>
              <span className="font-semibold text-gray-900 dark:text-white">${metrics.adjustedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {metrics.totalTax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">+ Tax ({car.taxRate.toFixed(2)}%):</span>
                <span className="font-semibold text-gray-900 dark:text-white">${metrics.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-1 font-semibold">
              <span className="text-gray-700 dark:text-gray-300">Financed Amount:</span>
              <span className="text-blue-600 dark:text-blue-400">${metrics.financedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">+ Total Interest:</span>
              <span className="font-semibold text-gray-900 dark:text-white">${metrics.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {metrics.totalAllFees > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">+ Total Fees:</span>
                <span className="font-semibold text-gray-900 dark:text-white">${metrics.totalAllFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-gray-400 dark:border-gray-500 pt-2 font-bold">
              <span className="text-gray-900 dark:text-white">Total Cost:</span>
              <span className="text-gray-900 dark:text-white">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        {(metrics.dealerFinancingMarkupCost > 0 || metrics.totalAllFees > 0) && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 rounded-lg">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
              Additional Costs Breakdown
            </div>
            <div className="space-y-1 text-xs">
              {metrics.totalAllFees > 0 && (
                <>
                  {car.dealerFees > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Dealer Fees (Doc, Prep, etc.):
                        </span>
                        <span className="ml-2 text-[9px] text-green-600 dark:text-green-400 font-semibold">
                          ✓ Negotiable
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.dealerFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {car.registrationFees > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Registration Fees:
                        </span>
                        <span className="ml-2 text-[9px] text-orange-600 dark:text-orange-400">
                          ⚠ Usually mandatory
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.registrationFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {car.titleFees > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Title Fees:
                        </span>
                        <span className="ml-2 text-[9px] text-orange-600 dark:text-orange-400">
                          ⚠ Usually mandatory
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.titleFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {car.otherFees > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Other Fees:
                        </span>
                        <span className="ml-2 text-[9px] text-gray-500 dark:text-gray-400">
                          Depends on type
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.otherFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-amber-300 dark:border-amber-700 pt-2">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">
                      Total Fees:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${metrics.totalAllFees.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {car.dealerFees > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <strong>Fee Negotiation Tip:</strong> Dealer fees (doc/prep) are often negotiable. 
                        Ask to have them waived or reduced, especially if you're paying cash or have your own financing.
                      </p>
                    </div>
                  )}
                </>
              )}
              {metrics.dealerFinancingMarkupCost > 0 && (
                <>
                  <div className="flex justify-between border-t border-amber-300 dark:border-amber-700 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      Financing Markup (vs. Your Rate):
                    </span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      +{(metrics.dealerFinancingMarkup * 100).toFixed(2)}% APR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Extra Interest (vs. Your Rate):
                    </span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      ${metrics.dealerFinancingMarkupCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Dealer APR: {(car.apr * 100).toFixed(2)}% vs. Your Rate: {((car.buyRateApr || 0) * 100).toFixed(2)}%
                  </p>
                </>
              )}
            </div>
          </div>
        )}
        {allTerms.length > 1 && (
          <div className="p-4 rounded-lg border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Total Interest by Term Length
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {allTerms.map((term) => {
                const termMetrics = allMetrics.find(m => m.term === term)?.metrics;
                const isSelected = term === selectedTerm;
                const isOverrideActive = termOverride !== undefined && term === termOverride;
                if (!termMetrics) return null;
                
                return (
                  <div
                    key={term}
                    onClick={() => {
                      // Toggle override: if clicking the same term, clear override; otherwise set it
                      if (isOverrideActive) {
                        onTermOverrideChange?.('');
                      } else {
                        onTermOverrideChange?.(term.toString());
                      }
                    }}
                    className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isOverrideActive
                        ? 'bg-blue-100 dark:bg-blue-800/40 border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600'
                        : isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-800/40 border-indigo-300 dark:border-indigo-600'
                        : 'bg-white dark:bg-gray-700 border-indigo-200 dark:border-indigo-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-0.5">
                      {term} months {isOverrideActive && <span className="font-semibold text-blue-600 dark:text-blue-400">(Override)</span>}
                      {!isOverrideActive && isSelected && <span className="font-semibold">(Selected)</span>}
                    </div>
                    <div className={`text-sm font-bold ${
                      isOverrideActive
                        ? 'text-blue-700 dark:text-blue-300'
                        : isSelected
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      ${termMetrics.totalInterest.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      ${termMetrics.monthlyPayment.toFixed(2)}/mo
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Monthly Payment</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">${metrics.monthlyPayment.toFixed(2)}</span>
          {' per month'}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div className="italic">
            • This payment covers: <span className="font-semibold">Financed Amount (${metrics.financedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) + Interest</span>
          </div>
          {metrics.totalTax > 0 ? (
            <div className="italic">
              • Tax ({car.taxRate.toFixed(2)}%) is <span className="font-semibold">included</span> in the financed amount and amortized over the loan term
            </div>
          ) : (
            <div className="italic">
              • No tax included
            </div>
          )}
          {carWithOverride.downPayment > 0 && (
            <div className="italic">
              • Down payment (${carWithOverride.downPayment.toLocaleString()}) is <span className="font-semibold">not included</span> in monthly payments
            </div>
          )}
        </div>
        {allTerms.length > 1 && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
            Monthly payments by term: {allTerms.map((term, index) => {
              const termMetrics = allMetrics.find(m => m.term === term)?.metrics;
              if (!termMetrics) return null;
              const monthlyPayment = termMetrics.monthlyPayment;
              const isSelected = term === selectedTerm;
              return (
                <span key={term}>
                  {index > 0 && ' | '}
                  <span className={isSelected ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}>
                    {term}m: ${monthlyPayment.toFixed(2)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Cumulative Interest Paid</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="dateLabel"
                label={{ value: 'Date (YY/MM)', position: 'insideBottom', offset: -5 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  `$${(value ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              {allTerms.map((term, index) => {
                const strokeColors = ['#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
                const strokeWidth = term === selectedTerm ? 3 : 2;
                const strokeDasharray = term === selectedTerm ? '0' : '5 5';
                return (
                  <Line
                    key={`interest-${term}`}
                    type="monotone"
                    dataKey={`Interest (${term}m)`}
                    stroke={strokeColors[index % strokeColors.length]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    dot={false}
                    name={`${term} months`}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Cumulative Principal Paid</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="dateLabel"
                label={{ value: 'Date (YY/MM)', position: 'insideBottom', offset: -5 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  `$${(value ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              {allTerms.map((term, index) => {
                const strokeColors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6'];
                const strokeWidth = term === selectedTerm ? 3 : 2;
                const strokeDasharray = term === selectedTerm ? '0' : '5 5';
                return (
                  <Line
                    key={`principal-${term}`}
                    type="monotone"
                    dataKey={`Principal (${term}m)`}
                    stroke={strokeColors[index % strokeColors.length]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    dot={false}
                    name={`${term} months`}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

