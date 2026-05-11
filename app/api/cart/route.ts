import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const cartItemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity:   z.number().int().min(1).max(100),
})

// GET /api/cart — fetch authenticated user's cart
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id, quantity,
      product_variants(
        id, title, price, mrp, quantity, reserved_quantity,
        products(id, slug, title, status,
          product_images(url, sort_order),
          seller_profiles(display_name, is_verified)
        )
      )
    `)
    .eq('user_id', user.id)
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

  // Verify variant exists and has stock
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, quantity, reserved_quantity, products(status)')
    .eq('id', variant_id)
    .eq('is_active', true)
    .single()

  if (!variant) {
    return NextResponse.json({ error: 'Product variant not found' }, { status: 404 })
  }

  const available = (variant.quantity ?? 0) - (variant.reserved_quantity ?? 0)
  if (available < quantity) {
    return NextResponse.json(
      { error: `Only ${available} unit(s) available` },
      { status: 409 },
    )
  }

  // Upsert cart item
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(
      { user_id: user.id, variant_id, quantity },
      { onConflict: 'user_id,variant_id', ignoreDuplicates: false },
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

  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
    .eq('variant_id', variantId)

  return new NextResponse(null, { status: 204 })
}
