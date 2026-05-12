import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel cron: 0 2 * * * (runs at 02:00 UTC daily)
// Auto-complete orders where delivery was confirmed 3+ days ago but status is still 'delivered'
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Orders delivered 3+ days ago that haven't been auto-completed yet
  const cutoff = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString()

  const { data: orders, error } = await supabase
    .from('order_items')
    .select('id, order_id')
    .eq('status', 'delivered')
    .lte('updated_at', cutoff)

  if (error) {
    console.error('order-auto-complete cron error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ completed: 0 })
  }

  const itemIds = orders.map((o) => o.id)

  const { error: updateError } = await supabase
    .from('order_items')
    .update({ status: 'completed' })
    .in('id', itemIds)

  if (updateError) {
    console.error('order-auto-complete update error:', updateError)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ completed: itemIds.length })
}
