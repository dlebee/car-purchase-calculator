import { Car } from './types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'car-purchase-calculator-cars';

class CarStorage {
  private static instance: CarStorage;

  private constructor() {}

  static getInstance(): CarStorage {
    if (!CarStorage.instance) {
      CarStorage.instance = new CarStorage();
    }
    return CarStorage.instance;
  }

  private saveToStorage(cars: Car[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }

  private loadFromStorage(): Car[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const cars = JSON.parse(stored) as Car[];
          // Ensure tax is calculated from taxRate if taxRate exists
          return cars.map((car) => {
            if (car.taxRate && car.taxRate > 0 && car.negotiatedPrice > 0) {
              car.tax = (car.negotiatedPrice * car.taxRate) / 100;
            }
            return car;
          });
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    }
    return [];
  }

  saveCar(car: Car): void {
    const cars = this.getAllCars();
    const existingIndex = cars.findIndex((c) => c.id === car.id);
    
    if (existingIndex >= 0) {
      cars[existingIndex] = car;
    } else {
      if (!car.id) {
        car.id = uuidv4();
      }
      cars.push(car);
    }
    
    this.saveToStorage(cars);
  }

  getAllCars(): Car[] {
    return this.loadFromStorage();
  }

  getCar(id: string): Car | undefined {
    const cars = this.getAllCars();
    return cars.find((c) => c.id === id);
  }

  deleteCar(id: string): void {
    const cars = this.getAllCars();
    const filtered = cars.filter((c) => c.id !== id);
    this.saveToStorage(filtered);
  }

  exportCar(id: string): string {
    const car = this.getCar(id);
    if (!car) {
      throw new Error('Car not found');
    }
    return JSON.stringify(car, null, 2);
  }

  importCar(json: string): Car {
    try {
      const car = JSON.parse(json) as Car;
      if (!car.id) {
        car.id = uuidv4();
      }
      this.saveCar(car);
      return car;
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  exportAllCars(): string {
    const cars = this.getAllCars();
    return JSON.stringify(cars, null, 2);
  }

  importAllCars(json: string): void {
    try {
      const cars = JSON.parse(json) as Car[];
      // Ensure all cars have IDs
      cars.forEach((car) => {
        if (!car.id) {
          car.id = uuidv4();
        }
      });
      this.saveToStorage(cars);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
}

export default CarStorage.getInstance();

