import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Zap, Star } from 'lucide-react'
import { ProductCard, type ProductCardData } from '@/components/product/product-card'
import { DealCard } from '@/components/product/deal-card'
import { TrustBadges } from '@/components/layout/trust-badges'
import { CategoryNav } from '@/components/layout/category-nav'

// ─── Mock data ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Mobiles',       slug: 'mobiles',      emoji: '📱', bg: 'bg-blue-50' },
  { label: 'Fashion',       slug: 'fashion',      emoji: '👗', bg: 'bg-pink-50' },
  { label: 'Home & Kitchen',slug: 'home-kitchen', emoji: '🏠', bg: 'bg-yellow-50' },
  { label: 'Beauty',        slug: 'beauty',       emoji: '💄', bg: 'bg-rose-50' },
  { label: 'Electronics',   slug: 'electronics',  emoji: '💻', bg: 'bg-indigo-50' },
  { label: 'Sports',        slug: 'sports',       emoji: '🏏', bg: 'bg-green-50' },
  { label: 'Grocery',       slug: 'grocery',      emoji: '🛒', bg: 'bg-orange-50' },
  { label: 'Books',         slug: 'books',        emoji: '📚', bg: 'bg-amber-50' },
]

const FLASH_DEALS: {
  id: string; slug: string; title: string; imageUrl: string
  price: number; mrp: number; endsAt: Date; stockLeft: number
}[] = [
  { id: '1', slug: 'realme-narzo-n65-5g', title: 'Realme Narzo N65 5G 128GB', imageUrl: 'https://placehold.co/400x400/f97316/white?text=Phone',   price: 10999, mrp: 14999, endsAt: new Date(Date.now() + 5 * 3_600_000), stockLeft: 23 },
  { id: '2', slug: 'prestige-iris-750w',  title: 'Prestige Iris 750W Mixer Grinder', imageUrl: 'https://placehold.co/400x400/6366f1/white?text=Mixer', price:  2799, mrp:  4999, endsAt: new Date(Date.now() + 3 * 3_600_000), stockLeft: 41 },
  { id: '3', slug: 'puma-one8-tshirt',    title: 'Puma One8 Virat Kohli T-Shirt', imageUrl: 'https://placehold.co/400x400/10b981/white?text=Tshirt',  price:   799, mrp:  1999, endsAt: new Date(Date.now() + 7 * 3_600_000), stockLeft: 67 },
  { id: '4', slug: 'boat-airdopes-141',   title: 'boAt Airdopes 141 TWS Earbuds', imageUrl: 'https://placehold.co/400x400/f59e0b/white?text=Buds',   price:   999, mrp:  3990, endsAt: new Date(Date.now() + 2 * 3_600_000), stockLeft: 18 },
]

const TRENDING_PRODUCTS: ProductCardData[] = [
  { id: 't1', slug: 'samsung-galaxy-f55', title: 'Samsung Galaxy F55 5G 8/128GB Icy Blue', imageUrl: 'https://placehold.co/400x400/3b82f6/white?text=Samsung', price: 26999, mrp: 30999, rating: 4.3, reviewCount: 1842, sellerName: 'Samsung Official', isCod: true, isFreeShip: true, isVerified: true, badge: 'Best Seller' },
  { id: 't2', slug: 'kanjivaram-silk-saree', title: 'Pure Kanjivaram Silk Saree with Zari Border', imageUrl: 'https://placehold.co/400x400/ec4899/white?text=Saree', price: 4499, mrp: 8999, rating: 4.7, reviewCount: 523, sellerName: 'Silk House Chennai', isCod: false, isFreeShip: true, isVerified: true, badge: 'Deal of Day' },
  { id: 't3', slug: 'instant-pot-duo-3l', title: 'Instant Pot Duo 3L 7-in-1 Electric Pressure Cooker', imageUrl: 'https://placehold.co/400x400/8b5cf6/white?text=InstantPot', price: 5999, mrp: 9999, rating: 4.5, reviewCount: 3204, sellerName: 'Kitchen Pro', isCod: true, isFreeShip: true, isVerified: true },
  { id: 't4', slug: 'lakme-absolute-foundation', title: "Lakmé Absolute Skin Natural Mousse Foundation SPF 8", imageUrl: 'https://placehold.co/400x400/f43f5e/white?text=Lakme', price: 549, mrp: 999, rating: 4.2, reviewCount: 7810, sellerName: 'Beauty Central', isCod: true, isFreeShip: false, isVerified: true, badge: 'New' },
  { id: 't5', slug: 'himalaya-face-wash', title: 'Himalaya Purifying Neem Face Wash 150ml', imageUrl: 'https://placehold.co/400x400/22c55e/white?text=Himalaya', price: 149, mrp: 175, rating: 4.4, reviewCount: 52441, sellerName: 'Himalaya Direct', isCod: true, isFreeShip: false, isVerified: true },
  { id: 't6', slug: 'atomic-habits-book', title: 'Atomic Habits by James Clear (Paperback)', imageUrl: 'https://placehold.co/400x400/f97316/white?text=Book', price: 299, mrp: 499, rating: 4.8, reviewCount: 18923, sellerName: 'BookWala', isCod: true, isFreeShip: true, isVerified: false },
  { id: 't7', slug: 'wildcraft-backpack-30l', title: 'Wildcraft 30L Laptop Backpack Waterproof', imageUrl: 'https://placehold.co/400x400/0ea5e9/white?text=Bag', price: 1299, mrp: 2499, rating: 4.1, reviewCount: 2103, sellerName: 'Wildcraft Store', isCod: true, isFreeShip: true, isVerified: true },
  { id: 't8', slug: 'philips-trimmer-bt3231', title: 'Philips BT3231 Beard Trimmer 13 Length Settings', imageUrl: 'https://placehold.co/400x400/6366f1/white?text=Trimmer', price: 799, mrp: 1495, rating: 4.3, reviewCount: 9342, sellerName: 'Philips India', isCod: false, isFreeShip: true, isVerified: true },
]

const SELLER_SPOTLIGHTS = [
  { name: 'Silk House Chennai', desc: 'Authentic handloom sarees', rating: 4.9, products: 340, slug: 'silk-house-chennai' },
  { name: 'TechZone Mumbai',    desc: 'Latest gadgets & electronics', rating: 4.7, products: 1200, slug: 'techzone-mumbai' },
  { name: 'Organic Roots',      desc: 'Farm-to-table organic produce', rating: 4.8, products: 190, slug: 'organic-roots' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div>
      <CategoryNav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-saffron-600 to-saffron-700 text-white">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-saffron-100">
              India&apos;s trusted marketplace
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Shop Millions of Products<br />
              <span className="text-saffron-100">from Verified Sellers</span>
            </h1>
            <p className="mt-4 text-base text-saffron-50">
              From handloom sarees to the latest smartphones — all under one roof, delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/c/trending"
                className="rounded-lg bg-white px-6 py-3 font-semibold text-saffron-700 shadow transition hover:bg-saffron-50"
              >
                Shop Trending
              </Link>
              <Link
                href="/seller/register"
                className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Sell on TME
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-background [clip-path:ellipse(55%_100%_at_50%_100%)]" />
      </section>

      {/* Category grid */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="mb-5 text-lg font-bold">Shop by Category</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/c/${cat.slug}`}
              className="group flex flex-col items-center gap-2"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cat.bg} text-3xl transition-transform group-hover:scale-110`}>
                {cat.emoji}
              </div>
              <span className="text-center text-xs font-medium leading-tight">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      <section className="bg-muted/40 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 fill-saffron-500 text-saffron-500" />
              <h2 className="text-lg font-bold">Flash Deals</h2>
              <span className="rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                Limited time
              </span>
            </div>
            <Link
              href="/deals"
              className="flex items-center gap-1 text-sm font-medium text-saffron-600 hover:underline"
            >
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FLASH_DEALS.map((deal) => (
              <DealCard key={deal.id} {...deal} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Trending Now</h2>
          <Link
            href="/c/trending"
            className="flex items-center gap-1 text-sm font-medium text-saffron-600 hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {TRENDING_PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="container mx-auto px-4 pb-10">
        <TrustBadges />
      </section>

      {/* Seller spotlight */}
      <section className="bg-muted/40 py-10">
        <div className="container mx-auto px-4">
          <h2 className="mb-5 text-lg font-bold">Seller Spotlight</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SELLER_SPOTLIGHTS.map((s) => (
              <Link
                key={s.slug}
                href={`/seller/${s.slug}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-saffron-100 text-2xl font-bold text-saffron-700">
                  {s.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.desc}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{s.rating}</span>
                    <span className="text-muted-foreground">· {s.products.toLocaleString()} products</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Want to sell on Taj Mahal Express?{' '}
            <Link href="/seller/register" className="font-medium text-saffron-600 hover:underline">
              Register as a seller →
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
