import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'

// Formats a date string for display in IST context
export function formatDate(date: string | Date, pattern = 'd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, pattern) : '—'
}

// "3 hours ago" / "2 days ago"
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

// Slugify a string for URL usage
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Generate a random order-safe idempotency key
export function idempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Indian number abbreviation: 1500000 → "15L", 10000000 → "1Cr"
export function abbreviateINR(amount: number): string {
  if (amount >= 10_000_000) return `${(amount / 10_000_000).toFixed(1)}Cr`
  if (amount >= 100_000)    return `${(amount / 100_000).toFixed(1)}L`
  if (amount >= 1_000)      return `${(amount / 1_000).toFixed(1)}K`
  return String(amount)
}
