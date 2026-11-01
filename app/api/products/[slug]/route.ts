import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { productUpdateSchema } from '@/lib/validation/product'
import { requireSeller } from '@/lib/auth/require-role'
import { stripUndefined } from '@/lib/utils/object'

// GET /api/products/[slug]
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      seller_profiles(
        id, display_name, kyc_status, total_rating, total_reviews
      ),
      product_images(id, url, alt_text, sort_order),
      product_variants(
        id, title, sku, options, price, mrp, is_active, sort_order,
        inventory(quantity, reserved_quantity)
      ),
      categories(id, name, slug, parent_id)
    `)
    .eq('slug', params.slug)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Available stock (inventory is a 1:1 join, returned as an array by PostgREST)
  const productWithStock = {
    ...data,
    product_variants: data.product_variants?.map((v) => {
      const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory
      return {
        ...v,
        available_qty: Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0)),
      }
    }),
  }

  return NextResponse.json({ data: productWithStock })
}

// PATCH /api/products/[slug]  (seller who owns it only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const auth = await requireSeller()
  if (!auth.user) return auth.error

  const supabase = await createClient()

  // Confirm ownership
  const { data: product } = await supabase
    .from('products')
    .select('id, seller_profiles!inner(user_id)')
    .eq('slug', params.slug)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const sellers = product.seller_profiles as unknown as { user_id: string }[]
  const seller  = Array.isArray(sellers) ? sellers[0] : (sellers as { user_id: string } | undefined)
  if (!seller || seller.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = productUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data: updated, error } = await supabase
    .from('products')
    .update(stripUndefined(parsed.data))
    .eq('id', product.id)
    .select('id, slug, status')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}

// DELETE /api/products/[slug]  (seller only — soft delete via status)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const auth = await requireSeller()
  if (!auth.user) return auth.error

  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('id, seller_profiles!inner(user_id)')
    .eq('slug', params.slug)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const sellers = product.seller_profiles as unknown as { user_id: string }[]
  const seller  = Array.isArray(sellers) ? sellers[0] : (sellers as { user_id: string } | undefined)
  if (!seller || seller.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Schema's products.status CHECK constraint has no 'archived' value — 'paused' is the closest
  // equivalent (seller-initiated removal from listings without deleting order history references).
  await supabase.from('products').update({ status: 'paused' }).eq('id', product.id)

  return new NextResponse(null, { status: 204 })
}
