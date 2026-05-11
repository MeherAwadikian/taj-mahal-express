import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type Role = 'buyer' | 'seller' | 'admin' | 'super_admin'

type RequireRoleResult =
  | { user: Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>['auth']['getUser']>>['data']['user'] & {}; error: null }
  | { user: null; error: NextResponse }

// Guards every Route Handler and Server Action.
// Uses getUser() (validates with Auth server) — never getSession().
export async function requireRole(required: Role | Role[]): Promise<RequireRoleResult> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const role = user.app_metadata?.role as Role | undefined
  const allowed = Array.isArray(required) ? required : [required]

  // admin and super_admin can access seller and buyer routes too
  const effective: Role[] = [...allowed]
  if (allowed.includes('seller')) effective.push('admin', 'super_admin')
  if (allowed.includes('buyer'))  effective.push('seller', 'admin', 'super_admin')

  if (!role || !effective.includes(role)) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user, error: null }
}

// Convenience wrappers
export const requireAuth   = () => requireRole(['buyer', 'seller', 'admin', 'super_admin'])
export const requireSeller = () => requireRole('seller')
export const requireAdmin  = () => requireRole('admin')
