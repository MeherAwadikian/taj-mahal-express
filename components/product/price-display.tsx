import { cn } from '@/lib/utils/cn'
import { formatINR, discountPercent } from '@/lib/utils/currency'

interface PriceDisplayProps {
  price: number
  mrp: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDiscount?: boolean
  className?: string
}

const PRICE_SIZE  = { sm: 'text-sm font-semibold', md: 'text-base font-bold', lg: 'text-xl font-bold', xl: 'text-2xl font-bold' }
const MRP_SIZE    = { sm: 'text-xs', md: 'text-sm', lg: 'text-base', xl: 'text-lg' }
const BADGE_SIZE  = { sm: 'text-xs px-1', md: 'text-xs px-1.5', lg: 'text-sm px-2', xl: 'text-sm px-2' }

export function PriceDisplay({ price, mrp, size = 'md', showDiscount = true, className }: PriceDisplayProps) {
  const pct = discountPercent(mrp, price)
  const hasDiscount = pct > 0

  return (
    <div className={cn('flex flex-wrap items-baseline gap-1.5', className)}>
      {/* Current price — always shown */}
      <span className={cn(PRICE_SIZE[size], 'text-foreground')}>
        <span className="rupee">₹</span>
        {formatINR(price).replace('₹', '')}
      </span>

      {/* MRP — only if there is a discount */}
      {hasDiscount && (
        <span className={cn(MRP_SIZE[size], 'price-mrp')}>
          ₹{formatINR(mrp).replace('₹', '')}
        </span>
      )}

      {/* Discount badge */}
      {hasDiscount && showDiscount && (
        <span className={cn(
          'rounded font-semibold text-green-700 bg-green-50 py-0.5',
          BADGE_SIZE[size],
        )}>
          {pct}% off
        </span>
      )}
    </div>
  )
}
