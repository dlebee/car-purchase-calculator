'use client';

import { useState, useEffect } from 'react';
import { Car } from '@/lib/types';
import carStorage from '@/lib/carStorage';
import profileStorage from '@/lib/profileStorage';

// Florida fee defaults and expected ranges
const FLORIDA_FEE_RANGES = {
  dealerFees: { min: 0, max: 1500, typical: 999, recommendedMax: 1200 }, // Dealer Service Fee, Pre-Delivery, Electronic Filing, etc.
  governmentFees: { min: 200, max: 600, typical: 400, recommendedMax: 500 }, // DMV, License, Registration, Title Transfer
  otherFees: { min: 0, max: 500, typical: 100, recommendedMax: 400 }, // VIN Etch, Battery, Tire, Agency, etc.
};

interface CarFormProps {
  car?: Car;
  onSave: () => void;
  onCancel: () => void;
}

export default function CarForm({ car, onSave, onCancel }: CarFormProps) {
  const [isFetchingCar, setIsFetchingCar] = useState(false);
  const [vinFetchStatus, setVinFetchStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [vinFetchError, setVinFetchError] = useState<string>('');
  const [profileFeeRecommendations, setProfileFeeRecommendations] = useState<string>('');
  
  // Load profile fee recommendations
  useEffect(() => {
    const profile = profileStorage.getProfile();
    setProfileFeeRecommendations(profile.feeRecommendations || '');
  }, []);
  
  // Store string values for numeric inputs to preserve decimal points during typing
  const [stringValues, setStringValues] = useState<Record<string, string>>({
    vin: '',
    listedPrice: '',
    negotiatedPrice: '',
    apr: '',
    buyRateApr: '',
    termLength: '',
    taxRate: '',
    flatTaxFee: '',
    creditScore: '',
    mileage: '',
    year: new Date().getFullYear().toString(),
    downPayment: '',
    dealerFees: '',
    governmentFees: '',
    otherFees: '',
  });

  const [formData, setFormData] = useState<Partial<Car>>({
    make: '',
    model: '',
    tier: '',
    dealership: '',
    vin: '',
    listedPrice: 0,
    negotiatedPrice: 0,
    apr: 0,
    buyRateApr: 0,
    termLength: 0,
    notes: '',
    taxRate: 0,
    flatTaxFee: 0,
    tax: 0,
    creditScore: 0,
    mileage: 0,
    year: new Date().getFullYear(),
    downPayment: 0,
    dealerFees: 0,
    governmentFees: 0,
    otherFees: 0,
  });

  useEffect(() => {
    if (car) {
      setFormData(car);
      // Initialize string values from car data
      setStringValues({
        vin: car.vin || '',
        listedPrice: car.listedPrice ? car.listedPrice.toString() : '',
        negotiatedPrice: car.negotiatedPrice ? car.negotiatedPrice.toString() : '',
        apr: car.apr ? (car.apr * 100).toString() : '',
        buyRateApr: car.buyRateApr ? (car.buyRateApr * 100).toString() : '',
        termLength: car.termLength ? car.termLength.toString() : '',
        taxRate: car.taxRate ? car.taxRate.toString() : '',
        flatTaxFee: car.flatTaxFee ? car.flatTaxFee.toString() : '',
        creditScore: car.creditScore ? car.creditScore.toString() : '',
        mileage: car.mileage ? car.mileage.toString() : '',
        year: car.year ? car.year.toString() : new Date().getFullYear().toString(),
        downPayment: car.downPayment ? car.downPayment.toString() : '',
        dealerFees: car.dealerFees ? car.dealerFees.toString() : '',
        governmentFees: car.governmentFees ? car.governmentFees.toString() : '',
        otherFees: car.otherFees ? car.otherFees.toString() : '',
      });
    } else {
      // When creating a new car, load profile defaults
      const profile = profileStorage.getProfile();
      const defaultApr = profile.defaultApr || 0.045;
      setFormData((prev) => ({
        ...prev,
        taxRate: profile.taxRate,
        flatTaxFee: profile.flatTaxFee,
        creditScore: profile.creditScore,
        downPayment: profile.defaultDownPayment || 0,
        termLength: profile.defaultTermLength || 60,
        apr: defaultApr,
      }));
      setStringValues((prev) => ({
        ...prev,
        taxRate: profile.taxRate.toString(),
        flatTaxFee: profile.flatTaxFee.toString(),
        creditScore: profile.creditScore.toString(),
        downPayment: (profile.defaultDownPayment || 0).toString(),
        termLength: (profile.defaultTermLength || 60).toString(),
        apr: (defaultApr * 100).toFixed(2), // Convert to percentage for display
      }));
    }
  }, [car]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Text fields - store directly
    if (name === 'make' || name === 'model' || name === 'tier' || name === 'dealership' || name === 'vin' || name === 'notes' || name === 'repName' || name === 'repPhone') {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Also update stringValues for VIN to keep it in sync
      if (name === 'vin') {
        setStringValues((prev) => ({ ...prev, vin: value.toUpperCase() }));
      }
      return;
    }
    
    // Checkbox fields
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    
    // Numeric fields - store raw string value, then parse for calculations
    setStringValues((prev) => ({ ...prev, [name]: value }));
    
    // Parse the value for calculations (allow empty string and partial decimals)
    const numValue = value === '' || value === '.' ? 0 : parseFloat(value) || 0;
    
    setFormData((prev) => {
      // APR needs special handling (convert percentage to decimal)
      if (name === 'apr') {
        return { ...prev, [name]: numValue / 100 };
      }
      // Buy rate APR (what lender offers dealer)
      if (name === 'buyRateApr') {
        return { ...prev, [name]: numValue / 100 };
      }
      // Tax rate - calculate tax amount from negotiated price + flat tax fee
      if (name === 'taxRate') {
        const negotiatedPrice = prev.negotiatedPrice || 0;
        const flatTaxFee = prev.flatTaxFee || 0;
        const taxAmount = (negotiatedPrice * numValue) / 100 + flatTaxFee;
        return { ...prev, taxRate: numValue, tax: taxAmount };
      }
      // Flat tax fee - recalculate tax amount
      if (name === 'flatTaxFee') {
        const negotiatedPrice = prev.negotiatedPrice || 0;
        const taxRate = prev.taxRate || 0;
        const taxAmount = (negotiatedPrice * taxRate) / 100 + numValue;
        return { ...prev, flatTaxFee: numValue, tax: taxAmount };
      }
      // When negotiated price changes, recalculate tax if tax rate is set
      if (name === 'negotiatedPrice') {
        const taxRate = prev.taxRate || 0;
        const flatTaxFee = prev.flatTaxFee || 0;
        const taxAmount = (numValue * taxRate) / 100 + flatTaxFee;
        return { ...prev, negotiatedPrice: numValue, tax: taxAmount };
      }
      // All other numeric fields
      return { ...prev, [name]: numValue };
    });
  };

  const getStringValue = (name: string): string => {
    return stringValues[name] || '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      // Parse all string values to numbers
    const negotiatedPrice = parseFloat(stringValues.negotiatedPrice) || 0;
    const taxRate = parseFloat(stringValues.taxRate) || 0;
    const flatTaxFee = parseFloat(stringValues.flatTaxFee) || 0;
    const calculatedTax = (negotiatedPrice * taxRate) / 100 + flatTaxFee;
    
    const carToSave: Car = {
      id: car?.id || '',
      make: formData.make || '',
      model: formData.model || '',
      tier: formData.tier || '',
      dealership: formData.dealership || '',
      vin: formData.vin || '',
      listedPrice: parseFloat(stringValues.listedPrice) || 0,
      negotiatedPrice: negotiatedPrice,
      apr: parseFloat(stringValues.apr) / 100 || 0,
      buyRateApr: parseFloat(stringValues.buyRateApr) / 100 || 0,
      termLength: parseFloat(stringValues.termLength) || 0,
      notes: formData.notes || '',
      taxRate: taxRate,
      flatTaxFee: flatTaxFee,
      tax: calculatedTax,
      creditScore: parseFloat(stringValues.creditScore) || 0,
      mileage: parseFloat(stringValues.mileage) || 0,
      year: parseFloat(stringValues.year) || new Date().getFullYear(),
      downPayment: parseFloat(stringValues.downPayment) || 0,
      dealerFees: parseFloat(stringValues.dealerFees) || 0,
      governmentFees: parseFloat(stringValues.governmentFees) || 0,
      otherFees: parseFloat(stringValues.otherFees) || 0,
      repName: formData.repName || '',
      repPhone: formData.repPhone || '',
    };
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
            // Initialize string values from imported car
            setStringValues({
              vin: importedCar.vin || '',
              listedPrice: importedCar.listedPrice ? importedCar.listedPrice.toString() : '',
              negotiatedPrice: importedCar.negotiatedPrice ? importedCar.negotiatedPrice.toString() : '',
              apr: importedCar.apr ? (importedCar.apr * 100).toString() : '',
              buyRateApr: importedCar.buyRateApr ? (importedCar.buyRateApr * 100).toString() : '',
              termLength: importedCar.termLength ? importedCar.termLength.toString() : '',
              taxRate: importedCar.taxRate ? importedCar.taxRate.toString() : '',
              flatTaxFee: importedCar.flatTaxFee ? importedCar.flatTaxFee.toString() : '',
              creditScore: importedCar.creditScore ? importedCar.creditScore.toString() : '',
              mileage: importedCar.mileage ? importedCar.mileage.toString() : '',
              year: importedCar.year ? importedCar.year.toString() : new Date().getFullYear().toString(),
              downPayment: importedCar.downPayment ? importedCar.downPayment.toString() : '',
              dealerFees: importedCar.dealerFees ? importedCar.dealerFees.toString() : '',
              governmentFees: importedCar.governmentFees ? importedCar.governmentFees.toString() : '',
              otherFees: importedCar.otherFees ? importedCar.otherFees.toString() : '',
            });
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

  const handleFetchCarByVIN = async () => {
    const vin = stringValues.vin?.trim().toUpperCase();
    if (!vin) {
      setVinFetchStatus('error');
      setVinFetchError('Please enter a VIN');
      setTimeout(() => setVinFetchStatus('idle'), 3000);
      return;
    }

    setIsFetchingCar(true);
    setVinFetchStatus('idle');
    setVinFetchError('');
    
    try {
      const response = await fetch('/api/fetch-car-by-vin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch car details');
      }

      if (result.success && result.data) {
        const carData = result.data;
        // Update form data with fetched car details
        setFormData((prev) => ({
          ...prev,
          make: carData.make || prev.make,
          model: carData.model || prev.model,
          year: carData.year || prev.year,
          tier: carData.tier || prev.tier,
          mileage: carData.mileage || prev.mileage,
        }));

        // Update string values
        setStringValues((prev) => ({
          ...prev,
          year: carData.year ? carData.year.toString() : prev.year,
          mileage: carData.mileage ? carData.mileage.toString() : prev.mileage,
        }));

        setVinFetchStatus('success');
        setTimeout(() => setVinFetchStatus('idle'), 3000);
      }
    } catch (error) {
      setVinFetchStatus('error');
      setVinFetchError((error as Error).message);
      setTimeout(() => {
        setVinFetchStatus('idle');
        setVinFetchError('');
      }, 5000);
    } finally {
      setIsFetchingCar(false);
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
                  Rep Name
                </label>
                <input
                  type="text"
                  name="repName"
                  value={formData.repName || ''}
                  onChange={handleChange}
                  placeholder="Sales representative name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Rep Phone
                </label>
                <input
                  type="text"
                  name="repPhone"
                  value={formData.repPhone || ''}
                  onChange={handleChange}
                  placeholder="e.g., (555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  VIN
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      name="vin"
                      value={getStringValue('vin')}
                      onChange={(e) => {
                        handleChange(e);
                        // Reset status when VIN changes
                        if (vinFetchStatus !== 'idle') {
                          setVinFetchStatus('idle');
                          setVinFetchError('');
                        }
                      }}
                      placeholder="Enter VIN"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase pr-10"
                      style={{ textTransform: 'uppercase' }}
                    />
                    {vinFetchStatus === 'success' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {vinFetchStatus === 'error' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchCarByVIN}
                    disabled={isFetchingCar || !getStringValue('vin')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                  >
                    {isFetchingCar ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fetching...
                      </>
                    ) : (
                      'Fetch Details'
                    )}
                  </button>
                </div>
                {vinFetchStatus === 'error' && vinFetchError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {vinFetchError}
                  </p>
                )}
                {vinFetchStatus === 'idle' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter VIN and click &quot;Fetch Details&quot; to auto-fill car information (NHTSA will validate the VIN)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Listed Price
                </label>
                <input
                  type="text"
                  name="listedPrice"
                  value={getStringValue('listedPrice')}
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
                  value={getStringValue('negotiatedPrice')}
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
                  APR (%) - Sell Rate
                </label>
                <input
                  type="text"
                  name="apr"
                  value={getStringValue('apr')}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 2.5 for 2.5%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The APR the dealer is charging you
                </p>
              </div>
              <div className="col-span-2">
                <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    💡 Fees You Should Try to Waive:
                  </p>
                  <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                    <li><strong>Dealer Fees:</strong> Dealer Service Fee, Pre-Delivery Service Charge, Documentation Fee, Electronic Filing Fee - These are <span className="text-green-600 dark:text-green-400 font-semibold">100% negotiable</span> and can often be waived entirely or reduced significantly.</li>
                    <li><strong>Other Fees:</strong> VIN Etch, Battery Fee, Tire Fee, Agency Fee - Most of these are <span className="text-green-600 dark:text-green-400 font-semibold">optional add-ons</span> that dealers use to increase profit. You can decline them.</li>
                    <li><strong>Government Fees:</strong> DMV, License, Registration, Title Transfer - These are <span className="text-orange-600 dark:text-orange-400 font-semibold">usually mandatory</span> government fees, but verify the amounts aren't inflated.</li>
                  </ul>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                    💰 Tip: Always ask "Can you waive the dealer fees?" - Many dealers will reduce or eliminate them to close the deal.
                  </p>
                </blockquote>
                {profileFeeRecommendations && (
                  <blockquote className="border-l-4 border-green-500 dark:border-green-400 pl-4 py-2 my-4 bg-green-50 dark:bg-green-900/20 rounded-r-lg">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      📝 Your Custom Recommendations:
                    </p>
                    <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {profileFeeRecommendations}
                    </div>
                  </blockquote>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Dealer Fees ($) - Optional
                </label>
                <input
                  type="text"
                  name="dealerFees"
                  value={getStringValue('dealerFees')}
                  onChange={handleChange}
                  placeholder={`e.g., ${FLORIDA_FEE_RANGES.dealerFees.typical}`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    (parseFloat(getStringValue('dealerFees')) || 0) > FLORIDA_FEE_RANGES.dealerFees.recommendedMax
                      ? 'border-red-500 dark:border-red-500'
                      : (parseFloat(getStringValue('dealerFees')) || 0) > FLORIDA_FEE_RANGES.dealerFees.typical
                      ? 'border-yellow-500 dark:border-yellow-500'
                      : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <strong>Examples:</strong> Dealer Service Fee, Pre-Delivery Service Charge, Documentation Fee, Electronic Filing Fee
                </p>
                <p className={`text-xs mt-1 ${
                  (parseFloat(getStringValue('dealerFees')) || 0) > FLORIDA_FEE_RANGES.dealerFees.recommendedMax
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : (parseFloat(getStringValue('dealerFees')) || 0) > FLORIDA_FEE_RANGES.dealerFees.typical
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {((parseFloat(getStringValue('dealerFees')) || 0) > FLORIDA_FEE_RANGES.dealerFees.recommendedMax) 
                    ? `⚠️ High: $${(parseFloat(getStringValue('dealerFees')) || 0).toFixed(2)} exceeds recommended max of $${FLORIDA_FEE_RANGES.dealerFees.recommendedMax.toFixed(2)}`
                    : `Recommended: Should not exceed $${FLORIDA_FEE_RANGES.dealerFees.recommendedMax.toFixed(2)} (Typical: $${FLORIDA_FEE_RANGES.dealerFees.typical.toFixed(2)})`
                  }
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
                  ✓ Negotiable - Can be waived or reduced
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Government Fees ($) - Optional
                </label>
                <input
                  type="text"
                  name="governmentFees"
                  value={getStringValue('governmentFees')}
                  onChange={handleChange}
                  placeholder={`e.g., ${FLORIDA_FEE_RANGES.governmentFees.typical}`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    (parseFloat(getStringValue('governmentFees')) || 0) > FLORIDA_FEE_RANGES.governmentFees.recommendedMax
                      ? 'border-red-500 dark:border-red-500'
                      : (parseFloat(getStringValue('governmentFees')) || 0) > FLORIDA_FEE_RANGES.governmentFees.typical
                      ? 'border-yellow-500 dark:border-yellow-500'
                      : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <strong>Examples:</strong> DMV Fees, License Fees, Registration Fees, Title Transfer Fees, FL Doc. Stamp
                </p>
                <p className={`text-xs mt-1 ${
                  (parseFloat(getStringValue('governmentFees')) || 0) > FLORIDA_FEE_RANGES.governmentFees.recommendedMax
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : (parseFloat(getStringValue('governmentFees')) || 0) > FLORIDA_FEE_RANGES.governmentFees.typical
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {((parseFloat(getStringValue('governmentFees')) || 0) > FLORIDA_FEE_RANGES.governmentFees.recommendedMax) 
                    ? `⚠️ High: $${(parseFloat(getStringValue('governmentFees')) || 0).toFixed(2)} exceeds recommended max of $${FLORIDA_FEE_RANGES.governmentFees.recommendedMax.toFixed(2)}`
                    : `Recommended: Should not exceed $${FLORIDA_FEE_RANGES.governmentFees.recommendedMax.toFixed(2)} (Typical: $${FLORIDA_FEE_RANGES.governmentFees.typical.toFixed(2)})`
                  }
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠ Usually mandatory (government fee)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Other Fees ($) - Optional
                </label>
                <input
                  type="text"
                  name="otherFees"
                  value={getStringValue('otherFees')}
                  onChange={handleChange}
                  placeholder={`e.g., ${FLORIDA_FEE_RANGES.otherFees.typical}`}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    (parseFloat(getStringValue('otherFees')) || 0) > FLORIDA_FEE_RANGES.otherFees.recommendedMax
                      ? 'border-red-500 dark:border-red-500'
                      : (parseFloat(getStringValue('otherFees')) || 0) > FLORIDA_FEE_RANGES.otherFees.typical
                      ? 'border-yellow-500 dark:border-yellow-500'
                      : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <strong>Examples:</strong> VIN Etch ($359), Battery Fee ($1.50), Tire Fee ($5), Agency Fee ($99)
                </p>
                <p className={`text-xs mt-1 ${
                  (parseFloat(getStringValue('otherFees')) || 0) > FLORIDA_FEE_RANGES.otherFees.recommendedMax
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : (parseFloat(getStringValue('otherFees')) || 0) > FLORIDA_FEE_RANGES.otherFees.typical
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {((parseFloat(getStringValue('otherFees')) || 0) > FLORIDA_FEE_RANGES.otherFees.recommendedMax) 
                    ? `⚠️ High: $${(parseFloat(getStringValue('otherFees')) || 0).toFixed(2)} exceeds recommended max of $${FLORIDA_FEE_RANGES.otherFees.recommendedMax.toFixed(2)}`
                    : `Recommended: Should not exceed $${FLORIDA_FEE_RANGES.otherFees.recommendedMax.toFixed(2)} (Typical: $${FLORIDA_FEE_RANGES.otherFees.typical.toFixed(2)})`
                  }
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Depends on fee type - some negotiable, some mandatory
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Buy Rate APR (%) - Optional (If you have outside financing)
                </label>
                <input
                  type="text"
                  name="buyRateApr"
                  value={getStringValue('buyRateApr')}
                  onChange={handleChange}
                  placeholder="e.g., 2.0 for 2.0%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your pre-approved APR from bank/credit union (to compare against dealer financing)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Term Length (months)
                </label>
                <select
                  name="termLength"
                  value={getStringValue('termLength')}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select term length</option>
                  <option value="36">36 months (3 years)</option>
                  <option value="48">48 months (4 years)</option>
                  <option value="60">60 months (5 years)</option>
                  <option value="72">72 months (6 years)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Tax Rate (%)
                </label>
                <input
                  type="text"
                  name="taxRate"
                  value={getStringValue('taxRate')}
                  onChange={handleChange}
                  placeholder="e.g., 6.0 for 6%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Percentage tax rate (e.g., 6% in Florida)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Flat Tax Fee ($)
                </label>
                <input
                  type="text"
                  name="flatTaxFee"
                  value={getStringValue('flatTaxFee')}
                  onChange={handleChange}
                  placeholder="e.g., 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Flat tax fee added to percentage tax (e.g., $100 in Florida)
                </p>
                {formData.taxRate && formData.taxRate > 0 && formData.negotiatedPrice && formData.negotiatedPrice > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Total tax: ${((formData.negotiatedPrice * formData.taxRate) / 100 + (formData.flatTaxFee || 0)).toFixed(2)}
                    {formData.flatTaxFee && formData.flatTaxFee > 0 && (
                      <span className="ml-1">
                        ({(formData.negotiatedPrice * formData.taxRate / 100).toFixed(2)} + {formData.flatTaxFee.toFixed(2)})
                      </span>
                    )}
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
                  value={getStringValue('creditScore')}
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
                  value={getStringValue('mileage')}
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
                  value={getStringValue('year')}
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
                  value={getStringValue('downPayment')}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y overflow-wrap-anywhere break-words"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
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

