import Image from 'next/image'
import Link from 'next/link'
import { ShieldCheck, Truck, Heart } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RatingStars } from './rating-stars'
import { PriceDisplay } from './price-display'

export interface ProductCardData {
  id:          string
  slug:        string
  title:       string
  imageUrl:    string
  price:       number
  mrp:         number
  rating:      number
  reviewCount: number
  sellerName:  string
  isCod:       boolean
  isFreeShip:  boolean
  isVerified:  boolean
  badge?:      string     // 'Best Seller' | 'New' | 'Deal of Day'
}

interface ProductCardProps {
  product: ProductCardData
  className?: string
  onWishlist?: (id: string) => void
  wishlisted?: boolean
}

export function ProductCard({ product, className, onWishlist, wishlisted }: ProductCardProps) {
  const {
    slug, title, imageUrl, price, mrp,
    rating, reviewCount, sellerName,
    isCod, isFreeShip, isVerified, badge,
  } = product

  return (
    <article className={cn(
      'group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-shadow hover:shadow-card-md',
      className,
    )}>
      {/* Image */}
      <Link href={`/p/${slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badge overlay */}
        {badge && (
          <span className="absolute left-2 top-2 rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-semibold text-white">
            {badge}
          </span>
        )}

        {/* Wishlist button */}
        <button
          onClick={e => { e.preventDefault(); onWishlist?.(product.id) }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={cn(
            'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-opacity',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
          )}
        >
          <Heart className={cn('h-4 w-4', wishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
        </button>
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Title */}
        <Link href={`/p/${slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-saffron-600">
          {title}
        </Link>

        {/* Seller */}
        <div className="flex items-center gap-1">
          {isVerified && <ShieldCheck className="h-3 w-3 text-green-600" />}
          <span className="truncate text-xs text-muted-foreground">{sellerName}</span>
        </div>

        {/* Rating */}
        <RatingStars rating={rating} count={reviewCount} size="sm" />

        {/* Price */}
        <PriceDisplay price={price} mrp={mrp} size="md" className="mt-0.5" />

        {/* Delivery badges */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {isFreeShip && (
            <span className="flex items-center gap-0.5 text-xs text-green-700">
              <Truck className="h-3 w-3" /> Free delivery
            </span>
          )}
          {isCod && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">COD</Badge>
          )}
        </div>
      </div>
    </article>
  )
}
