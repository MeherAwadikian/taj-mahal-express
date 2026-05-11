'use client'

import { useRef, useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const TRENDING = ['Silk saree', 'iPhone 15', 'Air fryer', 'LED strip lights', 'Protein powder']

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('tme-recent-searches') ?? '[]') } catch { return [] }
}

function saveRecent(term: string) {
  const prev = getRecent().filter((t) => t !== term)
  localStorage.setItem('tme-recent-searches', JSON.stringify([term, ...prev].slice(0, 5)))
}

interface SearchBarProps {
  className?: string
  autoFocus?: boolean
  onSearch?:  () => void
}

export function SearchBar({ className, autoFocus, onSearch }: SearchBarProps) {
  const router      = useRouter()
  const inputRef    = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    if (open) setRecents(getRecent())
  }, [open])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    saveRecent(q)
    setOpen(false)
    onSearch?.()
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function pick(term: string) {
    setQuery(term)
    saveRecent(term)
    setOpen(false)
    onSearch?.()
    router.push(`/search?q=${encodeURIComponent(term)}`)
  }

  const showDropdown = open && (recents.length > 0 || TRENDING.length > 0)

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} role="search">
        <div className="flex overflow-hidden rounded-lg border border-border bg-background focus-within:border-saffron-500 focus-within:ring-1 focus-within:ring-saffron-500 transition-all">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search products, brands, categories…"
            aria-label="Search Taj Mahal Express"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              aria-label="Clear search"
              className="px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            className="flex items-center gap-1.5 bg-saffron-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-saffron-700 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-card shadow-lg">
          {recents.length > 0 && (
            <section>
              <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent
              </p>
              <ul>
                {recents.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted text-left"
                    >
                      <Clock className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trending
            </p>
            <ul className="pb-2">
              {TRENDING.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => pick(t)}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted text-left"
                  >
                    <TrendingUp className="h-3.5 w-3.5 flex-none text-saffron-500" />
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
