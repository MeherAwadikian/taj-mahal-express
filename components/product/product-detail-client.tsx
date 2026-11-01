'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, Truck, RotateCcw, ChevronRight, Minus, Plus, Heart, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/components/product/rating-stars'
import { PriceDisplay } from '@/components/product/price-display'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'
import { cn } from '@/lib/utils/cn'
import type { ProductDetail, ProductReview } from '@/lib/data/shop'

interface ProductDetailClientProps {
  product: ProductDetail
  reviews: ProductReview[]
  similar: ProductCardData[]
}

export function ProductDetailClient({ product, reviews, similar }: ProductDetailClientProps) {
  const { title, brand, description, images, rating, reviewCount, variants, seller, category, isCodAvailable, returnPolicyDays } = product

  // Union of every option key/value present across variants, in first-seen order.
  const optionGroups = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.options)) {
        const values = groups.get(key) ?? []
        if (!values.includes(value)) values.push(value)
        groups.set(key, values)
      }
    }
    return groups
  }, [variants])

  const firstVariant = variants[0]
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(firstVariant?.options ?? {})
  const [activeImage,  setActiveImage]  = useState(0)
  const [qty,          setQty]          = useState(1)
  const [wishlisted,   setWishlisted]   = useState(false)
  const [activeTab,    setActiveTab]    = useState<'desc' | 'reviews'>('desc')

  const selectedVariant = useMemo(() => {
    const exact = variants.find((v) =>
      Object.entries(selectedOptions).every(([k, val]) => v.options[k] === val),
    )
    return exact ?? firstVariant
  }, [variants, selectedOptions, firstVariant])

  if (!selectedVariant) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        This product currently has no purchasable variants.
      </div>
    )
  }

  const inStock = selectedVariant.availableQty > 0
  const maxQty  = Math.min(10, selectedVariant.availableQty || 1)

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        {category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/c/${category.slug}`} className="hover:text-foreground">{category.name}</Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground line-clamp-1">{title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_300px]">
        {/* Gallery */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  'h-16 w-16 flex-none overflow-hidden rounded-lg border-2 transition-colors',
                  activeImage === i ? 'border-saffron-500' : 'border-border',
                )}
              >
                <Image src={src} alt={`View ${i + 1}`} width={64} height={64} className="object-cover" />
              </button>
            ))}
          </div>
          <div className="relative flex-1 aspect-square overflow-hidden rounded-xl border bg-muted">
            <Image
              src={images[activeImage] ?? images[0]!}
              alt={title}
              fill
              className="object-contain p-4"
              priority
            />
            <button
              onClick={() => setWishlisted((p) => !p)}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow"
            >
              <Heart className={cn('h-5 w-5', wishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
            </button>
          </div>
        </div>

        {/* Product info */}
        <div className="space-y-4">
          <div>
            {brand && <p className="text-xs font-semibold uppercase text-saffron-600">{brand}</p>}
            <h1 className="mt-0.5 text-xl font-bold leading-snug">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <RatingStars rating={rating} count={reviewCount} size="md" />
          </div>

          <PriceDisplay price={selectedVariant.price} mrp={selectedVariant.mrp} size="xl" />

          {/* Variant option pickers */}
          {[...optionGroups.entries()].map(([key, values]) => (
            <div key={key}>
              <p className="mb-2 text-sm font-semibold capitalize">
                {key}: <span className="font-normal text-muted-foreground">{selectedOptions[key]}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                  <button
                    key={value}
                    onClick={() => setSelectedOptions((prev) => ({ ...prev, [key]: value }))}
                    className={cn(
                      'rounded-lg border-2 px-3 py-1.5 text-sm transition-colors',
                      selectedOptions[key] === value ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Qty */}
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold">Quantity:</p>
            <div className="flex items-center overflow-hidden rounded-lg border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="flex h-9 w-9 items-center justify-center disabled:opacity-40 hover:bg-muted"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="flex h-9 w-9 items-center justify-center disabled:opacity-40 hover:bg-muted"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {!inStock ? (
              <p className="text-xs font-medium text-red-600">Out of stock</p>
            ) : selectedVariant.availableQty <= 20 && (
              <p className="text-xs font-medium text-red-600">Only {selectedVariant.availableQty} left!</p>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-3">
            <Button size="lg" variant="outline" disabled={!inStock} className="flex-1 border-saffron-500 text-saffron-600 hover:bg-saffron-50">
              Add to Cart
            </Button>
            <Button size="lg" variant="saffron" disabled={!inStock} className="flex-1">
              Buy Now
            </Button>
          </div>

          {/* Delivery info */}
          <div className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
            <p className="flex items-center gap-2 text-green-700">
              <Truck className="h-4 w-4" /> Delivered across India
            </p>
            {isCodAvailable && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <span className="rounded border px-1 text-xs">COD</span> Cash on delivery available
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4" /> {returnPolicyDays}-day easy returns
            </p>
          </div>
        </div>

        {/* Seller card */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sold by</p>
            <Link href={`/seller/${seller.slug}`} className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-saffron-100 text-lg font-bold text-saffron-700">
                {seller.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm group-hover:text-saffron-600 transition-colors">{seller.name}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  {seller.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                  <span className="text-xs text-muted-foreground">
                    {seller.isVerified ? 'Verified Seller · ' : ''}
                    ★ {seller.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
            <Button variant="outline" size="sm" className="mt-3 w-full text-xs" asChild>
              <Link href={`/seller/${seller.slug}`}>Visit Store</Link>
            </Button>
          </div>

          <button className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-4 w-4" /> Share this product
          </button>
        </div>
      </div>

      {/* Tabs: Description / Reviews */}
      <div className="mt-10">
        <div className="flex border-b">
          {(['desc', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-saffron-600 text-saffron-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'desc' ? 'Description' : `Reviews (${reviewCount.toLocaleString('en-IN')})`}
            </button>
          ))}
        </div>

        {activeTab === 'desc' && (
          <div className="py-6 max-w-2xl">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {description || 'No description provided by the seller yet.'}
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="py-6 space-y-5 max-w-2xl">
            {reviews.length === 0 && (
              <p className="text-sm text-muted-foreground">No reviews yet — be the first to buy and review.</p>
            )}
            {reviews.map((r) => (
              <div key={r.id} className="border-b pb-5 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.userName}</p>
                    <RatingStars rating={r.rating} showCount={false} size="sm" className="mt-0.5" />
                  </div>
                  <span className="text-xs text-muted-foreground flex-none">{r.date}</span>
                </div>
                {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.helpfulCount} people found this helpful
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar products */}
      {similar.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Similar Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
