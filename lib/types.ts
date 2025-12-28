export interface Car {
  id: string;
  make: string;
  model: string;
  tier: string;
  dealership: string;
  vin: string; // Vehicle Identification Number
  listedPrice: number; // Listed/advertised price (MSRP for new, market value for used/buyouts)
  negotiatedPrice: number; // What you're actually paying (buy price)
  apr: number; // Annual Percentage Rate as a decimal (e.g., 0.05 for 5%) - This is the "sell rate" (what dealer charges you)
  buyRateApr: number; // Buy rate APR (what lender actually offers dealer) - used to calculate dealer financing markup
  termLength: number; // Loan term in months
  notes: string;
  taxRate: number; // Tax rate as a percentage (e.g., 7.5 for 7.5%)
  flatTaxFee: number; // Flat tax fee (e.g., $100 in Florida)
  tax: number; // Calculated tax amount (negotiatedPrice * taxRate / 100 + flatTaxFee)
  creditScore: number; // FICO Auto Score 8
  mileage: number;
  year: number;
  seats?: number; // Number of seats
  downPayment: number;
  dealerFees: number; // Dealer Service Fee, Pre-Delivery Service Charge, Documentation Fee, Electronic Filing Fee, etc.
  governmentFees: number; // DMV Fees, License Fees, Registration Fees, Title Transfer Fees, etc.
  otherFees: number; // VIN Etch, Battery Fee, Tire Fee, Agency Fee, and any other miscellaneous fees
  warrantyType?: string; // e.g., "Manufacturer", "Extended", "CPO", "None"
  warrantyRemainingMonths?: number; // Remaining warranty coverage in months
  warrantyRemainingMiles?: number; // Remaining warranty coverage in miles
  warrantyTransferrable?: boolean; // Whether warranty transfers to new owner
  repName?: string; // Sales representative name
  repPhone?: string; // Sales representative phone number
  carfaxUrl?: string; // Carfax report URL
  vdpUrl?: string; // Vehicle Detail Page (VDP) URL
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
  // Hidden dealer costs (similar to money factor in leases)
  dealerFinancingMarkup: number; // Extra interest paid due to dealer markup on APR (if buyRateApr is provided)
  dealerFinancingMarkupCost: number; // Total cost of dealer financing markup over loan term
  totalDealerFees: number; // Sum of dealer fees
  totalGovernmentFees: number; // Sum of government fees
  totalOtherFees: number; // Sum of other fees
  totalAllFees: number; // Sum of all fees (dealer + government + other)
  averageAnnualInterest: number; // Average interest paid per year (Total Interest / Term Length * 12)
}

