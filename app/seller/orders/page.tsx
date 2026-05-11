import { createClient } from '@/lib/supabase/server'
import { formatINR } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'Pending',   variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  shipped:   { label: 'Shipped',   variant: 'outline' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  returned:  { label: 'Returned',  variant: 'destructive' },
}

export default async function SellerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: items } = seller
    ? await supabase
        .from('order_items')
        .select(`
          id, quantity, unit_price, status, created_at,
          orders(order_number, buyer_id, shipping_address_id),
          product_variants(title,
            products(title, slug)
          )
        `)
        .eq('seller_profile_id', seller.id)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Orders</h1>

      {!items || items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-20 text-center">
          <p className="text-lg font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground">Orders will appear here once customers purchase your products</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Order</th>
                <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">Product</th>
                <th className="hidden px-4 py-3 text-left font-semibold md:table-cell">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="hidden px-4 py-3 text-left font-semibold lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => {
                const order   = item.orders as unknown as { order_number: string }
                const variant = item.product_variants as unknown as { title: string; products: { title: string; slug: string } }
                const status  = STATUS_BADGE[item.status] ?? { label: item.status, variant: 'outline' as const }
                const date    = new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">
                      #{order?.order_number ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p className="line-clamp-1 max-w-[200px]">{variant?.products?.title}</p>
                      <p className="text-xs text-muted-foreground">{variant?.title} × {item.quantity}</p>
                    </td>
                    <td className="hidden px-4 py-3 font-medium md:table-cell">
                      {formatINR(item.unit_price * item.quantity)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{date}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
