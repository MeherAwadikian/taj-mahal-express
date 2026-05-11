import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRazorpayWebhook } from '@/lib/razorpay/verify-webhook'

// Razorpay sends JSON — we need the raw body to verify the HMAC
export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  if (!verifyRazorpayWebhook(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; payload: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()

  switch (event.event) {
    case 'payment.captured': {
      const payment = (event.payload?.payment as { entity?: Record<string, unknown> })?.entity
      if (!payment) break

      const razorpayOrderId  = payment.order_id  as string
      const razorpayPaymentId = payment.id        as string

      // Idempotency — skip if already processed
      const { data: order } = await supabase
        .from('orders')
        .select('id, status, payment_status')
        .eq('razorpay_order_id', razorpayOrderId)
        .single()

      if (!order) break
      if (order.payment_status === 'paid') break  // already handled

      await supabase
        .from('orders')
        .update({
          status:               'confirmed',
          payment_status:       'paid',
          razorpay_payment_id:  razorpayPaymentId,
          paid_at:              new Date().toISOString(),
        })
        .eq('id', order.id)

      // Clear the buyer's cart (best-effort)
      const { data: orderRow } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', order.id)
        .single()

      if (orderRow?.buyer_id) {
        await supabase.from('cart_items').delete().eq('user_id', orderRow.buyer_id)
      }

      break
    }

    case 'payment.failed': {
      const payment = (event.payload?.payment as { entity?: Record<string, unknown> })?.entity
      if (!payment) break

      const razorpayOrderId = payment.order_id as string

      // Release reserved inventory and mark order as payment_failed
      const { data: order } = await supabase
        .from('orders')
        .select('id, payment_status')
        .eq('razorpay_order_id', razorpayOrderId)
        .single()

      if (!order || order.payment_status !== 'pending') break

      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', order.id)

      // Release reserved inventory via update_inventory_on_order DB function
      // The trigger handles this automatically when status changes to 'cancelled'

      break
    }

    case 'refund.processed': {
      const refund = (event.payload?.refund as { entity?: Record<string, unknown> })?.entity
      if (!refund) break

      const razorpayPaymentId = refund.payment_id as string

      await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('razorpay_payment_id', razorpayPaymentId)

      break
    }

    default:
      // Unhandled event — log but return 200 so Razorpay doesn't retry
      console.log(`Unhandled Razorpay event: ${event.event}`)
  }

  return NextResponse.json({ received: true })
}
