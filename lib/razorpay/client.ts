import Razorpay from 'razorpay'

// Server-only — never import in browser code
if (typeof window !== 'undefined') {
  throw new Error('lib/razorpay/client.ts must not be imported in browser code')
}

let _razorpay: Razorpay | null = null

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function getRazorpayClient(): Razorpay {
  if (_razorpay) return _razorpay
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured — set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET')
  }
  _razorpay = new Razorpay({
    key_id:     process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })
  return _razorpay
}

export interface RazorpayOrderParams {
  orderId:     string   // our internal order UUID
  amountPaise: number   // amount in paise (rupees × 100)
  currency?:   string
  notes?:      Record<string, string>
}

export async function createRazorpayOrder(params: RazorpayOrderParams) {
  const client = getRazorpayClient()

  return client.orders.create({
    amount:          params.amountPaise,
    currency:        params.currency ?? 'INR',
    receipt:         params.orderId,
    payment_capture: true,
    notes:           params.notes ?? {},
  })
}
