import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { limiters, checkRateLimit } from '@/lib/rate-limit'
import { phoneSchema } from '@/lib/validation/common'

const sendSchema   = z.object({ phone: phoneSchema })
const verifySchema = z.object({
  phone: phoneSchema,
  token: z.string().length(6).regex(/^\d{6}$/),
})

// POST /api/auth/otp  — send OTP
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const limited = await checkRateLimit(limiters.otpRequest, ip)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 422 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: `+91${parsed.data.phone}`,
    options: { channel: 'sms' },
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ message: 'OTP sent' })
}

// PUT /api/auth/otp  — verify OTP
export async function PUT(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const limited = await checkRateLimit(limiters.otpRequest, `verify:${ip}`)
  if (limited) return limited

  const body = await req.json().catch(() => null)
  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 422 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    phone: `+91${parsed.data.phone}`,
    token: parsed.data.token,
    type: 'sms',
  })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 401 })
  }

  return NextResponse.json({ user: { id: data.user.id, phone: data.user.phone } })
}
