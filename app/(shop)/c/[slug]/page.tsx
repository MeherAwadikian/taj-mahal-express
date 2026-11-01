'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { createClient } from '@/lib/supabase/client'

const FREE_SHIP_THRESHOLD = 499
const PLACEHOLDER_IMAGE   = 'https://placehold.co/400x400/e5e7eb/9ca3af?text=No+Image'

async function fetchProductsByCategorySlug(slug: string): Promise<ProductCardData[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select(`
      id, slug, title, base_price, mrp, average_rating, review_count, is_cod_available,
      seller_profiles!inner(display_name, kyc_status),
      product_images(url, sort_order, is_primary),
      categories!inner(slug)
    `)
    .eq('status', 'active')
    .eq('categories.slug', slug)
    .limit(60)

  return (data ?? []).map((row) => {
    const seller  = Array.isArray(row.seller_profiles) ? row.seller_profiles[0] : row.seller_profiles
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
    } satisfies ProductCardData
  })
}

const SORT_OPTIONS = [
  { label: 'Relevance',         value: 'relevance' },
  { label: 'Price: Low to High',value: 'price_asc' },
  { label: 'Price: High to Low',value: 'price_desc' },
  { label: 'Avg. Rating',       value: 'rating' },
  { label: 'Newest First',      value: 'newest' },
]

const PRICE_RANGES = [
  { label: 'Under ₹500',       min: 0,      max: 500 },
  { label: '₹500 – ₹1,000',    min: 500,    max: 1000 },
  { label: '₹1,000 – ₹5,000',  min: 1000,   max: 5000 },
  { label: '₹5,000 – ₹20,000', min: 5000,   max: 20000 },
  { label: 'Above ₹20,000',    min: 20000,   max: Infinity },
]

const RATINGS = [4, 3, 2]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b pb-4">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold"
      >
        {title}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-1 space-y-2">{children}</div>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PLPPage() {
  const params = useParams()
  const slug   = (Array.isArray(params.slug) ? params.slug[0] : params.slug) ?? ''

  const [allProducts, setAllProducts] = useState<ProductCardData[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProductsByCategorySlug(slug)
      .then((products) => { if (!cancelled) setAllProducts(products) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  const [sort,        setSort]        = useState('relevance')
  const [priceRange,  setPriceRange]  = useState<number | null>(null)
  const [minRating,   setMinRating]   = useState<number | null>(null)
  const [freeShip,    setFreeShip]    = useState(false)
  const [codOnly,     setCodOnly]     = useState(false)
  const [verified,    setVerified]    = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [page,        setPage]        = useState(1)

  const PAGE_SIZE = 12

  const heading = slug
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  // Filter
  let filtered = allProducts
  if (priceRange !== null) {
    const range = PRICE_RANGES[priceRange]
    if (range) filtered = filtered.filter((p) => p.price >= range.min && p.price <= range.max)
  }
  if (minRating !== null) filtered = filtered.filter((p) => p.rating >= minRating)
  if (freeShip)  filtered = filtered.filter((p) => p.isFreeShip)
  if (codOnly)   filtered = filtered.filter((p) => p.isCod)
  if (verified)  filtered = filtered.filter((p) => p.isVerified)

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price_asc')  return a.price - b.price
    if (sort === 'price_desc') return b.price - a.price
    if (sort === 'rating')     return b.rating - a.rating
    return 0
  })

  const paginated = sorted.slice(0, page * PAGE_SIZE)
  const hasMore   = paginated.length < sorted.length

  const activeFilterCount = [
    priceRange !== null, minRating !== null, freeShip, codOnly, verified,
  ].filter(Boolean).length

  function clearAll() {
    setPriceRange(null); setMinRating(null); setFreeShip(false); setCodOnly(false); setVerified(false)
  }

  const FiltersPanel = () => (
    <div className="space-y-1">
      <FilterSection title="Price Range">
        {PRICE_RANGES.map((r, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="price"
              checked={priceRange === i}
              onChange={() => setPriceRange(priceRange === i ? null : i)}
              className="accent-saffron-600"
            />
            {r.label}
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Customer Rating">
        {RATINGS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="rating"
              checked={minRating === r}
              onChange={() => setMinRating(minRating === r ? null : r)}
              className="accent-saffron-600"
            />
            {r}★ & above
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Delivery">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={freeShip} onChange={(e) => setFreeShip(e.target.checked)} className="accent-saffron-600" />
          Free Delivery
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={codOnly}  onChange={(e) => setCodOnly(e.target.checked)}  className="accent-saffron-600" />
          Cash on Delivery
        </label>
      </FilterSection>

      <FilterSection title="Seller">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="accent-saffron-600" />
          Verified Sellers Only
        </label>
      </FilterSection>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold">{heading}</h1>
        <p className="text-sm text-muted-foreground">{sorted.length} products found</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden w-56 flex-none md:block">
          <div className="sticky top-20">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-sm">Filters</span>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="flex items-center gap-1 text-xs text-saffron-600 hover:underline">
                  <X className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
            <FiltersPanel />
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex items-center gap-3">
            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters {activeFilterCount > 0 && <span className="rounded-full bg-saffron-600 px-1.5 text-xs text-white">{activeFilterCount}</span>}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-muted-foreground">Sort:</label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <p className="py-20 text-center text-sm text-muted-foreground">Loading products…</p>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <p className="text-lg font-semibold">No products found</p>
              <p className="text-sm text-muted-foreground">
                {allProducts.length === 0 ? 'This category has no products yet' : 'Try adjusting your filters'}
              </p>
              {allProducts.length > 0 && (
                <Button variant="outline" onClick={clearAll}>Clear filters</Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {paginated.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Load more products
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative ml-auto flex w-72 flex-col bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="font-bold">Filters</span>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <FiltersPanel />
            </div>
            <div className="border-t p-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearAll}>Clear</Button>
              <Button className="flex-1" onClick={() => setMobileFiltersOpen(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
