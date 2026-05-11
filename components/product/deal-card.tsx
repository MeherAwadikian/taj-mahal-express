'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { PriceDisplay } from './price-display'

interface DealCardProps {
  id:        string
  slug:      string
  title:     string
  imageUrl:  string
  price:     number
  mrp:       number
  endsAt:    Date
  stockLeft?: number
  className?: string
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function DealCard({ slug, title, imageUrl, price, mrp, endsAt, stockLeft, className }: DealCardProps) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, endsAt.getTime() - Date.now())
      setTimeLeft({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      })
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [endsAt])

  const stockPct = stockLeft !== undefined ? Math.max(5, Math.min(100, stockLeft)) : null

  return (
    <Link
      href={`/p/${slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card hover:shadow-card-md transition-shadow',
        className,
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Countdown overlay */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-black/70 py-1.5">
          {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((v, i) => (
            <span key={i} className="flex items-center gap-0.5">
              <span className="rounded bg-saffron-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                {v}
              </span>
              {i < 2 && <span className="text-xs font-bold text-white">:</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
        <PriceDisplay price={price} mrp={mrp} size="md" />

        {/* Stock bar */}
        {stockPct !== null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Only {stockLeft} left</span>
              <span>{stockPct}% sold</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-saffron-500"
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
