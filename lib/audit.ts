import { createClient } from '@/lib/supabase/server'

interface AuditParams {
  actorId:     string
  action:      string       // 'seller.kyc.approve' | 'product.reject' | ...
  targetType:  string       // 'seller' | 'product' | 'order' | ...
  targetId?:   string
  beforeState?: Record<string, unknown>
  afterState?:  Record<string, unknown>
  req:         Request
}

// Writes an immutable audit entry. Call before committing the action
// so that a failed write surfaces the error before side effects occur.
export async function auditLog(params: AuditParams): Promise<void> {
  const supabase = createClient()

  const ip =
    params.req.headers.get('cf-connecting-ip') ??
    params.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null

  const { error } = await supabase.from('admin_logs').insert({
    actor_id:     params.actorId,
    action:       params.action,
    target_type:  params.targetType,
    target_id:    params.targetId ?? null,
    before_state: params.beforeState ?? null,
    after_state:  params.afterState ?? null,
    ip_address:   ip,
    user_agent:   params.req.headers.get('user-agent'),
  })

  if (error) {
    // Audit log failure must not silently swallow — surface as thrown error
    throw new Error(`Failed to write audit log: ${error.message}`)
  }
}
