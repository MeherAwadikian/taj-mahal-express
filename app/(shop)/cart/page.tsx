'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Minus, Plus, Tag, ShieldCheck, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatINR, discountPercent } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'

// ─── Mock cart ────────────────────────────────────────────────────────────────

interface CartItem {
  id: string; slug: string; title: string; imageUrl: string
  price: number; mrp: number; qty: number; seller: string; variant?: string
}

const INITIAL_ITEMS: CartItem[] = [
  { id: 'c1', slug: 'samsung-galaxy-f55', title: 'Samsung Galaxy F55 5G 8GB 128GB Icy Blue', imageUrl: 'https://placehold.co/120x120/3b82f6/white?text=Phone', price: 26999, mrp: 30999, qty: 1, seller: 'Samsung Official', variant: 'Icy Blue / 128GB' },
  { id: 'c2', slug: 'boat-airdopes-141',  title: 'boAt Airdopes 141 TWS Earbuds Active Black', imageUrl: 'https://placehold.co/120x120/f97316/white?text=Buds',  price: 999,   mrp: 3990,  qty: 2, seller: 'boAt Store', variant: 'Active Black' },
  { id: 'c3', slug: 'himalaya-face-wash', title: 'Himalaya Purifying Neem Face Wash 150ml', imageUrl: 'https://placehold.co/120x120/22c55e/white?text=FW',    price: 149,   mrp: 175,   qty: 3, seller: 'Himalaya Direct' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const [items,   setItems]   = useState<CartItem[]>(INITIAL_ITEMS)
  const [coupon,  setCoupon]  = useState('')
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null)
  const [couponError, setCouponError] = useState('')

  function updateQty(id: string, delta: number) {
    setItems((prev) => prev.map((it) =>
      it.id === id ? { ...it, qty: Math.max(1, Math.min(10, it.qty + delta)) } : it,
    ))
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function applyCoupon() {
    setCouponError('')
    if (coupon.trim().toUpperCase() === 'TME10') {
      setApplied({ code: 'TME10', discount: 0.10 })
    } else if (coupon.trim().toUpperCase() === 'FLAT200') {
      setApplied({ code: 'FLAT200', discount: 200 })
    } else {
      setCouponError('Invalid coupon code')
    }
  }

  const subtotal   = items.reduce((s, it) => s + it.price * it.qty, 0)
  const mrpTotal   = items.reduce((s, it) => s + it.mrp   * it.qty, 0)
  const savings    = mrpTotal - subtotal
  const couponSave = applied
    ? typeof applied.discount === 'number' && applied.discount < 1
      ? Math.round(subtotal * applied.discount)
      : applied.discount
    : 0
  const shipping   = subtotal > 499 ? 0 : 49
  const total      = subtotal - couponSave + shipping

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="text-6xl">🛒</div>
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground text-sm">Add items from the store to see them here</p>
        <Button asChild variant="saffron" size="lg"><Link href="/">Continue Shopping</Link></Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">Shopping Cart ({items.length} items)</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Items list */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-xl border bg-card p-4 shadow-sm">
              <Link href={`/p/${item.slug}`} className="flex-none">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={100}
                  height={100}
                  className="rounded-lg object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Link href={`/p/${item.slug}`} className="line-clamp-2 text-sm font-medium hover:text-saffron-600">
                  {item.title}
                </Link>
                {item.variant && (
                  <p className="text-xs text-muted-foreground">{item.variant}</p>
                )}
                <p className="text-xs text-muted-foreground">Sold by: {item.seller}</p>

                <div className="flex items-center gap-3">
                  <span className="font-bold">{formatINR(item.price)}</span>
                  {item.mrp > item.price && (
                    <span className="text-xs text-muted-foreground line-through">{formatINR(item.mrp)}</span>
                  )}
                  {item.mrp > item.price && (
                    <span className="text-xs font-medium text-green-600">
                      {discountPercent(item.mrp, item.price)}% off
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Qty */}
                  <div className="flex items-center overflow-hidden rounded-lg border">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      disabled={item.qty <= 1}
                      aria-label="Decrease"
                      className="flex h-8 w-8 items-center justify-center disabled:opacity-40 hover:bg-muted"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      disabled={item.qty >= 10}
                      aria-label="Increase"
                      className="flex h-8 w-8 items-center justify-center disabled:opacity-40 hover:bg-muted"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => remove(item.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4 text-saffron-600" /> Apply Coupon
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponError('') }}
                placeholder="Enter coupon code"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
              <Button size="sm" variant="outline" onClick={applyCoupon}>Apply</Button>
            </div>
            {couponError && <p className="mt-1 text-xs text-destructive">{couponError}</p>}
            {applied && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-600 font-medium">
                ✓ {applied.code} applied — you save {formatINR(couponSave)}!
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Try: TME10 or FLAT200</p>
          </div>

          {/* Price breakdown */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="mb-4 font-bold">Price Details</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span>{formatINR(mrpTotal)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>−{formatINR(savings)}</span>
              </div>
              {couponSave > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon ({applied?.code})</span>
                  <span>−{formatINR(couponSave)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'FREE' : formatINR(shipping)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total Amount</span>
                <span>{formatINR(total)}</span>
              </div>
              {(savings + couponSave) > 0 && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  You save {formatINR(savings + couponSave)} on this order!
                </p>
              )}
            </div>

            <Button variant="saffron" size="lg" className="mt-5 w-full" asChild>
              <Link href="/checkout" className="flex items-center gap-2">
                Proceed to Checkout <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              Safe & Secure Payments
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
