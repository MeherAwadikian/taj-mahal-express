import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

// POST /api/orders/[id]/confirm — verify Razorpay payment signature and confirm order
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {}

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 422 })
  }

  // Verify signature — HMAC-SHA256(razorpay_order_id + '|' + razorpay_payment_id)
  const secret   = process.env.RAZORPAY_KEY_SECRET!
  const message  = `${razorpay_order_id}|${razorpay_payment_id}`
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')

  const sigBuf = Buffer.from(razorpay_signature as string, 'hex')
  const expBuf = Buffer.from(expected, 'hex')

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  // Verify order belongs to this user and is pending
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, status, payment_status, razorpay_order_id')
    .eq('id', params.id)
    .single()

  if (!order || order.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
  }

  // Idempotency — already confirmed
  if (order.status === 'confirmed' && order.payment_status === 'paid') {
    return NextResponse.json({ data: { order_id: order.id, status: 'confirmed' } })
  }

  // Update order status
  const { error } = await supabase
    .from('orders')
    .update({
      status:               'confirmed',
      payment_status:       'paid',
      razorpay_payment_id,
      paid_at:              new Date().toISOString(),
    })
    .eq('id', order.id)

  if (error) return NextResponse.json({ error: 'Failed to confirm order' }, { status: 500 })

  // Clear cart
  await supabase.from('cart_items').delete().eq('user_id', user.id)

  return NextResponse.json({ data: { order_id: order.id, status: 'confirmed' } })
}
