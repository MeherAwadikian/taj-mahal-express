import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel cron: 0 3 * * * (runs at 03:00 UTC daily)
// Release payouts (mark 'paid') for batches created 3+ days ago by the
// order-auto-complete cron, giving a short window to catch late disputes
// before money actually moves. seller_payouts.status is one of pending,
// processing, paid, failed, on_hold (schema has no 'held'/'released').
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const cutoff = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString()

  const { data: payouts, error } = await supabase
    .from('seller_payouts')
    .select('id, seller_id, net_amount')
    .eq('status', 'pending')
    .lte('created_at', cutoff)
    .limit(200)

  if (error) {
    console.error('payout-release cron error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!payouts || payouts.length === 0) {
    return NextResponse.json({ released: 0 })
  }

  const ids = payouts.map((p) => p.id)

  // Actual bank transfer via RazorpayX Payouts is not wired up yet (no
  // credentials configured) — this only marks the batch settled internally.
  const { error: updateError } = await supabase
    .from('seller_payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    console.error('payout-release update error:', updateError)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ released: ids.length })
}
