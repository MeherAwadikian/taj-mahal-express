import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const cartItemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity:   z.number().int().min(1).max(100),
})

// carts.user_id is unique — one cart row per signed-in buyer.
async function getOrCreateCartId(supabase: SupabaseClient<Database>, userId: string) {
  const { data: existing } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single()

  if (error || !created) throw new Error('Failed to create cart')
  return created.id
}

// GET /api/cart — fetch authenticated user's cart
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cart) {
    return NextResponse.json({ data: [] })
  }

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id, quantity, price_snapshot,
      product_variants(
        id, title, price, mrp, is_active,
        inventory(quantity, reserved_quantity),
        products(id, slug, title, status,
          product_images(url, sort_order),
          seller_profiles(display_name, kyc_status)
        )
      )
    `)
    .eq('cart_id', cart.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/cart  — add or update item
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = cartItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })
  }

  const { variant_id, quantity } = parsed.data

  // Verify variant exists, is active, and has stock
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, product_id, price, is_active, inventory(quantity, reserved_quantity), products(status)')
    .eq('id', variant_id)
    .eq('is_active', true)
    .single()

  if (!variant) {
    return NextResponse.json({ error: 'Product variant not found' }, { status: 404 })
  }

  const inventory  = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory
  const available  = (inventory?.quantity ?? 0) - (inventory?.reserved_quantity ?? 0)
  if (available < quantity) {
    return NextResponse.json(
      { error: `Only ${available} unit(s) available` },
      { status: 409 },
    )
  }

  let cartId: string
  try {
    cartId = await getOrCreateCartId(supabase, user.id)
  } catch {
    return NextResponse.json({ error: 'Failed to prepare cart' }, { status: 500 })
  }

  // Upsert cart item
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      {
        cart_id: cartId,
        product_id: variant.product_id,
        variant_id,
        quantity,
        price_snapshot: variant.price,
      },
      { onConflict: 'cart_id,variant_id', ignoreDuplicates: false },
    )
    .select('id, quantity')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// DELETE /api/cart  — remove item
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const variantId = req.nextUrl.searchParams.get('variant_id')
  if (!variantId) {
    return NextResponse.json({ error: 'variant_id required' }, { status: 422 })
  }

  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (cart) {
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('variant_id', variantId)
  }

  return new NextResponse(null, { status: 204 })
}
