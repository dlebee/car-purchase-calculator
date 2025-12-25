'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/types';
import carStorage from '@/lib/carStorage';

interface CarFormProps {
  car?: Car;
  onSave: () => void;
  onCancel: () => void;
}

export default function CarForm({ car, onSave, onCancel }: CarFormProps) {
  const [formData, setFormData] = useState<Partial<Car>>({
    make: '',
    model: '',
    tier: '',
    dealership: '',
    vin: '',
    listedPrice: 0,
    negotiatedPrice: 0,
    apr: 0,
    termLength: 0,
    notes: '',
    taxRate: 0,
    tax: 0,
    creditScore: 0,
    mileage: 0,
    year: new Date().getFullYear(),
    downPayment: 0,
  });

  useEffect(() => {
    if (car) {
      setFormData(car);
    }
  }, [car]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => {
      // Text fields
      if (name === 'make' || name === 'model' || name === 'tier' || name === 'dealership' || name === 'vin' || name === 'notes') {
        return { ...prev, [name]: value };
      }
      // Checkbox fields
      if (type === 'checkbox') {
        return { ...prev, [name]: (e.target as HTMLInputElement).checked };
      }
      // Number fields - allow empty string, parse to number
      const numValue = value === '' ? 0 : parseFloat(value) || 0;
      
      // APR needs special handling (convert percentage to decimal)
      if (name === 'apr') {
        return { ...prev, [name]: numValue / 100 };
      }
      // Tax rate - calculate tax amount from negotiated price
      if (name === 'taxRate') {
        const negotiatedPrice = prev.negotiatedPrice || 0;
        const taxAmount = (negotiatedPrice * numValue) / 100;
        return { ...prev, taxRate: numValue, tax: taxAmount };
      }
      // When negotiated price changes, recalculate tax if tax rate is set
      if (name === 'negotiatedPrice') {
        const taxRate = prev.taxRate || 0;
        const taxAmount = (numValue * taxRate) / 100;
        return { ...prev, negotiatedPrice: numValue, tax: taxAmount };
      }
      // All other numeric fields
      return { ...prev, [name]: numValue };
    });
  };

  const formatNumberValue = (value: number | undefined): string => {
    if (value === undefined || value === 0) return '';
    return value.toString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure tax is calculated from tax rate and negotiated price
    const negotiatedPrice = formData.negotiatedPrice || 0;
    const taxRate = formData.taxRate || 0;
    const calculatedTax = (negotiatedPrice * taxRate) / 100;
    
    const carToSave: Car = {
      id: car?.id || '',
      ...formData,
      tax: calculatedTax,
      taxRate: taxRate,
    } as Car;
    carStorage.saveCar(carToSave);
    onSave();
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            const importedCar = carStorage.importCar(json);
            setFormData(importedCar);
          } catch (error) {
            alert('Error importing car: ' + (error as Error).message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportJSON = () => {
    if (!car?.id) {
      alert('Please save the car first before exporting');
      return;
    }
    try {
      const json = carStorage.exportCar(car.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `car-${car.make}-${car.model}-${car.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting car: ' + (error as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            {car ? 'Edit Car' : 'Add New Car'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tier</label>
                <input
                  type="text"
                  name="tier"
                  value={formData.tier}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Dealership
                </label>
                <input
                  type="text"
                  name="dealership"
                  value={formData.dealership}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  VIN
                </label>
                <input
                  type="text"
                  name="vin"
                  value={formData.vin || ''}
                  onChange={handleChange}
                  maxLength={17}
                  placeholder="17-character VIN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Listed Price
                </label>
                <input
                  type="text"
                  name="listedPrice"
                  value={formatNumberValue(formData.listedPrice)}
                  onChange={handleChange}
                  required
                  placeholder="Listed/advertised price"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter listed/advertised price (MSRP for new cars, market price for used)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Negotiated Price
                </label>
                <input
                  type="text"
                  name="negotiatedPrice"
                  value={formatNumberValue(formData.negotiatedPrice)}
                  onChange={handleChange}
                  required
                  placeholder="What you're actually paying"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The price you negotiated or are paying
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  APR (%)
                </label>
                <input
                  type="text"
                  name="apr"
                  value={formatNumberValue((formData.apr || 0) * 100)}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 2.5 for 2.5%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Term Length (months)
                </label>
                <input
                  type="text"
                  name="termLength"
                  value={formatNumberValue(formData.termLength)}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 48"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Tax Rate (%)
                </label>
                <input
                  type="text"
                  name="taxRate"
                  value={formatNumberValue(formData.taxRate)}
                  onChange={handleChange}
                  placeholder="e.g., 7.5 for 7.5%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {formData.taxRate && formData.taxRate > 0 && formData.negotiatedPrice && formData.negotiatedPrice > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Tax amount: ${((formData.negotiatedPrice * formData.taxRate) / 100).toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Credit Score (FICO Auto Score 8)
                </label>
                <input
                  type="text"
                  name="creditScore"
                  value={formatNumberValue(formData.creditScore)}
                  onChange={handleChange}
                  placeholder="e.g., 750"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Mileage</label>
                <input
                  type="text"
                  name="mileage"
                  value={formatNumberValue(formData.mileage)}
                  onChange={handleChange}
                  placeholder="e.g., 25000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formatNumberValue(formData.year)}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Down Payment
                </label>
                <input
                  type="text"
                  name="downPayment"
                  value={formatNumberValue(formData.downPayment)}
                  onChange={handleChange}
                  placeholder="e.g., 5000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportJSON}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
              >
                Import JSON
              </button>
              {car?.id && (
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  Export JSON
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

