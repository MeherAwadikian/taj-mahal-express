import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Per-user rate limiters (authenticated routes)
export const limiters = {
  orderPlace:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '10 m'), prefix: 'rl:order' }),
  productCreate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h'),  prefix: 'rl:product' }),
  reviewCreate:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'),  prefix: 'rl:review' }),
  disputeOpen:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3,  '1 d'),  prefix: 'rl:dispute' }),
  // Per-IP for auth endpoints (belt-and-suspenders over Cloudflare)
  otpRequest:    new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5,    '10 m'), prefix: 'rl:otp' }),
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<NextResponse | null> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset':     reset.toString(),
          'Retry-After':           Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    )
  }

  return null
}
