'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'

interface ApiProductRow {
  id: string
  slug: string
  title: string
  base_price: number
  mrp: number
  average_rating: number | null
  review_count: number | null
  is_cod_available: boolean
  seller_profiles: { display_name: string; kyc_status: string } | { display_name: string; kyc_status: string }[]
  product_images: { url: string; sort_order: number }[]
}

function mapApiRowToCard(row: ApiProductRow): ProductCardData {
  const seller  = Array.isArray(row.seller_profiles) ? row.seller_profiles[0] : row.seller_profiles
  const primary = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]

  return {
    id:          row.id,
    slug:        row.slug,
    title:       row.title,
    imageUrl:    primary?.url ?? 'https://placehold.co/400x400/e5e7eb/9ca3af?text=No+Image',
    price:       Number(row.base_price),
    mrp:         Number(row.mrp),
    rating:      Number(row.average_rating ?? 0),
    reviewCount: row.review_count ?? 0,
    sellerName:  seller?.display_name ?? 'Marketplace Seller',
    isCod:       row.is_cod_available,
    isFreeShip:  Number(row.base_price) >= 499,
    isVerified:  seller?.kyc_status === 'approved',
  }
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">Loading…</div>}>
      <SearchResults />
    </Suspense>
  )
}

function SearchResults() {
  const params = useSearchParams()
  const q      = params.get('q') ?? ''

  const [products, setProducts] = useState<ProductCardData[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const url = q ? `/api/products?q=${encodeURIComponent(q)}` : '/api/products'
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setProducts([])
        } else {
          setProducts((json.data ?? []).map(mapApiRowToCard))
        }
      })
      .catch(() => { if (!cancelled) setError('Failed to load search results') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [q])

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-1 text-xl font-bold">Search results for &ldquo;{q}&rdquo;</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        {loading ? 'Searching…' : `${products.length} products found`}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No products matched your search.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
