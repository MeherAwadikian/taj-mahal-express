'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: ProductCardData[] = Array.from({ length: 24 }, (_, i) => ({
  id:          String(i + 1),
  slug:        `product-${i + 1}`,
  title:       ['Samsung Galaxy F55 5G 8GB', 'boAt Airdopes 141 TWS Earbuds', 'Puma Men Running Shoes', 'Himalaya Neem Face Wash 150ml', 'Prestige Mixer Grinder 750W', 'Lakme Absolute Foundation SPF8', 'Wildcraft 30L Backpack', 'Atomic Habits Paperback', 'Philips Beard Trimmer BT3231', 'Kanjivaram Silk Saree'][i % 10] + (i >= 10 ? ` v${Math.ceil((i + 1) / 10)}` : ''),
  imageUrl:    `https://placehold.co/400x400/${['3b82f6','f97316','10b981','6366f1','f43f5e','8b5cf6','ec4899','f59e0b','0ea5e9','22c55e'][i % 10]}/white?text=P${i + 1}`,
  price:       [26999, 999, 2799, 149, 2799, 549, 1299, 299, 799, 4499][i % 10],
  mrp:         [30999, 3990, 4999, 175, 4999, 999, 2499, 499, 1495, 8999][i % 10],
  rating:      3.5 + (i % 15) * 0.1,
  reviewCount: (i + 1) * 123,
  sellerName:  ['Samsung Official', 'boAt Store', 'Puma India', 'Himalaya Direct', 'Prestige', 'Lakmé', 'Wildcraft', 'BookWala', 'Philips India', 'Silk House'][i % 10],
  isCod:       i % 3 !== 0,
  isFreeShip:  i % 2 === 0,
  isVerified:  i % 5 !== 4,
  badge:       i % 7 === 0 ? 'Best Seller' : i % 11 === 0 ? 'New' : undefined,
}))

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
  const slug   = Array.isArray(params.slug) ? params.slug[0] : (params.slug ?? '')

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
  let filtered = MOCK_PRODUCTS
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
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <p className="text-lg font-semibold">No products found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              <Button variant="outline" onClick={clearAll}>Clear filters</Button>
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
