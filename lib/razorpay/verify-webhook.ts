import crypto from 'crypto'

// Verify Razorpay webhook HMAC-SHA256 signature.
// Uses timingSafeEqual to prevent timing attacks.
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    const expectedBuf = Buffer.from(expected, 'hex')
    const receivedBuf = Buffer.from(signature, 'hex')

    if (expectedBuf.length !== receivedBuf.length) return false

    return crypto.timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

// Verify Razorpay payment signature (client-side payment verification)
export function verifyPaymentSignature(params: {
  orderId:   string
  paymentId: string
  signature: string
}): boolean {
  const body = `${params.orderId}|${params.paymentId}`
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(params.signature),
  )
}
