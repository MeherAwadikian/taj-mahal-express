import { NextResponse } from 'next/server'

export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://taj-mahal-express.in'

  const body = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /account/
Disallow: /seller/
Disallow: /checkout/

Sitemap: ${base}/sitemap.xml
`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
