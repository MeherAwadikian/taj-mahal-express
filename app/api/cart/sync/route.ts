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

  // Verify all variant IDs exist and pick up their product_id + price (needed for cart_items inserts)
  const variantIds = items.map((i) => i.variant_id)
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, product_id, price, inventory(quantity, reserved_quantity)')
    .in('id', variantIds)
    .eq('is_active', true)

  const variantMap = new Map(
    (variants ?? []).map((v) => {
      const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory
      return [v.id, {
        productId: v.product_id,
        price: v.price,
        available: Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0)),
      }]
    }),
  )

  // Get or create the user's cart
  const { data: existingCart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const cartId = existingCart
    ? existingCart.id
    : (await supabase.from('carts').insert({ user_id: user.id }).select('id').single()).data?.id

  if (!cartId) {
    return NextResponse.json({ error: 'Failed to prepare cart' }, { status: 500 })
  }

  // Merge quantities (take max, capped by stock) against the existing cart
  const { data: existingItems } = await supabase
    .from('cart_items')
    .select('variant_id, quantity')
    .eq('cart_id', cartId)

  const existingMap = new Map((existingItems ?? []).map((c) => [c.variant_id, c.quantity]))

  const upsertRows = items
    .filter((item) => variantMap.has(item.variant_id))
    .map((item) => {
      const info        = variantMap.get(item.variant_id)!
      const existingQty = existingMap.get(item.variant_id) ?? 0
      const desired     = Math.max(item.quantity, existingQty)
      return {
        cart_id:        cartId,
        product_id:     info.productId,
        variant_id:     item.variant_id,
        quantity:       Math.min(desired, info.available),
        price_snapshot: info.price,
      }
    })
    .filter((r) => r.quantity > 0)

  if (upsertRows.length === 0) {
    return NextResponse.json({ merged: 0 })
  }

  const { error } = await supabase
    .from('cart_items')
    .upsert(upsertRows, { onConflict: 'cart_id,variant_id', ignoreDuplicates: false })

  if (error) {
    return NextResponse.json({ error: 'Cart sync failed' }, { status: 500 })
  }

  return NextResponse.json({ merged: upsertRows.length })
}
