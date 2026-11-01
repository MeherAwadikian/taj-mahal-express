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

      const razorpayOrderId   = payment.order_id as string
      const razorpayPaymentId = payment.id        as string

      // razorpay_order_id lives on `payments`, one row per order
      const { data: paymentRow } = await supabase
        .from('payments')
        .select('id, order_id, status')
        .eq('razorpay_order_id', razorpayOrderId)
        .single()

      if (!paymentRow) break
      if (paymentRow.status === 'captured') break  // already handled (idempotency)

      await supabase
        .from('payments')
        .update({
          razorpay_payment_id: razorpayPaymentId,
          status:              'captured',
          captured_at:         new Date().toISOString(),
        })
        .eq('id', paymentRow.id)

      const { data: order } = await supabase
        .from('orders')
        .update({ status: 'confirmed', payment_status: 'paid' })
        .eq('id', paymentRow.order_id)
        .select('id, buyer_id')
        .single()

      // Clear the buyer's cart (best-effort)
      if (order?.buyer_id) {
        const { data: cart } = await supabase.from('carts').select('id').eq('user_id', order.buyer_id).maybeSingle()
        if (cart) await supabase.from('cart_items').delete().eq('cart_id', cart.id)
      }

      break
    }

    case 'payment.failed': {
      const payment = (event.payload?.payment as { entity?: Record<string, unknown> })?.entity
      if (!payment) break

      const razorpayOrderId = payment.order_id as string

      const { data: paymentRow } = await supabase
        .from('payments')
        .select('id, order_id, status')
        .eq('razorpay_order_id', razorpayOrderId)
        .single()

      if (!paymentRow || paymentRow.status === 'captured') break

      await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentRow.id)

      const { data: order } = await supabase
        .from('orders')
        .select('id, payment_status')
        .eq('id', paymentRow.order_id)
        .single()

      if (!order || order.payment_status !== 'pending') break

      await supabase
        .from('orders')
        .update({ payment_status: 'failed', status: 'cancelled' })
        .eq('id', order.id)

      // Cancelling order_items (not just the parent order) is what fires the
      // DB's inventory trigger, releasing the reserved stock.
      await supabase
        .from('order_items')
        .update({ item_status: 'cancelled' })
        .eq('order_id', order.id)
        .not('item_status', 'in', '(cancelled,delivered,returned)')

      break
    }

    case 'refund.processed': {
      const refund = (event.payload?.refund as { entity?: Record<string, unknown> })?.entity
      if (!refund) break

      const razorpayPaymentId = refund.payment_id as string

      const { data: paymentRow } = await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('razorpay_payment_id', razorpayPaymentId)
        .select('order_id')
        .single()

      if (paymentRow) {
        await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', paymentRow.order_id)
      }

      break
    }

    default:
      // Unhandled event — log but return 200 so Razorpay doesn't retry
      console.log(`Unhandled Razorpay event: ${event.event}`)
  }

  return NextResponse.json({ received: true })
}
