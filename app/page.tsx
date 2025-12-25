'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/types';
import carStorage from '@/lib/carStorage';
import CarCard from './components/CarCard';
import CarForm from './components/CarForm';
import CarChart from './components/CarChart';
import Link from 'next/link';

export default function Home() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [editingCar, setEditingCar] = useState<Car | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [downPaymentOverride, setDownPaymentOverride] = useState<string>('');
  const [aprOverride, setAprOverride] = useState<string>('');
  const [termOverride, setTermOverride] = useState<string>('');

  useEffect(() => {
    loadCars();
    
    // Check if there's a listing to add from the listings page
    const listingData = sessionStorage.getItem('listingToAdd');
    if (listingData) {
      try {
        const listing = JSON.parse(listingData);
        // Create a partial car object from the listing
        const partialCar: Partial<Car> = {
          vin: listing.vin,
          make: listing.make,
          model: listing.model,
          year: listing.year,
          tier: listing.tier || '',
          mileage: listing.mileage || 0,
          dealership: listing.dealership || '',
          listedPrice: listing.listedPrice || 0,
          // Set defaults for required fields
          id: '',
          negotiatedPrice: listing.listedPrice || 0,
          apr: 0,
          buyRateApr: 0,
          termLength: 0,
          notes: '',
          taxRate: 0,
          tax: 0,
          creditScore: 0,
          downPayment: 0,
          dealerFees: 0,
          registrationFees: 0,
          titleFees: 0,
          otherFees: 0,
        };
        
        setEditingCar(partialCar as Car);
        setShowForm(true);
        sessionStorage.removeItem('listingToAdd');
      } catch (error) {
        console.error('Error parsing listing data:', error);
        sessionStorage.removeItem('listingToAdd');
      }
    }
  }, []);

  // Refresh selected car when cars array updates (e.g., after editing)
  useEffect(() => {
    if (selectedCar) {
      const updatedCar = cars.find((c) => c.id === selectedCar.id);
      if (updatedCar && updatedCar !== selectedCar) {
        setSelectedCar(updatedCar);
      }
    }
  }, [cars, selectedCar]);

  // Persist selected car ID to localStorage
  useEffect(() => {
    if (selectedCar) {
      localStorage.setItem('selectedCarId', selectedCar.id);
    }
  }, [selectedCar?.id]);

  const loadCars = () => {
    const allCars = carStorage.getAllCars();
    setCars(allCars);
    
    // Try to restore previously selected car from localStorage
    const savedCarId = localStorage.getItem('selectedCarId');
    if (savedCarId && allCars.length > 0) {
      const savedCar = allCars.find((c) => c.id === savedCarId);
      if (savedCar) {
        setSelectedCar(savedCar);
        return;
      }
    }
    
    // Fallback to first car if no saved selection or saved car not found
    if (allCars.length > 0 && !selectedCar) {
      setSelectedCar(allCars[0]);
    }
  };

  const handleAddCar = () => {
    setEditingCar(undefined);
    setShowForm(true);
  };

  const handleEditCar = (car: Car) => {
    setEditingCar(car);
    setShowForm(true);
  };

  const handleDeleteCar = (carId: string) => {
    if (confirm('Are you sure you want to delete this car?')) {
      carStorage.deleteCar(carId);
      loadCars();
      if (selectedCar?.id === carId) {
        const remainingCars = cars.filter((c) => c.id !== carId);
        setSelectedCar(remainingCars.length > 0 ? remainingCars[0] : null);
      }
    }
  };

  const handleSaveCar = () => {
    setShowForm(false);
    setEditingCar(undefined);
    loadCars();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCar(undefined);
  };

  const handleSelectCar = (car: Car) => {
    setSelectedCar(car);
  };

  const handleExportAll = () => {
    try {
      const json = carStorage.exportAllCars();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-cars-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting cars: ' + (error as Error).message);
    }
  };

  const handleImportAll = () => {
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
            if (
              confirm(
                'This will replace all current cars. Are you sure you want to continue?'
              )
            ) {
              carStorage.importAllCars(json);
              loadCars();
              setSelectedCar(null);
            }
          } catch (error) {
            alert('Error importing cars: ' + (error as Error).message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Car Purchase Calculator
          </h1>
          <div className="flex gap-3">
            <Link
              href="/compare"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Compare Cars
            </Link>
            <Link
              href="/compare-visual"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
            >
              Visual Comparison
            </Link>
            <Link
              href="/listings"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Search Listings
            </Link>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={handleAddCar}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Add New Car
          </button>
          <button
            onClick={handleExportAll}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={cars.length === 0}
          >
            Export All Cars
          </button>
          <button
            onClick={handleImportAll}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
          >
            Import All Cars
          </button>
        </div>

        {cars.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
            No cars added yet. Click &quot;Add New Car&quot; to get started.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select Car
              </label>
              <select
                value={selectedCar?.id || ''}
                onChange={(e) => {
                  const car = cars.find((c) => c.id === e.target.value);
                  setSelectedCar(car || null);
                }}
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white text-lg"
              >
                <option value="">Select a car...</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.year} {car.make} {car.model} {car.tier ? `(${car.tier})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedCar && (
              <>
                <div className="mb-6">
                  <CarCard
                    car={selectedCar}
                    onEdit={() => handleEditCar(selectedCar)}
                    onDelete={() => handleDeleteCar(selectedCar.id)}
                    onSelect={() => {}}
                    isSelected={false}
                  />
                </div>
                <CarChart 
                  car={selectedCar}
                  downPaymentOverride={downPaymentOverride ? parseFloat(downPaymentOverride) || undefined : undefined}
                  aprOverride={aprOverride ? (parseFloat(aprOverride) / 100) || undefined : undefined}
                  termOverride={termOverride ? parseFloat(termOverride) || undefined : undefined}
                  aprOverrideString={aprOverride}
                  onDownPaymentOverrideChange={(value) => setDownPaymentOverride(value)}
                  onAprOverrideChange={(value) => setAprOverride(value)}
                  onTermOverrideChange={(value) => setTermOverride(value)}
                />
              </>
            )}
          </>
        )}
      </div>

      {showForm && (
        <CarForm
          car={editingCar}
          onSave={handleSaveCar}
          onCancel={handleCancelForm}
        />
      )}
    </div>
  );
}
