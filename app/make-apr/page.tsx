'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import makeAprStorage, { MakeAprRate } from '@/lib/makeAprStorage';

const COMMON_TERM_LENGTHS = [36, 48, 60, 72, 84];

export default function MakeAprPage() {
  const [rates, setRates] = useState<MakeAprRate[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [editingRate, setEditingRate] = useState<MakeAprRate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    termLength: 60,
    apr: '',
  });

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = () => {
    const allRates = makeAprStorage.getAllRates();
    const allMakes = makeAprStorage.getAllMakes();
    setRates(allRates);
    setMakes(allMakes);
  };

  const handleAdd = () => {
    setFormData({ make: '', termLength: 60, apr: '' });
    setEditingRate(null);
    setShowAddForm(true);
  };

  const handleEdit = (rate: MakeAprRate) => {
    setFormData({
      make: rate.make,
      termLength: rate.termLength,
      apr: (rate.apr * 100).toFixed(2),
    });
    setEditingRate(rate);
    setShowAddForm(true);
  };

  const handleSave = () => {
    const aprValue = parseFloat(formData.apr);
    if (!formData.make.trim() || isNaN(aprValue) || aprValue < 0 || aprValue > 100) {
      alert('Please enter a valid make and APR (0-100%)');
      return;
    }

    makeAprStorage.saveRate({
      make: formData.make.trim(),
      termLength: formData.termLength,
      apr: aprValue / 100, // Convert percentage to decimal
    });

    loadRates();
    setShowAddForm(false);
    setEditingRate(null);
    setFormData({ make: '', termLength: 60, apr: '' });
  };

  const handleDelete = (make: string, termLength: number) => {
    if (confirm(`Delete APR rate for ${make} at ${termLength} months?`)) {
      makeAprStorage.deleteRate(make, termLength);
      loadRates();
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingRate(null);
    setFormData({ make: '', termLength: 60, apr: '' });
  };

  const filteredRates = selectedMake
    ? rates.filter((r) => r.make.toLowerCase() === selectedMake.toLowerCase())
    : rates;

  const groupedByMake = filteredRates.reduce((acc, rate) => {
    if (!acc[rate.make]) {
      acc[rate.make] = [];
    }
    acc[rate.make].push(rate);
    return acc;
  }, {} as Record<string, MakeAprRate[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Make-Specific APR Rates
            </h1>
            <div className="flex flex-wrap gap-2 items-center md:w-3/4 md:justify-end">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-all shadow-sm hover:shadow-md text-sm whitespace-nowrap self-start md:self-auto"
              >
                Back to Main
              </Link>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Set APR rates per make and term length. These rates will be used when adding cars from listings instead of the default APR.
          </p>
        </div>

        {/* Filter by Make */}
        {makes.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Make:
            </label>
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Makes</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingRate ? 'Edit APR Rate' : 'Add APR Rate'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Ford, Toyota"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Term Length (months)
                </label>
                <select
                  value={formData.termLength}
                  onChange={(e) => setFormData({ ...formData, termLength: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {COMMON_TERM_LENGTHS.map((term) => (
                    <option key={term} value={term}>
                      {term} months
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  APR (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.apr}
                  onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
                  placeholder="e.g., 4.50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rates List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              APR Rates {selectedMake && `for ${selectedMake}`}
            </h2>
            {!showAddForm && (
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                + Add Rate
              </button>
            )}
          </div>

          {Object.keys(groupedByMake).length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No APR rates configured yet.</p>
              <p className="text-sm mt-2">Click "Add Rate" to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByMake)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([make, makeRates]) => (
                  <div key={make} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {make}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {makeRates
                        .sort((a, b) => a.termLength - b.termLength)
                        .map((rate) => (
                          <div
                            key={`${rate.make}-${rate.termLength}`}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {rate.termLength} months
                              </div>
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {(rate.apr * 100).toFixed(2)}%
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(rate)}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(rate.make, rate.termLength)}
                                className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

