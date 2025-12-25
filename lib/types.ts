export interface Car {
  id: string;
  make: string;
  model: string;
  tier: string;
  dealership: string;
  vin: string; // Vehicle Identification Number
  listedPrice: number; // Listed/advertised price (MSRP for new, market value for used/buyouts)
  negotiatedPrice: number; // What you're actually paying (buy price)
  apr: number; // Annual Percentage Rate as a decimal (e.g., 0.05 for 5%)
  termLength: number; // Loan term in months
  notes: string;
  taxRate: number; // Tax rate as a percentage (e.g., 7.5 for 7.5%)
  tax: number; // Calculated tax amount (negotiatedPrice * taxRate / 100)
  creditScore: number; // FICO Auto Score 8
  mileage: number;
  year: number;
  downPayment: number;
}

export interface PaymentScheduleEntry {
  month: number;
  principalPaid: number;
  interestPaid: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
  remainingBalance: number;
}

export interface CarCalculations {
  monthlyPayment: number; // Monthly payment on financed amount (principal + interest, tax included in principal if rolled into loan)
  monthlyPaymentWithTax: number; // Monthly payment including tax spread over loan term (for display purposes)
  totalInterest: number;
  totalTax: number;
  totalCost: number;
  adjustedCost: number; // Negotiated price - down payment (amount that needs financing before tax)
  financedAmount: number; // Adjusted cost + tax (actual amount being financed)
  discount: number; // Discount from listed price (listedPrice - negotiatedPrice)
  discountPercent: number; // Discount as percentage
  payoffDate: Date; // Estimated date when loan will be fully paid off (first day of next month + term length)
  paymentSchedule: PaymentScheduleEntry[];
}

