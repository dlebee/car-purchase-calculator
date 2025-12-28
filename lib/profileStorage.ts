export interface UserProfile {
  taxRate: number;
  state: string;
  zipcode: string;
  creditScore: number;
  flatTaxFee: number;
  defaultDownPayment: number;
  defaultTermLength: number;
  defaultApr: number; // APR as decimal (e.g., 0.045 for 4.5%)
}

const PROFILE_STORAGE_KEY = 'car-purchase-calculator-profile';

class ProfileStorage {
  private getDefaultProfile(): UserProfile {
    return {
      taxRate: 6,
      state: '',
      zipcode: '',
      creditScore: 0,
      flatTaxFee: 0,
      defaultDownPayment: 0,
      defaultTermLength: 60,
      defaultApr: 0.045, // 4.5% default APR
    };
  }

  getProfile(): UserProfile {
    if (typeof window === 'undefined') {
      return this.getDefaultProfile();
    }

    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all fields exist
        return { ...this.getDefaultProfile(), ...parsed };
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }

    return this.getDefaultProfile();
  }

  saveProfile(profile: Partial<UserProfile>): void {
    if (typeof window === 'undefined') return;

    try {
      const current = this.getProfile();
      const updated = { ...current, ...profile };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  clearProfile(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }
}

const profileStorage = new ProfileStorage();
export default profileStorage;

