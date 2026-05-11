import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { limiters, checkRateLimit } from '@/lib/rate-limit'
import { productCreateSchema } from '@/lib/validation/product'
import { requireSeller } from '@/lib/auth/require-role'
import { paginationSchema } from '@/lib/validation/common'

const listQuerySchema = paginationSchema.extend({
  q:        z.string().max(200).optional(),
  category: z.string().uuid().optional(),
  min:      z.coerce.number().min(0).optional(),
  max:      z.coerce.number().min(0).optional(),
  sort:     z.enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest']).default('relevance'),
})

// GET /api/products — search / list products
export async function GET(req: NextRequest) {
  const params   = Object.fromEntries(req.nextUrl.searchParams)
  const parsed   = listQuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 })
  }

  const { q, category, min, max, sort, page, limit } = parsed.data
  const offset = (page - 1) * limit

  const supabase = await createClient()
  let query = supabase
    .from('products')
    .select(`
      id, slug, title, base_price, mrp, rating_avg, rating_count, status,
      seller_profiles!inner(display_name, is_verified),
      product_images(url, sort_order)
    `, { count: 'exact' })
    .eq('status', 'active')
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.textSearch('search_vector', q, { config: 'english', type: 'websearch' })
  }
  if (category) query = query.eq('category_id', category)
  if (min !== undefined) query = query.gte('base_price', min)
  if (max !== undefined) query = query.lte('base_price', max)

  switch (sort) {
    case 'price_asc':  query = query.order('base_price', { ascending: true }); break
    case 'price_desc': query = query.order('base_price', { ascending: false }); break
    case 'rating':     query = query.order('rating_avg', { ascending: false }); break
    case 'newest':     query = query.order('created_at', { ascending: false }); break
    default:           query = q ? query : query.order('rating_count', { ascending: false }); break
  }

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

  return NextResponse.json({
    data,
    meta: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  })
}

// POST /api/products — create product (seller only)
export async function POST(req: NextRequest) {
  const auth = await requireSeller()
  if (!auth.user) return auth.error

  const limited = await checkRateLimit(limiters.productCreate, auth.user.id)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = productCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const supabase = await createClient()

  // Verify seller profile exists
  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('id, status')
    .eq('user_id', auth.user.id)
    .single()

  if (!seller || seller.status !== 'active') {
    return NextResponse.json({ error: 'Seller account not active' }, { status: 403 })
  }

  const { variants, ...productData } = parsed.data

  // Auto-generate slug from title if not provided
  const slug = productData.slug ?? productData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    + '-' + Date.now().toString(36)

  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...productData, slug, seller_profile_id: seller.id, status: 'pending_review' })
    .select('id, slug')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }

  // Insert variants
  if (variants.length > 0) {
    const variantRows = variants.map((v) => ({ ...v, product_id: product.id }))
    const { error: variantError } = await supabase.from('product_variants').insert(variantRows)
    if (variantError) {
      // Roll back product on variant failure
      await supabase.from('products').delete().eq('id', product.id)
      return NextResponse.json({ error: 'Failed to create product variants' }, { status: 500 })
    }
  }

  return NextResponse.json({ data: product }, { status: 201 })
}
