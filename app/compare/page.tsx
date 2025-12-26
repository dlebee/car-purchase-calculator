'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/types';
import carStorage from '@/lib/carStorage';
import { calculateCarMetrics } from '@/lib/carCalculations';
import ComparisonTable from '../components/ComparisonTable';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ComparePage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarIds, setSelectedCarIds] = useState<Set<string>>(new Set());
  const [downPaymentOverride, setDownPaymentOverride] = useState<string>('');
  const [termOverride, setTermOverride] = useState<string>('');
  const [aprOverride, setAprOverride] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [followUpPrompt, setFollowUpPrompt] = useState<string>('');
  const [isFollowUpAnalyzing, setIsFollowUpAnalyzing] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  // Load selected car IDs from localStorage on mount
  useEffect(() => {
    const savedIds = localStorage.getItem('compareSelectedCarIds');
    if (savedIds) {
      try {
        const idsArray = JSON.parse(savedIds);
        if (Array.isArray(idsArray) && idsArray.length > 0) {
          setSelectedCarIds(new Set(idsArray));
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save selected car IDs to localStorage whenever they change
  useEffect(() => {
    if (selectedCarIds.size > 0) {
      localStorage.setItem('compareSelectedCarIds', JSON.stringify(Array.from(selectedCarIds)));
    } else {
      localStorage.removeItem('compareSelectedCarIds');
    }
  }, [selectedCarIds]);

  const loadCars = () => {
    const allCars = carStorage.getAllCars();
    setCars(allCars);
    // Load saved selection from localStorage, or auto-select all if none saved
    const savedIds = localStorage.getItem('compareSelectedCarIds');
    if (savedIds) {
      try {
        const idsArray = JSON.parse(savedIds);
        if (Array.isArray(idsArray) && idsArray.length > 0) {
          // Only select cars that still exist
          const validIds = idsArray.filter(id => allCars.some(c => c.id === id));
          if (validIds.length > 0) {
            setSelectedCarIds(new Set(validIds));
            return;
          }
        }
      } catch (e) {
        // Invalid JSON, fall through to auto-select all
      }
    }
    // Auto-select all cars if no saved selection or saved selection is invalid
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
    // Clear analysis when selection changes
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleSelectAll = () => {
    setSelectedCarIds(new Set(cars.map(c => c.id)));
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleUnselectAll = () => {
    setSelectedCarIds(new Set());
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleSelectByMake = (make: string) => {
    setSelectedCarIds((prev) => {
      const newSet = new Set(prev);
      const carsFromMake = cars.filter(c => c.make === make);
      const allSelected = carsFromMake.every(car => prev.has(car.id));
      
      if (allSelected) {
        // If all are selected, unselect all from this make
        carsFromMake.forEach(car => newSet.delete(car.id));
      } else {
        // If not all are selected, select all from this make
        carsFromMake.forEach(car => newSet.add(car.id));
      }
      return newSet;
    });
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleDeleteCar = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    const carName = car ? `${car.year} ${car.make} ${car.model}` : 'this car';
    if (confirm(`Are you sure you want to delete ${carName}? This action cannot be undone.`)) {
      // Remove from selected cars
      setSelectedCarIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(carId);
        return newSet;
      });
      // Delete from storage
      carStorage.deleteCar(carId);
      // Reload cars
      loadCars();
      // Clear analysis when car is deleted
      setAnalysis(null);
      setAnalysisError(null);
    }
  };

  const handleAnalyzeComparison = async () => {
    if (selectedCars.length === 0) {
      setAnalysisError('Please select at least one car to analyze');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const overrides = {
        downPayment: downPaymentOverrideValue,
        termLength: termOverrideValue,
        apr: aprOverrideValue,
      };

      const response = await fetch('/api/analyze-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cars: selectedCars,
          overrides: Object.values(overrides).some(v => v !== undefined) ? overrides : null,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze comparison');
      }

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
      }
    } catch (error) {
      setAnalysisError((error as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFollowUpQuestion = async () => {
    if (!analysis || !followUpPrompt.trim()) {
      setAnalysisError('Please enter a follow-up question');
      return;
    }

    setIsFollowUpAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/follow-up-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          previousAnalysis: analysis,
          question: followUpPrompt.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process follow-up question');
      }

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        setFollowUpPrompt(''); // Clear the follow-up input
      }
    } catch (error) {
      setAnalysisError((error as Error).message);
    } finally {
      setIsFollowUpAnalyzing(false);
    }
  };

  // Overrides (PREVIEW ONLY - does not save or modify car data)
  const downPaymentOverrideValue = downPaymentOverride ? parseFloat(downPaymentOverride) || undefined : undefined;
  const termOverrideValue = termOverride ? parseFloat(termOverride) || undefined : undefined;
  const aprOverrideValue = aprOverride ? (parseFloat(aprOverride) / 100) || undefined : undefined; // Convert percentage to decimal
  
  const selectedCars = cars
    .filter((car) => selectedCarIds.has(car.id))
    .sort((a, b) => {
      // Sort by total cost (lowest first) - best priced car on the left
      // Use overrides if provided (creates new objects, doesn't modify originals)
      const carA = {
        ...a,
        ...(downPaymentOverrideValue !== undefined && { downPayment: downPaymentOverrideValue }),
        ...(termOverrideValue !== undefined && { termLength: termOverrideValue }),
        ...(aprOverrideValue !== undefined && { apr: aprOverrideValue }),
      };
      const carB = {
        ...b,
        ...(downPaymentOverrideValue !== undefined && { downPayment: downPaymentOverrideValue }),
        ...(termOverrideValue !== undefined && { termLength: termOverrideValue }),
        ...(aprOverrideValue !== undefined && { apr: aprOverrideValue }),
      };
      const metricsA = calculateCarMetrics(carA);
      const metricsB = calculateCarMetrics(carB);
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Cars to Compare</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleUnselectAll}
                    className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                  >
                    Unselect All
                  </button>
                </div>
              </div>
              
              {/* Group cars by make */}
              {Array.from(new Set(cars.map(c => c.make))).sort().map((make) => {
                const carsFromMake = cars.filter(c => c.make === make);
                return (
                  <div key={make} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 
                        onClick={() => handleSelectByMake(make)}
                        className="text-lg font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        title={`Click to select all ${make} cars`}
                      >
                        {make} ({carsFromMake.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
                      {carsFromMake.map((car) => (
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
                              {car.year} {car.make} {car.model}{car.tier && car.tier.trim() !== '' ? ` ${car.tier}` : ''}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              ${car.negotiatedPrice.toLocaleString()}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                Comparison Overrides (Preview Only)
              </h3>
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    Term Length Override (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={termOverride}
                      onChange={(e) => setTermOverride(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    APR Override (%) (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aprOverride}
                      onChange={(e) => setAprOverride(e.target.value)}
                      placeholder="e.g., 2.5"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              </div>
              {(downPaymentOverride || termOverride || aprOverride) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 font-semibold">
                  ⚠️ Preview Mode: {downPaymentOverride && `Down payment: $${parseFloat(downPaymentOverride) || 0}`}
                  {downPaymentOverride && (termOverride || aprOverride) && ' | '}
                  {termOverride && `Term: ${termOverride} months`}
                  {termOverride && aprOverride && ' | '}
                  {aprOverride && `APR: ${parseFloat(aprOverride) || 0}%`}
                  {' (this does not modify saved car data)'}
                </p>
              )}
            </div>

            <div className="mt-8">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Comparison</h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Custom Analysis Prompt (Optional)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., Focus on reliability and long-term maintenance costs, or compare resale values..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y min-h-[80px]"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Add specific questions or focus areas for the AI analysis. Leave empty for standard analysis.
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAnalyzeComparison}
                    disabled={isAnalyzing || selectedCars.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Analysis
                      </>
                    )}
                  </button>
                </div>
              </div>
              <ComparisonTable 
                cars={selectedCars} 
                downPaymentOverride={downPaymentOverrideValue}
                termOverride={termOverrideValue}
                aprOverride={aprOverrideValue}
                onDeleteCar={handleDeleteCar}
              />
              
              {analysis && (
                <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Comparison Analysis
                    </h3>
                    <button
                      onClick={() => {
                        setAnalysis(null);
                        setAnalysisError(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-indigo-900 dark:prose-headings:text-indigo-300 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-table:text-gray-700 dark:prose-table:text-gray-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                        code: ({node, ...props}) => <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-400 pl-4 italic my-4" {...props} />,
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-gray-700" {...props} />,
                        tbody: ({node, ...props}) => <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-700" {...props} />,
                        th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300" {...props} />,
                      }}
                    >
                      {analysis}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Follow-up question section */}
                  <div className="mt-6 pt-6 border-t border-indigo-200 dark:border-indigo-800">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Ask a follow-up question about this analysis
                    </label>
                    <div className="flex gap-2">
                      <textarea
                        value={followUpPrompt}
                        onChange={(e) => setFollowUpPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleFollowUpQuestion();
                          }
                        }}
                        placeholder="e.g., Can you elaborate on the warranty concerns? Or, What about resale value?"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y min-h-[60px]"
                        rows={2}
                      />
                      <button
                        onClick={handleFollowUpQuestion}
                        disabled={isFollowUpAnalyzing || !followUpPrompt.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 self-end"
                      >
                        {isFollowUpAnalyzing ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            Ask
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Ask questions about the analysis above. Press Cmd/Ctrl+Enter to submit.
                    </p>
                  </div>
                </div>
              )}
              
              {analysisError && (
                <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                        Analysis Error
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {analysisError}
                      </p>
                    </div>
                    <button
                      onClick={() => setAnalysisError(null)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

