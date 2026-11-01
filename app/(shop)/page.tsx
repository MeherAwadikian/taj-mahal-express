import Link from 'next/link'
import { ArrowRight, Zap, Star } from 'lucide-react'
import { ProductCard } from '@/components/product/product-card'
import { DealCard } from '@/components/product/deal-card'
import { TrustBadges } from '@/components/layout/trust-badges'
import { CategoryNav } from '@/components/layout/category-nav'
import {
  getTrendingProducts, getTopDiscountedProducts, getTopCategories, getSellerSpotlights,
} from '@/lib/data/shop'

// Emoji/background fallbacks for categories that don't set icon_name/image_url in the DB yet.
const CATEGORY_FALLBACK_EMOJI = '🛍️'
const CATEGORY_BG = 'bg-muted'

export const revalidate = 60

export default async function HomePage() {
  const [categories, flashDeals, trending, sellers] = await Promise.all([
    getTopCategories(8),
    getTopDiscountedProducts(4),
    getTrendingProducts(8),
    getSellerSpotlights(3),
  ])

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
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <h2 className="mb-5 text-lg font-bold">Shop by Category</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/c/${cat.slug}`}
                className="group flex flex-col items-center gap-2"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${CATEGORY_BG} text-3xl transition-transform group-hover:scale-110`}>
                  {cat.iconName ?? CATEGORY_FALLBACK_EMOJI}
                </div>
                <span className="text-center text-xs font-medium leading-tight">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Flash Deals */}
      {flashDeals.length > 0 && (
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
              {flashDeals.map((deal) => (
                <DealCard key={deal.id} {...deal} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Products */}
      {trending.length > 0 && (
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
            {trending.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Trust strip */}
      <section className="container mx-auto px-4 pb-10">
        <TrustBadges />
      </section>

      {/* Seller spotlight */}
      {sellers.length > 0 && (
        <section className="bg-muted/40 py-10">
          <div className="container mx-auto px-4">
            <h2 className="mb-5 text-lg font-bold">Seller Spotlight</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {sellers.map((s) => (
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
                    <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{s.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">· {s.productCount.toLocaleString()} reviews</span>
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
      )}
    </div>
  )
}
