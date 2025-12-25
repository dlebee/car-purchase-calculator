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

interface CarChartProps {
  car: Car | null;
}

export default function CarChart({ car }: CarChartProps) {
  if (!car) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
        Select a car to view payment breakdown
      </div>
    );
  }

  const metrics = calculateCarMetrics(car);
  
  // Calculate start date (first day of next month)
  const today = new Date();
  const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  
  // Generate comparison terms (e.g., if selected is 48, show 36, 48, 60, 72)
  const selectedTerm = car.termLength;
  const availableTerms = [36, 48, 60, 72];
  const comparisonTerms = availableTerms.filter(term => term !== selectedTerm).slice(0, 3);
  const allTerms = [selectedTerm, ...comparisonTerms].sort((a, b) => a - b);
  
  // Calculate metrics for all terms (including selected)
  const allMetrics = allTerms.map(term => {
    const carWithTerm = { ...car, termLength: term };
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
  const payoffTime = car.termLength;
  const payoffTimeYears = (payoffTime / 12).toFixed(1);
  const payoffDateStr = metrics.payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Payment Breakdown: {car.year} {car.make} {car.model}
      </h3>
      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payoff Time</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
              {payoffTime} months
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              ({payoffTimeYears} years)
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
              Paid off by: <span className="font-semibold">{payoffDateStr}</span>
            </div>
          </div>
          {metrics.discount !== 0 && (
            <div className={`p-4 rounded-lg border ${
              metrics.discount >= 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Discount (Listed vs Negotiated)
              </div>
              <div className="flex items-baseline gap-2">
                <div className={`text-xl font-bold ${
                  metrics.discount >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  ${Math.abs(metrics.discount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ({metrics.discountPercent >= 0 ? '-' : '+'}{Math.abs(metrics.discountPercent).toFixed(1)}%)
                </div>
              </div>
              {metrics.discount < 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  Paying more than listed price
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cost Breakdown</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Negotiated Price:</span>
              <span className="font-semibold text-gray-900 dark:text-white">${car.negotiatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {car.downPayment > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">- Down Payment:</span>
                <span className="font-semibold text-gray-900 dark:text-white">${car.downPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
              Additional Costs Breakdown
            </div>
            <div className="space-y-2 text-sm">
              {metrics.totalAllFees > 0 && (
                <>
                  {car.dealerFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Dealer Fees (Doc, Prep, etc.):
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.dealerFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {car.registrationFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Registration Fees:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.registrationFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {car.titleFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Title Fees:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${car.titleFees.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {car.otherFees > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Other Fees:
                      </span>
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
                if (!termMetrics) return null;
                
                return (
                  <div
                    key={term}
                    className={`p-3 rounded-lg border ${
                      isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-800/40 border-indigo-300 dark:border-indigo-600'
                        : 'bg-white dark:bg-gray-700 border-indigo-200 dark:border-indigo-700'
                    }`}
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {term} months {isSelected && <span className="font-semibold">(Selected)</span>}
                    </div>
                    <div className={`text-lg font-bold ${
                      isSelected
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      ${termMetrics.totalInterest.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ${termMetrics.monthlyPayment.toFixed(2)}/mo
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Monthly Payment</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span className="font-semibold text-gray-900 dark:text-white text-lg">${metrics.monthlyPayment.toFixed(2)}</span>
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
          {car.downPayment > 0 && (
            <div className="italic">
              • Down payment (${car.downPayment.toLocaleString()}) is <span className="font-semibold">not included</span> in monthly payments
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
      <div className="space-y-6">
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

