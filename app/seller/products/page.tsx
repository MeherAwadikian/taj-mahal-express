import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, PenLine, Eye, EyeOff } from 'lucide-react'
import { formatINR } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active:         { label: 'Active',          variant: 'default' },
  draft:          { label: 'Draft',           variant: 'secondary' },
  pending_review: { label: 'Under Review',    variant: 'outline' },
  paused:         { label: 'Paused',          variant: 'secondary' },
  archived:       { label: 'Archived',        variant: 'destructive' },
}

export default async function SellerProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: seller } = await supabase
    .from('seller_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data: products } = seller
    ? await supabase
        .from('products')
        .select(`
          id, slug, title, base_price, mrp, status, created_at, rating_avg, rating_count,
          product_images(url, sort_order),
          product_variants(id, quantity, reserved_quantity)
        `)
        .eq('seller_profile_id', seller.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Products</h1>
        <Button variant="saffron" size="sm" asChild>
          <Link href="/seller/products/new" className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      {!products || products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card py-20 text-center">
          <p className="text-lg font-semibold">No products yet</p>
          <p className="text-sm text-muted-foreground">Add your first product to start selling</p>
          <Button variant="saffron" asChild>
            <Link href="/seller/products/new">Add your first product</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Product</th>
                <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">Price</th>
                <th className="hidden px-4 py-3 text-left font-semibold md:table-cell">Stock</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => {
                const img    = p.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0]
                const stock  = (p.product_variants ?? []).reduce(
                  (s: number, v: { quantity: number; reserved_quantity: number }) =>
                    s + Math.max(0, (v.quantity ?? 0) - (v.reserved_quantity ?? 0)),
                  0,
                )
                const status = STATUS_BADGE[p.status] ?? { label: p.status, variant: 'outline' as const }

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {img ? (
                          <img src={img.url} alt={p.title} className="h-10 w-10 rounded-lg object-cover flex-none" />
                        ) : (
                          <div className="h-10 w-10 flex-none rounded-lg bg-muted" />
                        )}
                        <p className="line-clamp-1 font-medium max-w-[180px]">{p.title}</p>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p className="font-medium">{formatINR(p.base_price)}</p>
                      {p.mrp > p.base_price && (
                        <p className="text-xs text-muted-foreground line-through">{formatINR(p.mrp)}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className={stock < 10 ? 'text-red-600 font-medium' : ''}>
                        {stock} units
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/p/${p.slug}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="View product"
                          target="_blank"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/seller/products/${p.id}/edit`}
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                          aria-label="Edit product"
                        >
                          <PenLine className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
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
