'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ShoppingCart, Heart, User, Menu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { useCartStore } from '@/lib/store/cart'
import { useState, useRef, type FormEvent } from 'react'

export function Header() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const itemCount = useCartStore(s => s.itemCount)

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      {/* Top bar */}
      <div className="container flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <span className="text-xl font-bold text-saffron-600 md:text-2xl">
            Taj Mahal Express
          </span>
        </Link>

        {/* Search — hidden on mobile, shown on md+ */}
        <form
          onSubmit={handleSearch}
          className="hidden flex-1 items-center md:flex"
        >
          <Input
            type="search"
            placeholder="Search products, brands, categories…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            startIcon={<Search className="h-4 w-4" />}
            className="h-10 rounded-r-none focus-visible:ring-0"
          />
          <Button
            type="submit"
            variant="saffron"
            className="h-10 rounded-l-none"
          >
            Search
          </Button>
        </form>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Wishlist */}
          <Button variant="ghost" size="icon" asChild className="hidden md:flex">
            <Link href="/account/wishlist" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>

          {/* Cart */}
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart" aria-label={`Cart — ${itemCount} items`}>
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-saffron-600 text-[10px] font-bold text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </Button>

          {/* Account */}
          <Button variant="ghost" size="icon" asChild className="hidden md:flex">
            <Link href="/account" aria-label="My account">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="border-t px-4 py-2 md:hidden">
        <form onSubmit={handleSearch} className="flex">
          <Input
            type="search"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="rounded-r-none"
          />
          <Button type="submit" variant="saffron" className="rounded-l-none px-3">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Category nav — desktop */}
      <nav className="hidden border-t md:block" aria-label="Categories">
        <div className="container flex gap-6 overflow-x-auto py-2 scrollbar-hide">
          {NAV_CATEGORIES.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className="flex-shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {cat.label}
            </Link>
          ))}
          <Link
            href="/c"
            className="flex-shrink-0 text-sm font-medium text-saffron-600 hover:text-saffron-700"
          >
            All Categories →
          </Link>
        </div>
      </nav>
    </header>
  )
}

const NAV_CATEGORIES = [
  { label: 'Fashion',          href: '/c/fashion' },
  { label: 'Electronics',      href: '/c/electronics' },
  { label: 'Home & Kitchen',   href: '/c/home-kitchen' },
  { label: 'Books',            href: '/c/books' },
  { label: 'Sports & Fitness', href: '/c/sports-fitness' },
  { label: 'Beauty',           href: '/c/beauty' },
  { label: 'Baby & Kids',      href: '/c/baby-kids' },
  { label: 'Toys',             href: '/c/toys' },
]
