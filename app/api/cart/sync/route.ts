import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const syncSchema = z.object({
  items: z.array(z.object({
    variant_id: z.string().uuid(),
    quantity:   z.number().int().min(1).max(100),
  })).max(50),
})

// POST /api/cart/sync — merge guest cart into authenticated user's cart after login
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = syncSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { items } = parsed.data
  if (items.length === 0) {
    return NextResponse.json({ merged: 0 })
  }

  // Verify all variant IDs exist
  const variantIds = items.map((i) => i.variant_id)
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, quantity, reserved_quantity')
    .in('id', variantIds)
    .eq('is_active', true)

  const availableMap = new Map(
    (variants ?? []).map((v) => [v.id, Math.max(0, (v.quantity ?? 0) - (v.reserved_quantity ?? 0))]),
  )

  // Get existing cart to merge quantities (take max, capped by stock)
  const { data: existing } = await supabase
    .from('cart_items')
    .select('variant_id, quantity')
    .eq('user_id', user.id)

  const existingMap = new Map((existing ?? []).map((c) => [c.variant_id, c.quantity]))

  const upsertRows = items
    .filter((item) => availableMap.has(item.variant_id))
    .map((item) => {
      const existingQty = existingMap.get(item.variant_id) ?? 0
      const desired     = Math.max(item.quantity, existingQty)
      const available   = availableMap.get(item.variant_id) ?? 0
      return {
        user_id:    user.id,
        variant_id: item.variant_id,
        quantity:   Math.min(desired, available),
      }
    })
    .filter((r) => r.quantity > 0)

  if (upsertRows.length === 0) {
    return NextResponse.json({ merged: 0 })
  }

  const { error } = await supabase
    .from('cart_items')
    .upsert(upsertRows, { onConflict: 'user_id,variant_id', ignoreDuplicates: false })

  if (error) {
    return NextResponse.json({ error: 'Cart sync failed' }, { status: 500 })
  }

  return NextResponse.json({ merged: upsertRows.length })
}
