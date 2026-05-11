import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/utils/currency'
import { TrendingUp, Package, ShoppingBag, Star, AlertCircle } from 'lucide-react'
import Link from 'next/link'

async function getSellerStats(userId: string) {
  const supabase = await createClient()

  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('id, display_name, status, rating_avg, rating_count')
    .eq('user_id', userId)
    .single()

  if (!seller) return null

  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [ordersRes, productsRes, revenueRes, pendingRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('seller_profile_id', seller.id)
      .gte('created_at', start),

    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('seller_profile_id', seller.id)
      .eq('status', 'active'),

    supabase
      .from('order_items')
      .select('unit_price, quantity')
      .eq('seller_profile_id', seller.id)
      .eq('status', 'delivered')
      .gte('created_at', start),

    supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('seller_profile_id', seller.id)
      .eq('status', 'pending'),
  ])

  const revenue = (revenueRes.data ?? []).reduce(
    (sum, item) => sum + item.unit_price * item.quantity, 0,
  )

  return {
    seller,
    monthOrders:   ordersRes.count ?? 0,
    activeProducts: productsRes.count ?? 0,
    monthRevenue:  revenue,
    pendingOrders: pendingRes.count ?? 0,
  }
}

export default async function SellerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const stats = await getSellerStats(user.id)

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-bold">Seller profile not found</h2>
        <p className="text-sm text-muted-foreground">Please complete your seller registration first.</p>
        <Link href="/seller/register" className="font-medium text-saffron-600 hover:underline">
          Complete registration →
        </Link>
      </div>
    )
  }

  const STAT_CARDS = [
    {
      label: 'Revenue this month',
      value: formatINR(stats.monthRevenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bg:   'bg-green-50',
    },
    {
      label: 'Orders this month',
      value: String(stats.monthOrders),
      icon: ShoppingBag,
      color: 'text-indigo-600',
      bg:   'bg-indigo-50',
    },
    {
      label: 'Active products',
      value: String(stats.activeProducts),
      icon: Package,
      color: 'text-saffron-600',
      bg:   'bg-saffron-50',
    },
    {
      label: 'Avg. rating',
      value: stats.seller.rating_avg != null
        ? `${Number(stats.seller.rating_avg).toFixed(1)} ★`
        : '—',
      icon: Star,
      color: 'text-amber-600',
      bg:   'bg-amber-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Welcome back, {stats.seller.display_name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with your store this month.
        </p>
      </div>

      {stats.seller.status !== 'active' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-none" />
          Your seller account is under review. Products will go live once approved.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/seller/products/new"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-saffron-50">
            <Package className="h-5 w-5 text-saffron-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Add Product</p>
            <p className="text-xs text-muted-foreground">List a new item</p>
          </div>
        </Link>

        <Link
          href="/seller/orders"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Pending Orders</p>
            <p className="text-xs text-muted-foreground">{stats.pendingOrders} awaiting action</p>
          </div>
        </Link>

        <Link
          href="/seller/analytics"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">View Analytics</p>
            <p className="text-xs text-muted-foreground">Sales & performance</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
