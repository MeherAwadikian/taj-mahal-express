// INR formatting utilities — centralised so locale behaviour is consistent

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const INR_FORMATTER_DECIMAL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// "₹1,499" — for prices (no paise needed for display)
export function formatINR(amount: number): string {
  return INR_FORMATTER.format(amount)
}

// "₹1,499.00" — for invoices, payouts, financial statements
export function formatINRExact(amount: number): string {
  return INR_FORMATTER_DECIMAL.format(amount)
}

// "49%" — discount percentage
export function discountPercent(mrp: number, price: number): number {
  if (mrp <= 0 || price >= mrp) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}

// Converts paise (Razorpay unit) to rupees
export function paiseToRupees(paise: number): number {
  return paise / 100
}

// Converts rupees to paise for Razorpay API calls
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100)
}
