'use client'

import { useSearchParams } from 'next/navigation'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'

const MOCK: ProductCardData[] = Array.from({ length: 12 }, (_, i) => ({
  id:          String(i + 1),
  slug:        `search-result-${i + 1}`,
  title:       `Search result product ${i + 1}`,
  imageUrl:    `https://placehold.co/400x400/6366f1/white?text=R${i + 1}`,
  price:       999 + i * 500,
  mrp:         1499 + i * 600,
  rating:      3.8 + (i % 10) * 0.12,
  reviewCount: 100 + i * 37,
  sellerName:  'Verified Seller',
  isCod:       i % 2 === 0,
  isFreeShip:  i % 3 !== 0,
  isVerified:  true,
}))

export default function SearchPage() {
  const params = useSearchParams()
  const q      = params.get('q') ?? ''

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-1 text-xl font-bold">Search results for &ldquo;{q}&rdquo;</h1>
      <p className="mb-5 text-sm text-muted-foreground">{MOCK.length} products found</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {MOCK.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
