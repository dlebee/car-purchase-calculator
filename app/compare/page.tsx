'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/types';
import carStorage from '@/lib/carStorage';
import { calculateCarMetrics } from '@/lib/carCalculations';
import ComparisonTable from '../components/ComparisonTable';
import Link from 'next/link';

export default function ComparePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarIds, setSelectedCarIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = () => {
    const allCars = carStorage.getAllCars();
    setCars(allCars);
    // Auto-select all cars initially
    if (allCars.length > 0) {
      setSelectedCarIds(new Set(allCars.map((c) => c.id)));
    }
  };

  const handleToggleCar = (carId: string) => {
    setSelectedCarIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(carId)) {
        newSet.delete(carId);
      } else {
        newSet.add(carId);
      }
      return newSet;
    });
  };

  const selectedCars = cars
    .filter((car) => selectedCarIds.has(car.id))
    .sort((a, b) => {
      // Sort by total cost (lowest first) - best priced car on the left
      const metricsA = calculateCarMetrics(a);
      const metricsB = calculateCarMetrics(b);
      return metricsA.totalCost - metricsB.totalCost;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Car Comparison
          </h1>
          <Link
            href="/"
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
          >
            Back to Main
          </Link>
        </div>

        {cars.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
            No cars available. Add some cars on the main page first.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Cars to Compare</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cars.map((car) => (
                  <label
                    key={car.id}
                    className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCarIds.has(car.id)}
                      onChange={() => handleToggleCar(car.id)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {car.year} {car.make} {car.model}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ${car.negotiatedPrice.toLocaleString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Comparison</h2>
              <ComparisonTable cars={selectedCars} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

