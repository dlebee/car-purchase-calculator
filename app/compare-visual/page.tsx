'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/types';
import carStorage from '@/lib/carStorage';
import { calculateCarMetrics } from '@/lib/carCalculations';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16'];

export default function CompareVisualPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarIds, setSelectedCarIds] = useState<Set<string>>(new Set());
  const [downPaymentOverride, setDownPaymentOverride] = useState<string>('');
  const [aprOverride, setAprOverride] = useState<string>('');
  const [termOverride, setTermOverride] = useState<string>('');

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

  const selectedCars = cars.filter((car) => selectedCarIds.has(car.id));

  // Overrides (PREVIEW ONLY - does not save or modify car data)
  const downPaymentOverrideValue = downPaymentOverride ? parseFloat(downPaymentOverride) || undefined : undefined;
  const aprOverrideValue = aprOverride ? (parseFloat(aprOverride) / 100) || undefined : undefined; // Convert percentage to decimal
  const termOverrideValue = termOverride ? parseFloat(termOverride) || undefined : undefined;

  // Prepare chart data with overrides applied
  const chartData = selectedCars.map((car) => {
    // Apply overrides if provided (creates new objects, doesn't modify originals)
    const carWithOverride = {
      ...car,
      ...(downPaymentOverrideValue !== undefined && { downPayment: downPaymentOverrideValue }),
      ...(aprOverrideValue !== undefined && { apr: aprOverrideValue }),
      ...(termOverrideValue !== undefined && { termLength: termOverrideValue }),
    };
    const metrics = calculateCarMetrics(carWithOverride);
    return {
      name: `${car.year} ${car.make} ${car.model}`,
      shortName: `${car.year} ${car.make}`,
      fullName: `${car.year} ${car.make} ${car.model}${car.tier ? ` ${car.tier}` : ''}`,
      totalCost: metrics.totalCost,
      monthlyPayment: metrics.monthlyPaymentWithTax,
      totalInterest: metrics.totalInterest,
      financedAmount: metrics.financedAmount,
      discount: metrics.discount,
      negotiatedPrice: car.negotiatedPrice,
      listedPrice: car.listedPrice,
      apr: car.apr * 100,
      termLength: car.termLength,
      downPayment: car.downPayment,
      mileage: car.mileage,
      year: car.year,
      car: car,
      metrics: metrics,
    };
  });

  // Sort by total cost for consistent ordering
  chartData.sort((a, b) => a.totalCost - b.totalCost);

  // Prepare cumulative payment schedule data for all selected cars (with overrides)
  const paymentScheduleData: any[] = [];
  if (selectedCars.length > 0) {
    const maxTerm = termOverrideValue || Math.max(...selectedCars.map(c => c.termLength));
    const today = new Date();
    const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    for (let month = 0; month <= maxTerm; month++) {
      const date = new Date(firstDayNextMonth);
      date.setMonth(date.getMonth() + month);
      const dateLabel = `${date.getFullYear().toString().slice(-2)}/${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const entry: any = { month, dateLabel };
      
      selectedCars.forEach((car, index) => {
        // Apply overrides for payment schedule calculation
        const carWithOverride = {
          ...car,
          ...(downPaymentOverrideValue !== undefined && { downPayment: downPaymentOverrideValue }),
          ...(aprOverrideValue !== undefined && { apr: aprOverrideValue }),
        };
        const metrics = calculateCarMetrics(carWithOverride);
        if (month <= car.termLength) {
          const scheduleEntry = metrics.paymentSchedule[month] || {
            cumulativeInterest: metrics.totalInterest,
            cumulativePrincipal: metrics.financedAmount,
          };
          entry[`Interest-${index}`] = scheduleEntry.cumulativeInterest;
          entry[`Principal-${index}`] = scheduleEntry.cumulativePrincipal;
        }
      });
      
      paymentScheduleData.push(entry);
    }
  }

  if (selectedCars.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Visual Car Comparison
            </h1>
            <Link
              href="/"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
            >
              Back to Main
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
            Select cars to compare visually
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Visual Car Comparison
          </h1>
          <div className="flex gap-3">
            <Link
              href="/compare"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Table View
            </Link>
            <Link
              href="/"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
            >
              Back to Main
            </Link>
          </div>
        </div>

        {/* Overrides Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Comparison Overrides (Preview Only)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Down Payment Override (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={downPaymentOverride}
                  onChange={(e) => setDownPaymentOverride(e.target.value)}
                  placeholder="e.g., 5000"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {downPaymentOverride && (
                  <button
                    onClick={() => setDownPaymentOverride('')}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                APR Override (%) (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aprOverride}
                  onChange={(e) => setAprOverride(e.target.value)}
                  placeholder="e.g., 2.5 for 2.5%"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {aprOverride && (
                  <button
                    onClick={() => setAprOverride('')}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Term Length Override (Optional)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={termOverride}
                  onChange={(e) => setTermOverride(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Use actual terms</option>
                  <option value="36">36 months (3 years)</option>
                  <option value="48">48 months (4 years)</option>
                  <option value="60">60 months (5 years)</option>
                  <option value="72">72 months (6 years)</option>
                </select>
                {termOverride && (
                  <button
                    onClick={() => setTermOverride('')}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          {(downPaymentOverride || aprOverride || termOverride) && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-semibold">
              ⚠️ Preview Mode: All cars will be compared with{' '}
              {downPaymentOverride && `$${parseFloat(downPaymentOverride) || 0} down payment`}
              {(downPaymentOverride && (aprOverride || termOverride)) && ', '}
              {termOverride && `${parseFloat(termOverride) || 0} months term`}
              {(termOverride && aprOverride) && ', '}
              {aprOverride && `${parseFloat(aprOverride) || 0}% APR`}
              {' (this does not modify saved car data)'}
            </p>
          )}
        </div>

        {/* Car Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Select Cars to Compare
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cars.map((car) => {
              const isSelected = selectedCarIds.has(car.id);
              return (
                <label
                  key={car.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleCar(car.id)}
                    className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {car.year} {car.make} {car.model}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ${car.negotiatedPrice.toLocaleString()}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Cost Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Total Cost Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Total Cost ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                />
                <Legend />
                <Bar dataKey="totalCost" fill="#3b82f6" name="Total Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Payment Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Monthly Payment Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Monthly Payment ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                />
                <Legend />
                <Bar dataKey="monthlyPayment" fill="#10b981" name="Monthly Payment" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total Interest Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Total Interest Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Total Interest ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                />
                <Legend />
                <Bar dataKey="totalInterest" fill="#ef4444" name="Total Interest" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* APR Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              APR Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'APR (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(2)}%` : ''}
                />
                <Legend />
                <Bar dataKey="apr" fill="#8b5cf6" name="APR" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Discount Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Discount Comparison (Listed vs Negotiated)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Discount ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                />
                <Legend />
                <Bar dataKey="discount" fill="#f59e0b" name="Discount" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Financed Amount Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Financed Amount Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="shortName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Financed Amount ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                />
                <Legend />
                <Bar dataKey="financedAmount" fill="#06b6d4" name="Financed Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Interest Over Time - Full Width */}
        {selectedCars.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Cumulative Interest Paid Over Time
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={paymentScheduleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dateLabel" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Cumulative Interest ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => `$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Legend />
                {selectedCars.map((car, index) => (
                  <Line
                    key={`interest-${car.id}`}
                    type="monotone"
                    dataKey={`Interest-${index}`}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={`${car.year} ${car.make} ${car.model}`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cumulative Principal Over Time - Full Width */}
        {selectedCars.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Cumulative Principal Paid Over Time
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={paymentScheduleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dateLabel" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  label={{ value: 'Cumulative Principal ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value: number | undefined) => `$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Legend />
                {selectedCars.map((car, index) => (
                  <Line
                    key={`principal-${car.id}`}
                    type="monotone"
                    dataKey={`Principal-${index}`}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={`${car.year} ${car.make} ${car.model}`}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost Breakdown Pie Chart */}
        {selectedCars.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Total Cost Breakdown by Car
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chartData.map((data, index) => {
                const pieData = [
                  { name: 'Down Payment', value: data.downPayment },
                  { name: 'Financed Amount', value: data.financedAmount },
                  { name: 'Total Interest', value: data.totalInterest },
                ].filter(item => item.value > 0);

                return (
                  <div key={index} className="text-center">
                    <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {data.shortName}
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${percent !== undefined ? (percent * 100).toFixed(0) : '0'}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | undefined) => value !== undefined ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

