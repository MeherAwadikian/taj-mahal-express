import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel cron: 0 3 * * * (runs at 03:00 UTC daily)
// Release escrow for order_items completed 3+ days ago (T+3 rule)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const cutoff = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString()

  // Find payouts pending release (escrow held, order_item completed)
  const { data: payouts, error } = await supabase
    .from('seller_payouts')
    .select('id, seller_profile_id, amount, order_item_id')
    .eq('status', 'held')
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

  const { error: updateError } = await supabase
    .from('seller_payouts')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    console.error('payout-release update error:', updateError)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ released: ids.length })
}
