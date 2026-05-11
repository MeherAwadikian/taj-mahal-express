# Taj Mahal Express — Phase 3: Security Architecture

> Document version: 1.0 | Date: 2026-05-11 | Status: Authoritative

---

## 3.1 Supabase RLS Strategy

### Summary

Every one of the 32 database tables has RLS enabled. No table is readable or writable without a matching policy. The `postgres` role (service role) bypasses RLS and is used exclusively server-side — Edge Functions, Supabase CLI migrations, and the weekly payout cron. It is never exposed to the browser or included in client-side code.

### Role Resolution in Policies

All policies resolve the caller's role from the JWT, not from a DB lookup. This prevents privilege escalation via a compromised row.

```sql
-- Correct: reads from JWT (server-issued, tamper-evident)
auth.jwt() -> 'app_metadata' ->> 'role'

-- Wrong: reads from a user-owned row (user could theoretically manipulate)
SELECT role FROM public.users WHERE id = auth.uid()
```

### Helper Functions

Two `SECURITY DEFINER` functions wrap the JWT reads so policies stay DRY:

```sql
is_admin()               -- returns true for 'admin' | 'super_admin'
get_seller_profile_id()  -- returns seller_profiles.id for the calling user
```

`SECURITY DEFINER` + `STABLE` means Postgres executes them under the function owner's privileges and can cache the result within a single query plan — safe and efficient.

### Policy Layering Pattern

For tables accessible by multiple roles, policies are additive (Postgres OR-combines `FOR SELECT` policies for a given role). The pattern used throughout:

```
public_read   → anonymous access for active/approved content only
own_read      → authenticated user sees their own rows
seller_read   → seller sees rows scoped to their seller_profile_id
admin_all     → admin supersedes everything with FOR ALL USING (is_admin())
```

### What the Anon Key Can Access

The Supabase anon key is safe to ship in the browser bundle because RLS is the enforcement layer. Anon users can only reach policies explicitly granted to the `anon` role — in this schema: none. All SELECT policies are on `authenticated`. Public product browsing uses the `authenticated` role (user must be signed in) or a thin public API route that calls Supabase with the service role behind a rate-limited Next.js Route Handler.

---

## 3.2 Role-Based Access Control

### Four Roles

| Role | Scope | Stored In |
|------|-------|-----------|
| `buyer` | Default role on signup; shop, order, review, dispute | `auth.users.app_metadata.role` |
| `seller` | Granted after KYC approval; manage products, fulfil orders, receive payouts | `auth.users.app_metadata.role` |
| `admin` | Platform operations; moderate, resolve disputes, release payouts | `auth.users.app_metadata.role` |
| `super_admin` | All admin powers + assign admin roles, access audit logs, change platform settings | `auth.users.app_metadata.role` |

### Why `app_metadata`, Not `user_metadata`

`user_metadata` is writable by the authenticated user via the Supabase client SDK (`supabase.auth.updateUser()`). Storing roles there would allow any user to self-elevate. `app_metadata` is write-protected — only the Supabase service role (server-side) can modify it.

### Role Assignment Flows

```
Signup (any)
  └─► default role = 'buyer' (set by handle_new_auth_user() trigger)

Seller Onboarding
  └─► seller submits KYC → admin reviews → admin calls Edge Function
        set-user-role(user_id, 'seller')  [uses service role key]
      ─► Edge Function calls:
           supabase.auth.admin.updateUserById(userId, {
             app_metadata: { role: 'seller' }
           })

Admin Promotion
  └─► super_admin only, via /admin/settings/users
        calls set-user-role(user_id, 'admin')
      ─► writes to admin_logs before modifying
```

### Route-Level Role Guard Pattern

Every protected Next.js Route Handler and Server Action calls this helper before any logic:

```typescript
// lib/auth/require-role.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Role = 'buyer' | 'seller' | 'admin' | 'super_admin'

export async function requireRole(required: Role | Role[]) {
  const supabase = createServerClient()
  // getUser() validates JWT with Supabase Auth server — getSession() does not
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const role = user.app_metadata?.role as Role
  const allowed = Array.isArray(required) ? required : [required]

  if (!allowed.includes(role)) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, error: null }
}
```

Usage in every Route Handler:

```typescript
export async function POST(req: Request) {
  const { user, error } = await requireRole('seller')
  if (error) return error
  // ... handler logic
}
```

---

## 3.3 Server-Side Validation (Zod)

**Principle:** every byte of user-supplied input is validated with Zod before it reaches the database. Zod schemas live in `/lib/validation/` — one file per domain. The schema is the single source of truth for both TypeScript types and runtime validation.

### Schema File Structure

```
lib/validation/
├── auth.ts          -- signup, login, OTP
├── product.ts       -- create, update, variant
├── order.ts         -- checkout, address
├── review.ts        -- create review
├── dispute.ts       -- open dispute, message
├── coupon.ts        -- apply, create (admin)
├── seller.ts        -- onboarding, profile update
└── common.ts        -- shared: uuid, pincode, phone, INR amount
```

### Example Schemas

```typescript
// lib/validation/common.ts
import { z } from 'zod'

export const uuidSchema = z.string().uuid()
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
export const pincodeSchema = z.string().regex(/^\d{6}$/, 'Invalid PIN code')
export const inrAmountSchema = z.number().positive().multipleOf(0.01).max(9_999_999)

// lib/validation/product.ts
import { z } from 'zod'
import { uuidSchema, inrAmountSchema } from './common'

export const productCreateSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20).max(5000).optional(),
  category_id: uuidSchema,
  brand: z.string().max(100).optional(),
  base_price: inrAmountSchema,
  mrp: inrAmountSchema,
  gst_rate: z.enum(['0', '5', '12', '18', '28']).transform(Number),
  hsn_code: z.string().regex(/^\d{4,8}$/).optional(),
  return_policy_days: z.number().int().min(0).max(30).default(7),
  is_cod_available: z.boolean().default(true),
  tags: z.array(z.string().max(30)).max(10).default([]),
  specifications: z.record(z.string(), z.string()).optional(),
}).refine(d => d.base_price <= d.mrp, { message: 'Sale price cannot exceed MRP' })

// lib/validation/order.ts
import { z } from 'zod'
import { uuidSchema, pincodeSchema, phoneSchema } from './common'

export const addressSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: phoneSchema,
  address_line1: z.string().min(5).max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: pincodeSchema,
  label: z.enum(['Home', 'Office', 'Other']).optional(),
})

export const checkoutSchema = z.object({
  address_id: uuidSchema,
  coupon_code: z.string().max(30).optional(),
  payment_method: z.enum(['upi', 'card', 'netbanking', 'wallet', 'cod']),
})
```

### Validation in Route Handlers

```typescript
export async function POST(req: Request) {
  const { user, error: authError } = await requireRole('seller')
  if (authError) return authError

  const body = await req.json()
  const parsed = productCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten() },
      { status: 422 }
    )
  }

  // parsed.data is now fully typed and validated — safe to use
  const { data } = parsed
  // ... DB write
}
```

---

## 3.4 API Route Protection

### Middleware (Session Refresh)

`middleware.ts` at the repo root runs on every request. It refreshes the Supabase session cookie and redirects unauthenticated users away from protected paths.

```typescript
// middleware.ts
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/account', '/seller', '/checkout', '/api/seller', '/api/buyer']
const ADMIN_PREFIX = '/api/admin'

export async function middleware(req: NextRequest) {
  const { supabase, response } = createMiddlewareClient(req)

  // Always call getUser() — refreshes session cookie and validates JWT
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl

  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    const role = user?.app_metadata?.role
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)'],
}
```

### Route Handler Protection Layers

Every API route has exactly three guards in order:

```
1. Middleware     → session valid? role allowed for this path prefix?
2. requireRole()  → re-validates in the handler (defense in depth; middleware can be bypassed in tests)
3. Zod parse      → input valid? if not, 422 before any DB query
```

### Critical: `getUser()` vs `getSession()`

`getSession()` reads from the cookie without re-validating the JWT with the Supabase Auth server. A forged or expired cookie would pass. **All server-side code uses `getUser()` exclusively.** This is enforced in code review.

---

## 3.5 Cloudflare Configuration

### DNS

| Record | Type | Value | Proxy |
|--------|------|-------|-------|
| `@` (apex) | A | Vercel IP (76.76.21.21) | ✅ Proxied |
| `www` | CNAME | `cname.vercel-dns.com` | ✅ Proxied |
| `admin` | CNAME | `cname.vercel-dns.com` | ✅ Proxied |
| `api` | CNAME | `cname.vercel-dns.com` | ✅ Proxied |

All records proxied — Vercel origin IP is never visible to attackers.

### SSL/TLS

- Mode: **Full (Strict)** — Cloudflare validates the origin certificate (Vercel auto-provisions Let's Encrypt). "Full" (non-strict) would be vulnerable to origin MITM.
- Min TLS version: TLS 1.2
- HSTS: enabled, `max-age=31536000`, `includeSubDomains`, `preload`
- Automatic HTTPS Rewrites: on

### WAF Rules

| Rule Set | Action |
|----------|--------|
| Cloudflare Managed Rules | Block |
| Cloudflare OWASP Core Ruleset (paranoia level 2) | Block |
| Custom: block requests with SQLi signatures in body | Block |
| Custom: block `../` path traversal in URL | Block |
| Custom: challenge requests with empty/missing User-Agent | JS Challenge |
| Custom: block `admin.taj-mahal-express.in` from non-IN IPs (optional) | Block / Challenge |

### Rate Limiting Rules (per route)

| Endpoint Pattern | Limit | Window | Scope | Action |
|-----------------|-------|--------|-------|--------|
| `/api/auth/otp` | 5 req | 10 min | IP | Block |
| `/api/auth/*` | 20 req | 1 min | IP | Block |
| `/api/payments/webhook` | 500 req | 1 min | IP | Block (Razorpay IPs whitelisted) |
| `/api/seller/products` POST | 30 req | 1 min | IP+CF-User | Block |
| `/api/checkout` | 10 req | 1 min | IP | Block |
| `/api/search` | 120 req | 1 min | IP | JS Challenge |
| `/admin/*` | 60 req | 1 min | IP | Block |
| `*` (catch-all) | 2000 req | 1 min | IP | Block |

Razorpay webhook IPs are added to a Cloudflare IP allowlist rule to bypass the `/api/payments/webhook` rate limit.

### Bot Protection

- **Bot Fight Mode**: enabled — challenges known bot fingerprints before request reaches origin
- **Super Bot Fight Mode** (Pro plan): enabled for "verified bots" challenge — allows Googlebot, disables scrapers
- No `robots.txt` disallow for Googlebot on product/category pages (we want SEO indexing)

### DDoS

- Cloudflare automatically absorbs L3/L4 DDoS (anycast network)
- L7 DDoS: HTTP Flood protection enabled; sensitivity set to **medium** initially (avoids false positives on Indian mobile network shared IPs)
- Under-attack mode: triggered manually via Cloudflare dashboard if attack detected

### Geo & Traffic Rules

```
Rule: "India + Diaspora allow"
  IF (ip.geoip.country in {"IN","US","GB","CA","AU","AE","SG","NZ"})
  → Allow

Rule: "High-fraud origin challenge"
  IF (NOT ip.geoip.country in {above list})
  AND (http.request.uri.path matches "^/api/(auth|checkout|payments)")
  → JS Challenge

Rule: "Admin subdomain lockdown"
  IF (http.host eq "admin.taj-mahal-express.in")
  AND (NOT ip.src in {office_ip_list})
  → Cloudflare Access (zero-trust email OTP gate)
```

### Caching Strategy

| Path | Cache Behaviour |
|------|----------------|
| `/_next/static/*` | Cache everything, 1 year Edge TTL |
| `/images/*` | Cache, 7-day Edge TTL |
| `/api/*` | Bypass cache (dynamic) |
| `/account/*`, `/seller/*`, `/admin/*` | Bypass cache |
| `/*` (HTML pages) | Cache at edge 60s; `s-maxage=60, stale-while-revalidate=600` |

Product pages use Next.js ISR — Vercel edge caches and Cloudflare passes through the `Cache-Control` headers set by Next.js.

---

## 3.6 Rate Limiting Strategy

**Decision: Cloudflare (network edge) + Upstash Redis (user-level, in-app)**

Trade-off:
- Cloudflare only: free, zero latency, but limited to IP-level — can't rate-limit per authenticated user. A buyer using a residential IP proxy could bypass order spam limits.
- Upstash Redis only: per-user limits possible, but adds ~10ms RTT per request and misses anonymous abuse before it hits origin.

**Two-layer approach:**

```
Layer 1 — Cloudflare (IP-level)
  Blocks: anonymous floods, credential stuffing, scraping, DDoS
  Latency: 0ms (before origin)

Layer 2 — Upstash Redis (user-level, in Route Handlers)
  Blocks: authenticated abuse — order spam, bulk product creation,
          dispute flooding, review bombing
  Latency: ~5ms (Upstash global edge)
```

### Upstash Rate Limit Implementation

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiters = {
  // Per authenticated user
  orderPlace:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,  '10 m') }),
  productCreate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 h') }),
  reviewCreate:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h') }),
  disputeOpen:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3,  '1 d') }),
  // Per IP (for auth endpoints — belt and suspenders over Cloudflare)
  otpRequest:   new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5,   '10 m') }),
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<Response | null> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  if (!success) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    })
  }
  return null
}
```

---

## 3.7 File Upload Security

### Threat Model

Attackers may upload: executable files disguised as images (double extension, fake MIME), oversized files to exhaust storage/bandwidth, files containing malware, or files that exploit image parsing vulnerabilities.

### Upload Flow (Two-Bucket Pattern)

```
Client
  │  1. Request signed upload URL from POST /api/upload/presign
  │     (auth check + rate limit + metadata validation first)
  │
  ▼
Supabase Storage — bucket: temp-uploads/
  │  2. Client uploads directly to signed URL (never through our server)
  │
  ▼
Edge Function: validate-upload (triggered by Storage webhook)
  │  3. Download first 16 bytes → check magic bytes (file signature)
  │  4. Validate MIME type matches declared type
  │  5. Check file size within limit for content type
  │  6. Run ClamAV scan via external AV API
  │  7a. PASS → move to permanent bucket, update DB record
  │  7b. FAIL → delete from temp-uploads, reject upload, log fraud_signal
  │
  ▼
Permanent Buckets:
  ├── product-images/   (public CDN, Cloudflare cached)
  ├── kyc-documents/    (private, signed-URL-only, 7-day expiry)
  └── review-images/    (public CDN)
```

### MIME + Magic Byte Validation

```typescript
// supabase/functions/validate-upload/index.ts (Edge Function logic)

const ALLOWED_TYPES: Record<string, { magic: number[]; maxBytes: number }> = {
  'image/jpeg': { magic: [0xFF, 0xD8, 0xFF],     maxBytes: 5 * 1024 * 1024 },
  'image/png':  { magic: [0x89, 0x50, 0x4E, 0x47], maxBytes: 5 * 1024 * 1024 },
  'image/webp': { magic: [0x52, 0x49, 0x46, 0x46], maxBytes: 5 * 1024 * 1024 },
  'application/pdf': { magic: [0x25, 0x50, 0x44, 0x46], maxBytes: 10 * 1024 * 1024 },
}

function validateMagicBytes(buffer: Uint8Array, declared: string): boolean {
  const rule = ALLOWED_TYPES[declared]
  if (!rule) return false
  return rule.magic.every((byte, i) => buffer[i] === byte)
}
```

### Signed URLs for Private Buckets

KYC documents and admin-reviewed files are never served from a public URL. All access goes through:

```typescript
const { data } = await supabase.storage
  .from('kyc-documents')
  .createSignedUrl(storagePath, 3600) // 1-hour expiry
```

Admin UI renders the signed URL; it expires before it could be meaningfully shared.

### Storage Bucket RLS

Supabase Storage uses its own RLS-like policies per bucket:

```sql
-- kyc-documents: only seller who owns it + admin
CREATE POLICY "kyc_upload_own"  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc_read_own"    ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin()));

-- product-images: seller owns, public can read
CREATE POLICY "product_img_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "product_img_read"   ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
```

---

## 3.8 Payment Security

### Razorpay Webhook Signature Verification

Every webhook call to `/api/payments/webhook` is verified before any database state is changed. A missing or invalid signature returns `400` immediately.

```typescript
// lib/razorpay/verify-webhook.ts
import crypto from 'crypto'

export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  // Constant-time comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  )
}

// In the route handler:
export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('x-razorpay-signature') ?? ''

  if (!verifyRazorpayWebhook(rawBody, sig, process.env.RAZORPAY_WEBHOOK_SECRET!)) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(rawBody)
  // Now safe to process
}
```

### Idempotency

Every payment row has an `idempotency_key` with a `UNIQUE` constraint. The key is derived from `${order_id}:${razorpay_payment_id}`. If a webhook fires twice (Razorpay retries on network failure), the second `INSERT` fails with a unique constraint violation — caught, logged, and a `200` returned (webhook must return 200 or Razorpay retries indefinitely).

### PCI Scope Minimisation

- Card data never transits our servers. Razorpay.js tokenizes card numbers client-side before they leave the browser.
- We store: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `method` (upi/card/netbanking) — never PAN, CVV, or expiry.
- SAQ-A level compliance — lightest PCI-DSS self-assessment questionnaire.
- No server-side Razorpay capture flow for card payments — Razorpay auto-captures; we only verify via webhook.

### Order Creation Flow (Server-Only)

Razorpay Order is created server-side only. The client never constructs or influences the amount:

```
Client → POST /api/checkout/create-order
           └─► server calculates grand_total from DB (not from client body)
           └─► creates Razorpay order via server SDK
           └─► returns { razorpay_order_id, amount, currency, key_id }
Client → opens Razorpay checkout with returned order_id
           └─► payment completes; Razorpay fires webhook to /api/payments/webhook
           └─► webhook updates order.payment_status = 'paid' after signature check
```

### Escrow Logic

Razorpay Route is used to split and hold funds. Seller's share sits in a Route account linked to the platform; the Route transfer is scheduled T+3 days after delivery confirmation. The Edge Function `release-escrow` is triggered by a cron or by the buyer's "confirm received" action.

---

## 3.9 Admin Protection

### Separate Subdomain

Admin UI lives at `admin.taj-mahal-express.in` — a separate Next.js route group deployed to its own Vercel project or protected path. This separation means:
- Cloudflare can apply stricter WAF + geo rules to the subdomain
- A compromise of the main site does not automatically expose the admin

### Cloudflare Access (Zero-Trust Gate)

`admin.taj-mahal-express.in` is protected by Cloudflare Access before any HTTP request reaches the origin:

```
User hits admin.taj-mahal-express.in
  │
  ▼
Cloudflare Access evaluates identity policy:
  - Allowed emails: @taj-mahal-express.in (company domain)
  - OR: specific email allowlist
  - MFA: required (TOTP or hardware key)
  └─► PASS → Access JWT issued → request forwarded to origin
  └─► FAIL → Cloudflare Access login page (no origin traffic at all)
```

The origin additionally verifies the Cloudflare Access JWT service token in the `CF-Access-Jwt-Assertion` header — so a request that somehow bypasses CF Access is rejected at origin too.

### Supabase Auth 2FA

All users with `role = 'admin'` or `'super_admin'` have TOTP MFA **enforced** — login fails without the second factor:

```typescript
// In admin login flow, after password auth:
const { data: { totp }, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
// Admin cannot proceed until MFA is verified
const { data, error } = await supabase.auth.mfa.challengeAndVerify({
  factorId: totp.id, code: userInput
})
```

Enforcement: the `requireRole('admin')` helper checks `user.factors` — if no verified TOTP factor, returns `403`.

### Session Timeout

Admin JWT expiry is set to 15 minutes. The middleware refreshes it only on active page load (not silently in the background). A 15-minute idle session results in logout and redirect to admin login — re-authentication including TOTP required.

For buyers/sellers the JWT expiry is 1 hour with silent background refresh (normal UX).

### IP Allowlist (Optional, Recommended for Production)

```
Cloudflare Firewall Rule:
  IF http.host eq "admin.taj-mahal-express.in"
  AND NOT ip.src in {<office_IPs>, <VPN_IP_range>}
  → Block
```

This means admin access requires being on the company VPN or office network — even if an attacker has valid credentials and has passed Cloudflare Access, they're blocked by IP.

---

## 3.10 Audit Logging

### What Is Logged

Every privileged action writes to `admin_logs` before the operation completes (in the same transaction where possible):

| Action Category | Events Logged |
|----------------|---------------|
| Seller management | KYC approve/reject, seller suspend/unsuspend, commission rate change |
| Product moderation | Product approve/reject, product force-unpublish |
| Dispute resolution | Dispute resolved (outcome, amount), dispute message sent by admin |
| Payout operations | Payout batch created, payout released, payout put on hold |
| User management | User suspend, role change |
| Fraud | Fraud signal created, signal reviewed/dismissed |
| Platform settings | Commission rate change, feature flag toggle |
| Auth (buyer/seller) | Payment captured, refund initiated, KYC submitted |

### Log Structure

```typescript
interface AdminLog {
  actor_id:     string    // who performed the action
  action:       string    // 'seller.kyc.approve' | 'product.reject' | ...
  target_type:  string    // 'seller' | 'product' | 'dispute' | ...
  target_id:    string    // UUID of the affected row
  before_state: object    // snapshot of relevant fields before change
  after_state:  object    // snapshot after change
  ip_address:   string    // from X-Forwarded-For (Cloudflare sets this)
  user_agent:   string
}
```

### Immutability

`admin_logs` has RLS policies for `SELECT` (admins) and `INSERT` (admins) only. There are no `UPDATE` or `DELETE` policies. Even a compromised admin account cannot modify or erase log entries. For compliance, logs should additionally be streamed to an append-only external store (e.g., S3/R2 with Object Lock) — implement in Phase 7.

### Logging Helper

```typescript
// lib/audit.ts
import { createServerClient } from '@/lib/supabase/server'

export async function auditLog(params: {
  actorId: string
  action: string
  targetType: string
  targetId?: string
  beforeState?: object
  afterState?: object
  req: Request
}) {
  const supabase = createServerClient()
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')

  await supabase.from('admin_logs').insert({
    actor_id:     params.actorId,
    action:       params.action,
    target_type:  params.targetType,
    target_id:    params.targetId,
    before_state: params.beforeState,
    after_state:  params.afterState,
    ip_address:   ip,
    user_agent:   req.headers.get('user-agent'),
  })
}
```

---

## 3.11 Secret Management

### Environments

| Secret | Dev (local) | CI (GitHub Actions) | Prod (Vercel) |
|--------|-------------|---------------------|---------------|
| `SUPABASE_URL` | `.env.local` | `secrets.SUPABASE_URL` | Vercel env var |
| `SUPABASE_ANON_KEY` | `.env.local` | `secrets.SUPABASE_ANON_KEY` | Vercel env var |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | `secrets.SUPABASE_SERVICE_ROLE_KEY` | Vercel env var (server only) |
| `RAZORPAY_KEY_ID` | `.env.local` | `secrets.RAZORPAY_KEY_ID` | Vercel env var |
| `RAZORPAY_KEY_SECRET` | `.env.local` | `secrets.RAZORPAY_KEY_SECRET` | Vercel env var |
| `RAZORPAY_WEBHOOK_SECRET` | `.env.local` | `secrets.RAZORPAY_WEBHOOK_SECRET` | Vercel env var |
| `UPSTASH_REDIS_REST_URL` | `.env.local` | `secrets.UPSTASH_REDIS_REST_URL` | Vercel env var |
| `UPSTASH_REDIS_REST_TOKEN` | `.env.local` | `secrets.UPSTASH_REDIS_REST_TOKEN` | Vercel env var |
| `MSG91_AUTH_KEY` | `.env.local` | `secrets.MSG91_AUTH_KEY` | Vercel env var |
| `RESEND_API_KEY` | `.env.local` | `secrets.RESEND_API_KEY` | Vercel env var |
| `CF_ACCESS_CLIENT_ID` | `.env.local` | — | Vercel env var |
| `CF_ACCESS_CLIENT_SECRET` | `.env.local` | — | Vercel env var |
| `FINGERPRINTJS_SECRET_API_KEY` | `.env.local` | — | Vercel env var |

### Rules

1. `.env*` files (except `.env.example`) are in `.gitignore` — verified pre-commit hook
2. `SUPABASE_SERVICE_ROLE_KEY` is marked **Server-only** in Vercel — never exposed to browser bundles. Any `NEXT_PUBLIC_` prefix is intentional and documented.
3. Secrets are rotated quarterly — Razorpay webhook secret, Supabase JWT secret
4. GitHub secret scanning is enabled — alerts on accidental commits
5. No secret is ever logged. Rate limiter keys use user IDs, not tokens.

### `.env.example` (committed to repo)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server only

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=your-key-secret               # server only
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret       # server only

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Notifications
MSG91_AUTH_KEY=your-msg91-key
RESEND_API_KEY=re_xxxx

# Cloudflare Access (admin subdomain)
CF_ACCESS_CLIENT_ID=your-client-id
CF_ACCESS_CLIENT_SECRET=your-client-secret

# Fingerprinting (fraud detection)
NEXT_PUBLIC_FINGERPRINTJS_API_KEY=your-public-key
FINGERPRINTJS_SECRET_API_KEY=your-secret-key

# App
NEXT_PUBLIC_APP_URL=https://taj-mahal-express.in
```

---

## 3.12 GitHub Repository Security

### Branch Protection (main)

```yaml
# Settings > Branches > Branch protection rules for 'main'
required_status_checks:
  strict: true
  contexts:
    - ci / lint
    - ci / typecheck
    - ci / build
required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
enforce_admins: true              # even admins can't push directly
allow_force_pushes: false
allow_deletions: false
```

### Secret Scanning

Enabled via GitHub Advanced Security (free for public repos). Alerts are sent immediately when a secret pattern is detected in any push. Token types detected: Supabase keys, Razorpay keys, AWS credentials, GitHub tokens, Stripe, Twilio, etc.

### Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: "08:00"
      timezone: Asia/Kolkata
    open-pull-requests-limit: 10
    labels: [dependencies, security]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

### Code Scanning (CodeQL)

```yaml
# .github/workflows/codeql.yml
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript }
      - uses: github/codeql-action/analyze@v3
```

---

## 3.13 Security Headers

Set via `next.config.js` headers:

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',       value: 'on' },
  { key: 'Strict-Transport-Security',    value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',              value: 'DENY' },
  { key: 'X-Content-Type-Options',       value: 'nosniff' },
  { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://api.razorpay.com https://fpjscdn.net",
      "frame-src https://api.razorpay.com",
      "connect-src 'self' https://*.supabase.co https://api.razorpay.com https://*.upstash.io",
      "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
    ].join('; ')
  },
]
```

---

## 3.14 OWASP Top 10 Mitigation Map

| # | Risk | Mitigation in This Stack |
|---|------|--------------------------|
| **A01** | Broken Access Control | Supabase RLS on all 32 tables; `requireRole()` in every Route Handler; no client-controlled role claims |
| **A02** | Cryptographic Failures | HTTPS enforced (Cloudflare Full Strict + HSTS preload); no sensitive data in URLs; signed URLs for private files; secrets in env vars, never in code; bcrypt for passwords (Supabase Auth) |
| **A03** | Injection | Supabase JS client uses parameterized queries internally — no string concatenation in SQL; Zod validates and sanitises all input; no `eval`, no dynamic query construction |
| **A04** | Insecure Design | Threat-modeled data flows: escrow prevents premature payouts; KYC gate prevents unverified sellers; verified-purchase constraint on reviews; SLA enforcement on disputes; Razorpay amount computed server-side |
| **A05** | Security Misconfiguration | Supabase anon key safe behind RLS; service role key never in browser; Cloudflare WAF + OWASP ruleset; security headers on all responses; `NODE_ENV` check prevents debug endpoints in prod |
| **A06** | Vulnerable Components | Dependabot weekly PRs; lockfile committed (`package-lock.json`); no `*` version ranges; CodeQL scanning on every PR |
| **A07** | Auth Failures | Supabase Auth: bcrypt passwords, OTP rate-limited, JWT rotation, no session fixation; admin mandatory TOTP; `getUser()` not `getSession()` on server; 15-min admin session timeout |
| **A08** | Software & Data Integrity | Razorpay webhook HMAC-SHA256 signature verification; file upload magic-byte validation; CI builds on pinned runner images; GitHub Actions uses `actions/checkout@v4` with commit SHA pinning |
| **A09** | Logging & Monitoring | `admin_logs` for all privileged actions (immutable via RLS); `fraud_signals` for anomaly tracking; Supabase query logs; Cloudflare analytics; Vercel log drains to external SIEM (Phase 7) |
| **A10** | SSRF | No server-side fetch from user-supplied URLs; all external API calls (MSG91, Razorpay, Shiprocket) use hardcoded base URLs from env vars; file uploads use pre-signed URLs, not proxied through our server |

---

## 3.15 Security Checklist (Pre-Launch)

- [ ] Supabase RLS: attempt read/write as wrong role for every table — confirm 0 unauthorized rows returned
- [ ] Webhook: replay a captured Razorpay webhook with modified body — confirm `400` returned
- [ ] File upload: upload a `.exe` renamed to `.jpg` — confirm rejection at magic-byte check
- [ ] Admin route: hit `/admin/*` without admin cookie — confirm `403`
- [ ] Rate limit: burst 20 OTP requests — confirm `429` after limit
- [ ] CSP: check browser console for any CSP violations on key pages
- [ ] HSTS: verify `Strict-Transport-Security` header present on all responses
- [ ] Secret scan: run `git log --all -p | grep -i "sk_live\|service_role\|rzp_live"` — confirm zero matches
- [ ] Dependency audit: `npm audit --audit-level=high` — confirm zero high/critical
- [ ] Cloudflare: confirm orange-cloud on all DNS records (origin IP not exposed)

---

*End of Phase 3 — Security Architecture*

*Next phase: Project Scaffolding → full Next.js directory structure*
