import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Settings, Store } from 'lucide-react'
import { requireSeller } from '@/lib/auth/require-role'
import { cn } from '@/lib/utils/cn'

const NAV = [
  { label: 'Dashboard',  href: '/seller/dashboard', icon: LayoutDashboard },
  { label: 'Products',   href: '/seller/products',  icon: Package },
  { label: 'Orders',     href: '/seller/orders',    icon: ShoppingBag },
  { label: 'Analytics',  href: '/seller/analytics', icon: BarChart3 },
  { label: 'Settings',   href: '/seller/settings',  icon: Settings },
]

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireSeller()
  if (!auth.user) redirect('/login?next=/seller/dashboard')

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-none border-r bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <Store className="h-5 w-5 text-saffron-600" />
          <span className="font-bold text-saffron-600">Seller Hub</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3" aria-label="Seller navigation">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 flex-none" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to store
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden">
          <Store className="h-5 w-5 text-saffron-600" />
          <span className="font-bold">Seller Hub</span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
