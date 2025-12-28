export interface MakeAprRate {
  make: string; // Make name (e.g., "Ford", "Toyota")
  termLength: number; // Term length in months (e.g., 36, 48, 60)
  apr: number; // APR as decimal (e.g., 0.045 for 4.5%)
}

const MAKE_APR_STORAGE_KEY = 'car-purchase-calculator-make-apr-rates';

class MakeAprStorage {
  getAllRates(): MakeAprRate[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(MAKE_APR_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading make APR rates:', error);
    }

    return [];
  }

  getRate(make: string, termLength: number): number | null {
    const rates = this.getAllRates();
    const makeLower = make.toLowerCase().trim();
    const rate = rates.find(
      (r) => r.make.toLowerCase().trim() === makeLower && r.termLength === termLength
    );
    return rate ? rate.apr : null;
  }

  saveRate(rate: MakeAprRate): void {
    if (typeof window === 'undefined') return;

    try {
      const rates = this.getAllRates();
      const makeLower = rate.make.toLowerCase().trim();
      const termLength = rate.termLength;
      
      // Remove existing rate for this make/term combination
      const filtered = rates.filter(
        (r) => !(r.make.toLowerCase().trim() === makeLower && r.termLength === termLength)
      );
      
      // Add new rate
      filtered.push({
        make: rate.make.trim(),
        termLength,
        apr: rate.apr,
      });
      
      localStorage.setItem(MAKE_APR_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error saving make APR rate:', error);
    }
  }

  deleteRate(make: string, termLength: number): void {
    if (typeof window === 'undefined') return;

    try {
      const rates = this.getAllRates();
      const makeLower = make.toLowerCase().trim();
      const filtered = rates.filter(
        (r) => !(r.make.toLowerCase().trim() === makeLower && r.termLength === termLength)
      );
      localStorage.setItem(MAKE_APR_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting make APR rate:', error);
    }
  }

  getRatesByMake(make: string): MakeAprRate[] {
    const rates = this.getAllRates();
    const makeLower = make.toLowerCase().trim();
    return rates.filter((r) => r.make.toLowerCase().trim() === makeLower);
  }

  getAllMakes(): string[] {
    const rates = this.getAllRates();
    const makes = new Set<string>();
    rates.forEach((r) => makes.add(r.make));
    return Array.from(makes).sort();
  }
}

const makeAprStorage = new MakeAprStorage();
export default makeAprStorage;

