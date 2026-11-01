import { createClient } from '@/lib/supabase/server'
import type { ProductCardData } from '@/components/product/product-card'

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/e5e7eb/9ca3af?text=No+Image'

// Real-world proxy for "free shipping": products above this price commonly ship free.
// The schema has no per-product shipping-cost flag, so this threshold stands in for one.
const FREE_SHIP_THRESHOLD = 499

type ProductImageRow = { url: string; sort_order: number; is_primary?: boolean }
type SellerRow = { display_name: string; kyc_status: string } | { display_name: string; kyc_status: string }[] | null

function firstOf<T>(v: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(v)) return v[0]
  return v ?? undefined
}

const PRODUCT_CARD_SELECT = `
  id, slug, title, base_price, mrp, average_rating, review_count, is_cod_available,
  seller_profiles!inner(display_name, kyc_status),
  product_images(url, sort_order, is_primary)
`

export function mapRowToCard(row: {
  id: string
  slug: string
  title: string
  base_price: number
  mrp: number
  average_rating: number | null
  review_count: number | null
  is_cod_available: boolean
  seller_profiles: SellerRow
  product_images: ProductImageRow[] | null
}): ProductCardData {
  const seller  = firstOf(row.seller_profiles)
  const images  = row.product_images ?? []
  const primary = images.find((i) => i.is_primary) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0]

  return {
    id:          row.id,
    slug:        row.slug,
    title:       row.title,
    imageUrl:    primary?.url ?? PLACEHOLDER_IMAGE,
    price:       Number(row.base_price),
    mrp:         Number(row.mrp),
    rating:      Number(row.average_rating ?? 0),
    reviewCount: row.review_count ?? 0,
    sellerName:  seller?.display_name ?? 'Marketplace Seller',
    isCod:       row.is_cod_available,
    isFreeShip:  Number(row.base_price) >= FREE_SHIP_THRESHOLD,
    isVerified:  seller?.kyc_status === 'approved',
  }
}

export async function getTrendingProducts(limit = 8): Promise<ProductCardData[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_CARD_SELECT)
    .eq('status', 'active')
    .order('review_count', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapRowToCard)
}

export interface DealCardData {
  id: string; slug: string; title: string; imageUrl: string
  price: number; mrp: number; endsAt: Date; stockLeft?: number
}

export async function getTopDiscountedProducts(limit = 4): Promise<DealCardData[]> {
  const supabase = await createClient()
  // No dedicated "flash deal" table in the schema — approximate it with the
  // biggest current discounts among active products.
  const { data } = await supabase
    .from('products')
    .select(`
      id, slug, title, base_price, mrp,
      product_images(url, sort_order, is_primary),
      product_variants(inventory(quantity, reserved_quantity))
    `)
    .eq('status', 'active')
    .gt('mrp', 0)
    .limit(50)

  if (!data) return []

  const withDiscount = data
    .map((row) => {
      const images  = row.product_images ?? []
      const primary = images.find((i) => i.is_primary) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0]
      const discountPct = row.mrp > 0 ? (Number(row.mrp) - Number(row.base_price)) / Number(row.mrp) : 0
      const stockLeft = (row.product_variants ?? []).reduce((sum, v) => {
        const inv = firstOf(v.inventory)
        return sum + Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0))
      }, 0)
      return {
        id: row.id, slug: row.slug, title: row.title,
        imageUrl: primary?.url ?? PLACEHOLDER_IMAGE,
        price: Number(row.base_price), mrp: Number(row.mrp),
        discountPct, stockLeft,
      }
    })
    .filter((p) => p.discountPct > 0)
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, limit)

  // Countdown resets daily at midnight local server time — a display device,
  // not a claim that the discount itself is time-limited in the DB.
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  return withDiscount.map(({ discountPct: _discountPct, stockLeft, ...p }) => ({
    ...p,
    endsAt: endOfDay,
    ...(stockLeft > 0 ? { stockLeft } : {}),
  }))
}

export interface CategoryTileData {
  slug: string
  label: string
  iconName: string | null
  imageUrl: string | null
}

export async function getTopCategories(limit = 8): Promise<CategoryTileData[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('slug, name, icon_name, image_url')
    .eq('is_active', true)
    .eq('level', 0)
    .order('sort_order', { ascending: true })
    .limit(limit)

  return (data ?? []).map((c) => ({
    slug: c.slug, label: c.name, iconName: c.icon_name, imageUrl: c.image_url,
  }))
}

export interface SellerSpotlightData {
  slug: string
  name: string
  description: string | null
  rating: number
  productCount: number
}

export async function getSellerSpotlights(limit = 3): Promise<SellerSpotlightData[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seller_profiles')
    .select('slug, display_name, description, total_rating, total_reviews')
    .eq('is_active', true)
    .eq('kyc_status', 'approved')
    .order('total_rating', { ascending: false })
    .limit(limit)

  return (data ?? []).map((s) => ({
    slug: s.slug,
    name: s.display_name,
    description: s.description,
    rating: Number(s.total_rating ?? 0),
    productCount: s.total_reviews ?? 0,
  }))
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export async function getProductsByCategorySlug(slug: string, limit = 60): Promise<ProductCardData[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select(`${PRODUCT_CARD_SELECT}, categories!inner(slug)`)
    .eq('status', 'active')
    .eq('categories.slug', slug)
    .limit(limit)

  return (data ?? []).map(mapRowToCard)
}

export interface ProductDetailVariant {
  id: string
  title: string
  options: Record<string, string>
  price: number
  mrp: number
  isActive: boolean
  availableQty: number
}

export interface ProductDetail {
  id: string
  title: string
  brand: string | null
  description: string | null
  images: string[]
  rating: number
  reviewCount: number
  isCodAvailable: boolean
  returnPolicyDays: number
  variants: ProductDetailVariant[]
  seller: { name: string; slug: string; rating: number; isVerified: boolean }
  category: { name: string; slug: string } | null
  categoryId: string
}

export async function getProductDetailBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, title, brand, description, average_rating, review_count,
      is_cod_available, return_policy_days, category_id,
      seller_profiles!inner(display_name, slug, total_rating, kyc_status),
      product_images(url, sort_order, is_primary),
      product_variants(
        id, title, options, price, mrp, is_active, sort_order,
        inventory(quantity, reserved_quantity)
      ),
      categories(name, slug)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  const seller   = firstOf(data.seller_profiles)
  const category = firstOf(data.categories)
  const images   = [...(data.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.url)

  const variants: ProductDetailVariant[] = [...(data.product_variants ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => {
      const inv = firstOf(v.inventory)
      return {
        id: v.id,
        title: v.title,
        options: (v.options ?? {}) as Record<string, string>,
        price: Number(v.price),
        mrp: Number(v.mrp),
        isActive: v.is_active,
        availableQty: Math.max(0, (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0)),
      }
    })

  return {
    id: data.id,
    title: data.title,
    brand: data.brand,
    description: data.description,
    images: images.length > 0 ? images : [PLACEHOLDER_IMAGE],
    rating: Number(data.average_rating ?? 0),
    reviewCount: data.review_count ?? 0,
    isCodAvailable: data.is_cod_available,
    returnPolicyDays: data.return_policy_days,
    variants,
    seller: {
      name: seller?.display_name ?? 'Marketplace Seller',
      slug: (seller as { slug?: string } | undefined)?.slug ?? '',
      rating: Number((seller as { total_rating?: number } | undefined)?.total_rating ?? 0),
      isVerified: seller?.kyc_status === 'approved',
    },
    category: category ? { name: category.name, slug: category.slug } : null,
    categoryId: data.category_id,
  }
}

export async function getSimilarProducts(categoryId: string, excludeProductId: string, limit = 4): Promise<ProductCardData[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select(PRODUCT_CARD_SELECT)
    .eq('status', 'active')
    .eq('category_id', categoryId)
    .neq('id', excludeProductId)
    .limit(limit)

  return (data ?? []).map(mapRowToCard)
}

export interface ProductReview {
  id: string
  userName: string
  rating: number
  date: string
  title: string | null
  body: string | null
  helpfulCount: number
}

export async function getApprovedReviews(productId: string, limit = 10): Promise<ProductReview[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, title, body, helpful_count, created_at, users(full_name)')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => {
    const user = firstOf(r.users)
    return {
      id: r.id,
      userName: user?.full_name ?? 'Verified Buyer',
      rating: r.rating,
      date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      title: r.title,
      body: r.body,
      helpfulCount: r.helpful_count,
    }
  })
}
