'use client';

import { Car } from '@/lib/types';
import { calculateCarMetrics } from '@/lib/carCalculations';

interface CarCardProps {
  car: Car;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

export default function CarCard({
  car,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
}: CarCardProps) {
  const metrics = calculateCarMetrics(car);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 dark:ring-blue-400'
          : ''
      } hover:shadow-xl`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {car.year} {car.make} {car.model}
          </h3>
          {car.tier && <p className="text-sm text-gray-500 dark:text-gray-400">{car.tier}</p>}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Listed Price:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">${car.listedPrice.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Negotiated Price:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">${car.negotiatedPrice.toLocaleString()}</span>
        </div>
        {car.downPayment > 0 && (
          <div>
            <span className="text-gray-600 dark:text-gray-400">Down Payment:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">${car.downPayment.toLocaleString()}</span>
          </div>
        )}
        {car.taxRate > 0 && (
          <div>
            <span className="text-gray-600 dark:text-gray-400">Tax Rate:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {car.taxRate.toFixed(2)}%
            </span>
          </div>
        )}
        {metrics.totalTax > 0 && (
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Tax:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              ${metrics.totalTax.toFixed(2)}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-600 dark:text-gray-400">Monthly Payment:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            ${metrics.monthlyPayment.toFixed(2)}
          </span>
        </div>
        {metrics.totalTax > 0 && (
          <div>
            <span className="text-gray-600 dark:text-gray-400">Monthly w/ Tax:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              ${metrics.monthlyPaymentWithTax.toFixed(2)}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-600 dark:text-gray-400">APR:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{(car.apr * 100).toFixed(2)}%</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Term:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{car.termLength} months</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Payoff Date:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {metrics.payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Total Interest:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            ${metrics.totalInterest.toFixed(2)}
          </span>
        </div>
        {metrics.discount !== 0 && (
          <div className="col-span-2">
            <span className="text-gray-600 dark:text-gray-400">Discount:</span>{' '}
            <span className={`font-semibold ${
              metrics.discount >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              ${Math.abs(metrics.discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              ({metrics.discountPercent >= 0 ? '-' : '+'}{Math.abs(metrics.discountPercent).toFixed(1)}%)
            </span>
            {metrics.discount < 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 italic">(paying more than listed)</span>
            )}
          </div>
        )}
        {car.mileage > 0 && (
          <div>
            <span className="text-gray-600 dark:text-gray-400">Mileage:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{car.mileage.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {car.dealership && (
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Dealership:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{car.dealership}</span>
          </div>
        )}
        {car.vin && (
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">VIN:</span>{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{car.vin}</span>
          </div>
        )}
        {car.notes && (
          <div className="text-sm mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Notes:</span>{' '}
            <span className="text-gray-900 dark:text-white">{car.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

