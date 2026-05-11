'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, Truck, RotateCcw, ChevronRight, Minus, Plus, Heart, Share2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RatingStars } from '@/components/product/rating-stars'
import { PriceDisplay } from '@/components/product/price-display'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'
import { cn } from '@/lib/utils/cn'

// ─── Mock product ─────────────────────────────────────────────────────────────

const PRODUCT = {
  id: 'p1',
  title: 'Samsung Galaxy F55 5G 8GB RAM 128GB Storage',
  brand: 'Samsung',
  description: `The Galaxy F55 5G packs a stunning 6.7-inch Super AMOLED display, powered by Snapdragon 7 Gen 1 processor. Capture life in detail with a 50MP OIS main camera, and stay connected all day with the 5000mAh battery.\n\n• Super AMOLED FHD+ display at 120Hz\n• 50MP OIS main camera + 8MP ultra-wide + 5MP macro\n• 5000mAh battery with 25W fast charging\n• Expandable storage up to 1TB\n• IP67 water resistance`,
  images: [
    'https://placehold.co/600x600/3b82f6/white?text=Front',
    'https://placehold.co/600x600/1d4ed8/white?text=Back',
    'https://placehold.co/600x600/1e40af/white?text=Side',
    'https://placehold.co/600x600/1e3a8a/white?text=Detail',
  ],
  price: 26999,
  mrp:   30999,
  rating: 4.3,
  reviewCount: 1842,
  seller: { name: 'Samsung Official Store', slug: 'samsung-official', rating: 4.8, isVerified: true },
  isCod: true,
  isFreeShip: true,
  deliveryDate: 'Monday, 13 May',
  variants: {
    color: ['Icy Blue', 'Blueberry Black', 'Lilac Purple'],
    storage: ['128GB', '256GB'],
  },
  inStock: true,
  stockLeft: 34,
}

const REVIEWS = [
  { id: 'r1', user: 'Priya M.', rating: 5, date: '2 days ago', title: 'Excellent camera quality!', body: 'The night mode shots are incredible. Battery life is great — easily lasts a full day.', helpful: 23 },
  { id: 'r2', user: 'Rahul K.', rating: 4, date: '1 week ago', title: 'Great phone, minor issues', body: 'The display is gorgeous and performance is smooth. Charging brick not included in box though.', helpful: 11 },
  { id: 'r3', user: 'Ananya S.', rating: 4, date: '2 weeks ago', title: 'Value for money', body: 'Compared to competitors in this range, Samsung wins on display quality. Very satisfied with the purchase.', helpful: 8 },
]

const SIMILAR: ProductCardData[] = [
  { id: 's1', slug: 'realme-narzo-n65', title: 'Realme Narzo N65 5G 6GB 128GB', imageUrl: 'https://placehold.co/400x400/f97316/white?text=Realme', price: 10999, mrp: 14999, rating: 4.1, reviewCount: 892, sellerName: 'Realme India', isCod: true, isFreeShip: true, isVerified: true },
  { id: 's2', slug: 'redmi-note-13-pro', title: 'Redmi Note 13 Pro 5G 8GB 256GB', imageUrl: 'https://placehold.co/400x400/ef4444/white?text=Redmi', price: 24999, mrp: 27999, rating: 4.4, reviewCount: 3241, sellerName: 'Xiaomi India', isCod: false, isFreeShip: true, isVerified: true, badge: 'Best Seller' },
  { id: 's3', slug: 'vivo-v30e-5g', title: 'Vivo V30e 5G 8GB 128GB', imageUrl: 'https://placehold.co/400x400/8b5cf6/white?text=Vivo', price: 22999, mrp: 26999, rating: 4.2, reviewCount: 612, sellerName: 'Vivo Official', isCod: true, isFreeShip: true, isVerified: true },
  { id: 's4', slug: 'oneplus-nord-ce4', title: 'OnePlus Nord CE4 8GB 256GB', imageUrl: 'https://placehold.co/400x400/10b981/white?text=OnePlus', price: 23999, mrp: 27999, rating: 4.5, reviewCount: 2108, sellerName: 'OnePlus India', isCod: true, isFreeShip: true, isVerified: true, badge: 'New' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PDPPage() {
  const [activeImage,   setActiveImage]   = useState(0)
  const [selectedColor,   setSelectedColor]   = useState(0)
  const [selectedStorage, setSelectedStorage] = useState(0)
  const [qty,           setQty]           = useState(1)
  const [wishlisted,    setWishlisted]    = useState(false)
  const [activeTab,     setActiveTab]     = useState<'desc' | 'reviews'>('desc')

  const { variants, images, price, mrp, rating, reviewCount, title } = PRODUCT

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/c/electronics" className="hover:text-foreground">Electronics</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/c/mobiles" className="hover:text-foreground">Mobiles</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground line-clamp-1">{title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_300px]">
        {/* Gallery */}
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            {images.map((src, i) => (
              <button
                key={i}
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
            <p className="text-xs font-semibold uppercase text-saffron-600">{PRODUCT.brand}</p>
            <h1 className="mt-0.5 text-xl font-bold leading-snug">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <RatingStars rating={rating} count={reviewCount} size="md" />
          </div>

          <PriceDisplay price={price} mrp={mrp} size="xl" />

          {/* Color */}
          <div>
            <p className="mb-2 text-sm font-semibold">
              Color: <span className="font-normal text-muted-foreground">{variants.color[selectedColor]}</span>
            </p>
            <div className="flex gap-2">
              {variants.color.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(i)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-1.5 text-sm transition-colors',
                    selectedColor === i ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-border hover:border-muted-foreground',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Storage */}
          <div>
            <p className="mb-2 text-sm font-semibold">
              Storage: <span className="font-normal text-muted-foreground">{variants.storage[selectedStorage]}</span>
            </p>
            <div className="flex gap-2">
              {variants.storage.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setSelectedStorage(i)}
                  className={cn(
                    'rounded-lg border-2 px-3 py-1.5 text-sm transition-colors',
                    selectedStorage === i ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-border hover:border-muted-foreground',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

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
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                disabled={qty >= 10}
                className="flex h-9 w-9 items-center justify-center disabled:opacity-40 hover:bg-muted"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {PRODUCT.stockLeft <= 20 && (
              <p className="text-xs text-red-600 font-medium">Only {PRODUCT.stockLeft} left!</p>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-3">
            <Button size="lg" variant="outline" className="flex-1 border-saffron-500 text-saffron-600 hover:bg-saffron-50">
              Add to Cart
            </Button>
            <Button size="lg" variant="saffron" className="flex-1">
              Buy Now
            </Button>
          </div>

          {/* Delivery info */}
          <div className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
            {PRODUCT.isFreeShip && (
              <p className="flex items-center gap-2 text-green-700">
                <Truck className="h-4 w-4" /> Free delivery by <span className="font-semibold">{PRODUCT.deliveryDate}</span>
              </p>
            )}
            {PRODUCT.isCod && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <span className="rounded border px-1 text-xs">COD</span> Cash on delivery available
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <RotateCcw className="h-4 w-4" /> 10-day easy returns
            </p>
          </div>
        </div>

        {/* Seller card */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sold by</p>
            <Link href={`/seller/${PRODUCT.seller.slug}`} className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-saffron-100 text-lg font-bold text-saffron-700">
                {PRODUCT.seller.name[0]}
              </div>
              <div>
                <p className="font-semibold text-sm group-hover:text-saffron-600 transition-colors">{PRODUCT.seller.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {PRODUCT.seller.isVerified && <ShieldCheck className="h-3.5 w-3.5 text-green-600" />}
                  <span className="text-xs text-muted-foreground">
                    {PRODUCT.seller.isVerified ? 'Verified Seller · ' : ''}
                    ★ {PRODUCT.seller.rating}
                  </span>
                </div>
              </div>
            </Link>
            <Button variant="outline" size="sm" className="mt-3 w-full text-xs" asChild>
              <Link href={`/seller/${PRODUCT.seller.slug}`}>Visit Store</Link>
            </Button>
          </div>

          {/* Share */}
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
              {PRODUCT.description}
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="py-6 space-y-5 max-w-2xl">
            {REVIEWS.map((r) => (
              <div key={r.id} className="border-b pb-5 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.user}</p>
                    <RatingStars rating={r.rating} showCount={false} size="sm" className="mt-0.5" />
                  </div>
                  <span className="text-xs text-muted-foreground flex-none">{r.date}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{r.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.helpful} people found this helpful
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar products */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-bold">Similar Products</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SIMILAR.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
