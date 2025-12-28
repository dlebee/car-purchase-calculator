'use client';

import { useState, useEffect } from 'react';
import profileStorage, { UserProfile } from '@/lib/profileStorage';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>(profileStorage.getProfile());

  useEffect(() => {
    if (isOpen) {
      setProfile(profileStorage.getProfile());
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    profileStorage.saveProfile(profile);
    onClose();
  };

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    setProfile((prev) => ({
      ...prev,
      [field]: typeof value === 'number' ? value : value,
    }));
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Profile Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              These values will pre-fill forms when adding new cars
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={profile.taxRate}
              onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              placeholder="6.0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Flat Tax Fee ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={profile.flatTaxFee}
              onChange={(e) => handleChange('flatTaxFee', parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <span className="text-blue-500">💡</span>
              Additional flat tax fee (e.g., Florida has $100 flat fee)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              State
            </label>
            <input
              type="text"
              value={profile.state}
              onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
              placeholder="e.g., FL"
              maxLength={2}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Zipcode
            </label>
            <input
              type="text"
              value={profile.zipcode}
              onChange={(e) => handleChange('zipcode', e.target.value)}
              placeholder="e.g., 33101"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Credit Score
            </label>
            <input
              type="number"
              min="300"
              max="850"
              value={profile.creditScore || ''}
              onChange={(e) => handleChange('creditScore', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-md hover:shadow-lg"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

