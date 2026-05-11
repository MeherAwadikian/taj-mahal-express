'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SubCategory {
  label: string
  slug:  string
}

interface Category {
  label:    string
  slug:     string
  icon?:    string
  children?: SubCategory[]
}

const CATEGORIES: Category[] = [
  {
    label: 'Electronics', slug: 'electronics', icon: '📱',
    children: [
      { label: 'Mobiles', slug: 'mobiles' },
      { label: 'Laptops', slug: 'laptops' },
      { label: 'Tablets', slug: 'tablets' },
      { label: 'Cameras', slug: 'cameras' },
      { label: 'Accessories', slug: 'electronics-accessories' },
    ],
  },
  {
    label: 'Fashion', slug: 'fashion', icon: '👗',
    children: [
      { label: 'Sarees', slug: 'sarees' },
      { label: "Men's Wear", slug: 'mens-wear' },
      { label: "Women's Wear", slug: 'womens-wear' },
      { label: 'Kids', slug: 'kids-fashion' },
      { label: 'Ethnic Wear', slug: 'ethnic-wear' },
    ],
  },
  {
    label: 'Home & Kitchen', slug: 'home-kitchen', icon: '🏠',
    children: [
      { label: 'Furniture', slug: 'furniture' },
      { label: 'Cookware', slug: 'cookware' },
      { label: 'Bedding', slug: 'bedding' },
      { label: 'Décor', slug: 'decor' },
    ],
  },
  {
    label: 'Beauty', slug: 'beauty', icon: '💄',
    children: [
      { label: 'Skincare', slug: 'skincare' },
      { label: 'Haircare', slug: 'haircare' },
      { label: 'Makeup', slug: 'makeup' },
      { label: 'Fragrances', slug: 'fragrances' },
    ],
  },
  {
    label: 'Sports', slug: 'sports', icon: '🏏',
    children: [
      { label: 'Cricket', slug: 'cricket' },
      { label: 'Fitness', slug: 'fitness' },
      { label: 'Outdoor', slug: 'outdoor-sports' },
    ],
  },
  {
    label: 'Grocery', slug: 'grocery', icon: '🛒',
    children: [
      { label: 'Staples', slug: 'staples' },
      { label: 'Snacks', slug: 'snacks' },
      { label: 'Beverages', slug: 'beverages' },
      { label: 'Organic', slug: 'organic' },
    ],
  },
  { label: 'Books', slug: 'books', icon: '📚' },
  { label: 'Toys', slug: 'toys', icon: '🧸' },
  { label: 'Automotive', slug: 'automotive', icon: '🚗' },
  { label: 'Health', slug: 'health', icon: '💊' },
]

export function CategoryNav() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter(slug: string) {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setActiveSlug(slug)
  }

  function handleMouseLeave() {
    leaveTimer.current = setTimeout(() => setActiveSlug(null), 120)
  }

  return (
    <nav
      className="hidden md:block border-b bg-background"
      aria-label="Product categories"
    >
      <div className="container mx-auto px-4">
        <ul className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <li
              key={cat.slug}
              className="relative flex-none"
              onMouseEnter={() => cat.children ? handleMouseEnter(cat.slug) : undefined}
              onMouseLeave={cat.children ? handleMouseLeave : undefined}
            >
              <Link
                href={`/c/${cat.slug}`}
                className={cn(
                  'flex items-center gap-1 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors hover:text-saffron-600',
                  activeSlug === cat.slug ? 'text-saffron-600' : 'text-foreground',
                )}
              >
                {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                {cat.label}
                {cat.children && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
              </Link>

              {/* Mega menu */}
              {cat.children && activeSlug === cat.slug && (
                <div
                  className="absolute left-0 top-full z-50 min-w-[180px] rounded-b-lg border bg-card shadow-lg"
                  onMouseEnter={() => handleMouseEnter(cat.slug)}
                  onMouseLeave={handleMouseLeave}
                >
                  <ul className="py-1">
                    {cat.children.map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          href={`/c/${cat.slug}/${sub.slug}`}
                          className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted hover:text-saffron-600 transition-colors"
                        >
                          {sub.label}
                          <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t px-4 py-2">
                    <Link
                      href={`/c/${cat.slug}`}
                      className="text-xs font-medium text-saffron-600 hover:underline"
                    >
                      View all in {cat.label} →
                    </Link>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
