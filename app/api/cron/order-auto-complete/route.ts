import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel cron: 0 2 * * * (runs at 02:00 UTC daily)
//
// The schema has no 'completed' item_status (item_status is one of pending,
// confirmed, shipped, delivered, cancelled, return_requested, returned,
// refunded — 'delivered' is the terminal happy-path state). So "auto-complete"
// here means: once an item has been delivered 3+ days with no dispute/return,
// it becomes eligible for seller payout — settle it into a payout batch via
// payout_line_items, using order_items.updated_at as a proxy for delivery
// time (there is no dedicated delivered_at column).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const cutoff = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString()
  const today  = new Date().toISOString().slice(0, 10)

  // Delivered items past the T+3 window, not already settled into a payout,
  // and with no open dispute.
  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, seller_id, subtotal, commission_rate, commission_amount, seller_payout_amount, orders(order_number)')
    .eq('item_status', 'delivered')
    .lte('updated_at', cutoff)
    .limit(500)

  if (error) {
    console.error('order-auto-complete cron error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ settled: 0 })
  }

  const itemIds = items.map((i) => i.id)

  const [{ data: alreadySettled }, { data: openDisputes }] = await Promise.all([
    supabase.from('payout_line_items').select('order_item_id').in('order_item_id', itemIds),
    supabase.from('disputes').select('order_item_id').in('order_item_id', itemIds).not('status', 'in', '(resolved,closed)'),
  ])

  const settledIds  = new Set((alreadySettled ?? []).map((r) => r.order_item_id))
  const disputedIds = new Set((openDisputes ?? []).map((r) => r.order_item_id))
  const eligible    = items.filter((i) => !settledIds.has(i.id) && !disputedIds.has(i.id))

  if (eligible.length === 0) {
    return NextResponse.json({ settled: 0 })
  }

  // Group by seller — one payout batch per seller per run
  const bySeller = new Map<string, typeof eligible>()
  for (const item of eligible) {
    const list = bySeller.get(item.seller_id) ?? []
    list.push(item)
    bySeller.set(item.seller_id, list)
  }

  let settledCount = 0
  for (const [sellerId, sellerItems] of bySeller) {
    const grossAmount      = sellerItems.reduce((sum, i) => sum + Number(i.subtotal), 0)
    const commissionAmount = sellerItems.reduce((sum, i) => sum + Number(i.commission_amount), 0)
    const netAmount        = sellerItems.reduce((sum, i) => sum + Number(i.seller_payout_amount), 0)

    const { data: payout, error: payoutError } = await supabase
      .from('seller_payouts')
      .insert({
        seller_id:           sellerId,
        period_start:        today,
        period_end:          today,
        gross_amount:        grossAmount,
        commission_deducted: commissionAmount,
        net_amount:          netAmount,
        status:              'pending',
      })
      .select('id')
      .single()

    if (payoutError || !payout) {
      console.error('order-auto-complete payout insert error:', payoutError)
      continue
    }

    const lineItems = sellerItems.map((i) => ({
      payout_id:         payout.id,
      order_item_id:     i.id,
      order_number:      (Array.isArray(i.orders) ? i.orders[0] : i.orders)?.order_number ?? '',
      gross_amount:      i.subtotal,
      commission_rate:   i.commission_rate,
      commission_amount: i.commission_amount,
      net_amount:        i.seller_payout_amount,
      settled_at:        today,
    }))

    const { error: lineError } = await supabase.from('payout_line_items').insert(lineItems)
    if (lineError) {
      console.error('order-auto-complete line item insert error:', lineError)
      await supabase.from('seller_payouts').delete().eq('id', payout.id)
      continue
    }

    settledCount += sellerItems.length
  }

  return NextResponse.json({ settled: settledCount })
}
