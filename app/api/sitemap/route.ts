import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const base     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taj-mahal-express.in'

  const staticRoutes = [
    { loc: base,                priority: '1.0', changefreq: 'daily' },
    { loc: `${base}/deals`,     priority: '0.9', changefreq: 'hourly' },
    { loc: `${base}/seller/register`, priority: '0.7', changefreq: 'monthly' },
  ]

  const categories = [
    'electronics', 'fashion', 'home-kitchen', 'beauty', 'sports', 'grocery', 'books', 'toys',
  ]
  const catRoutes = categories.map((slug) => ({
    loc: `${base}/c/${slug}`, priority: '0.8', changefreq: 'daily',
  }))

  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(5000)

  const productRoutes = (products ?? []).map((p) => ({
    loc:        `${base}/p/${p.slug}`,
    lastmod:    new Date(p.updated_at).toISOString().split('T')[0],
    priority:   '0.6',
    changefreq: 'weekly',
  }))

  const all = [...staticRoutes, ...catRoutes, ...productRoutes]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((r) => `  <url>
    <loc>${r.loc}</loc>${r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : ''}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
