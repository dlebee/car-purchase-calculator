import { Car, PaymentScheduleEntry, CarCalculations } from './types';

export function calculateMonthlyPayment(
  principal: number,
  apr: number,
  termMonths: number
): number {
  if (apr === 0) {
    return principal / termMonths;
  }
  
  const monthlyRate = apr / 12;
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return payment;
}

export function calculatePaymentSchedule(car: Car): PaymentScheduleEntry[] {
  // Ensure tax is calculated from taxRate if taxRate exists
  let calculatedTax = car.tax;
  if (car.taxRate && car.taxRate > 0 && car.negotiatedPrice > 0) {
    calculatedTax = (car.negotiatedPrice * car.taxRate) / 100;
  }
  
  const principal = car.negotiatedPrice + calculatedTax - car.downPayment;
  const monthlyRate = car.apr / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, car.apr, car.termLength);
  
  const schedule: PaymentScheduleEntry[] = [];
  let remainingBalance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;

  for (let month = 1; month <= car.termLength; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    
    remainingBalance -= principalPayment;
    cumulativePrincipal += principalPayment;
    cumulativeInterest += interestPayment;

    schedule.push({
      month,
      principalPaid: principalPayment,
      interestPaid: interestPayment,
      cumulativePrincipal,
      cumulativeInterest,
      remainingBalance: Math.max(0, remainingBalance),
    });
  }

  return schedule;
}

export function calculateCarMetrics(car: Car): CarCalculations {
  // Ensure tax is calculated from taxRate if taxRate exists
  let calculatedTax = car.tax;
  if (car.taxRate && car.taxRate > 0 && car.negotiatedPrice > 0) {
    calculatedTax = (car.negotiatedPrice * car.taxRate) / 100;
  }
  
  const principal = car.negotiatedPrice + calculatedTax - car.downPayment;
  const monthlyPayment = calculateMonthlyPayment(principal, car.apr, car.termLength);
  
  // Calculate monthly tax portion (tax is already included in principal/loan, this shows the tax portion of monthly payment)
  // If tax is rolled into loan, it's amortized. Calculate what portion of monthly payment is tax.
  const principalWithoutTax = car.negotiatedPrice - car.downPayment;
  const monthlyPaymentWithoutTax = calculateMonthlyPayment(principalWithoutTax, car.apr, car.termLength);
  const monthlyTaxPortion = monthlyPayment - monthlyPaymentWithoutTax;
  // For display: show monthly payment + tax portion (if tax is separate/upfront, show it spread over term)
  // If tax is 0, monthlyPaymentWithTax = monthlyPayment
  const monthlyPaymentWithTax = calculatedTax > 0 
    ? monthlyPayment + (calculatedTax / car.termLength) // Show tax spread over term for visibility
    : monthlyPayment;
  
  const paymentSchedule = calculatePaymentSchedule(car);
  const totalInterest = paymentSchedule.reduce(
    (sum, entry) => sum + entry.interestPaid,
    0
  );
  const totalTax = calculatedTax;
  
  // Cost breakdown
  const adjustedCost = car.negotiatedPrice - car.downPayment; // Amount that needs financing (before tax)
  const financedAmount = principal; // Adjusted cost + tax (actual amount being financed)
  
  // Total cost = down payment + financed amount + total interest
  const totalCost = car.downPayment + financedAmount + totalInterest;
  
  // Calculate discount: listed price vs negotiated price
  const discount = car.listedPrice - car.negotiatedPrice;
  const discountPercent = car.listedPrice > 0 ? (discount / car.listedPrice) * 100 : 0;
  
  // Calculate payoff date: first day of next month + term length in months
  const today = new Date();
  const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const payoffDate = new Date(firstDayNextMonth);
  payoffDate.setMonth(payoffDate.getMonth() + car.termLength);

  return {
    monthlyPayment,
    monthlyPaymentWithTax,
    totalInterest,
    totalTax,
    totalCost,
    adjustedCost,
    financedAmount,
    discount,
    discountPercent,
    payoffDate,
    paymentSchedule,
  };
}

