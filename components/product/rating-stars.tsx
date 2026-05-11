import { Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface RatingStarsProps {
  rating: number        // 0–5, supports decimals
  count?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

const SIZE = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' } as const
const TEXT = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const

export function RatingStars({ rating, count, size = 'md', showCount = true, className }: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating))

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center" aria-label={`${clamped.toFixed(1)} out of 5 stars`} role="img">
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = Math.min(1, Math.max(0, clamped - i))
          return (
            <span key={i} className="relative inline-block">
              {/* Background star */}
              <Star className={cn(SIZE[size], 'text-muted')} />
              {/* Filled overlay — clipped to fill fraction */}
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className={cn(SIZE[size], 'fill-amber-400 text-amber-400')} />
                </span>
              )}
            </span>
          )
        })}
      </div>

      {showCount && count !== undefined && (
        <span className={cn(TEXT[size], 'text-muted-foreground')}>
          ({count.toLocaleString('en-IN')})
        </span>
      )}
    </div>
  )
}
