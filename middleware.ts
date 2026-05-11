import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

type Role = 'buyer' | 'seller' | 'admin' | 'super_admin'

// Paths that require authentication (any role)
const AUTH_REQUIRED = ['/account', '/checkout', '/api/buyer', '/api/checkout']

// Paths that require seller role
const SELLER_REQUIRED = ['/seller', '/api/seller']

// Paths that require admin role
const ADMIN_REQUIRED = ['/admin', '/api/admin']

function getRequiredRole(pathname: string): Role | null {
  if (ADMIN_REQUIRED.some(p => pathname.startsWith(p)))  return 'admin'
  if (SELLER_REQUIRED.some(p => pathname.startsWith(p))) return 'seller'
  return null
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const { pathname } = request.nextUrl

  const requiresAuth = AUTH_REQUIRED.some(p => pathname.startsWith(p))
  const requiredRole = getRequiredRole(pathname)

  // Not logged in but hitting a protected path
  if ((requiresAuth || requiredRole) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in but wrong role for route
  if (requiredRole && user) {
    const role = user.app_metadata?.role as Role | undefined

    const isAdminRoute = ADMIN_REQUIRED.some(p => pathname.startsWith(p))
    const isSellerRoute = SELLER_REQUIRED.some(p => pathname.startsWith(p))

    if (isAdminRoute && !['admin', 'super_admin'].includes(role ?? '')) {
      // API routes return JSON; page routes redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (isSellerRoute && !['seller', 'admin', 'super_admin'].includes(role ?? '')) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/seller/onboarding', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
}
