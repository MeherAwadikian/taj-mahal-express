# Phase 7 — Deployment & CI/CD

## Prerequisites

| Service | Purpose | Free tier |
|---------|---------|-----------|
| [Supabase](https://supabase.com) | Database + Auth + Storage | ✓ |
| [Vercel](https://vercel.com) | Hosting + Edge functions | ✓ |
| [Upstash Redis](https://upstash.com) | Rate limiting | ✓ (10k req/day) |
| [Razorpay](https://razorpay.com) | Payments | ✓ test mode |
| [Resend](https://resend.com) | Transactional email | ✓ (100/day) |
| [MSG91](https://msg91.com) | OTP SMS | Pay-as-you-go |

---

## Step 1 — Supabase Project Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create project (or use dashboard at supabase.com)
supabase projects create taj-mahal-express --region ap-south-1 --org-id <your-org-id>

# Link local repo to project
supabase link --project-ref <your-project-ref>

# Apply the schema migration
supabase db push

# Verify RLS is enabled on all tables
psql "$SUPABASE_DB_URL" -f scripts/verify-rls.sql

# Seed development data
supabase db reset   # runs migrations + supabase/seed.sql
```

### Supabase Auth Configuration (dashboard)

1. **Authentication → Providers → Phone** — enable, set Twilio or MSG91
2. **Authentication → URL Configuration**:
   - Site URL: `https://taj-mahal-express.in`
   - Redirect URLs: `https://taj-mahal-express.in/**`
3. **Authentication → Email Templates** — customise OTP email with branding
4. **Storage → Buckets** — create two buckets:
   - `product-images` (public) — for product photos
   - `temp-uploads` (private) — for virus-scan staging

### Storage bucket policies

```sql
-- product-images: authenticated sellers can upload, anyone can read
CREATE POLICY "public read product images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "seller upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.uid() IS NOT NULL
);
```

---

## Step 2 — Vercel Setup

```bash
npm i -g vercel

# Login and link
vercel login
vercel link     # follow prompts, choose existing or create project

# Copy org and project IDs from .vercel/project.json
cat .vercel/project.json
```

### Environment Variables in Vercel dashboard

Go to Project → Settings → Environment Variables and add **all** variables from `.env.example`:

| Variable | Where | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | **Never expose client-side** |
| `RAZORPAY_KEY_SECRET` | Production, Preview | From Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Set when configuring webhook |
| `UPSTASH_REDIS_REST_URL` | All | From Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | All | From Upstash console |
| `CRON_SECRET` | Production | `openssl rand -hex 32` |
| `RESEND_API_KEY` | Production, Preview | From Resend dashboard |
| `MSG91_AUTH_KEY` | Production | From MSG91 dashboard |

---

## Step 3 — GitHub Secrets

Go to GitHub → Repository → Settings → Secrets and variables → Actions:

```
NEXT_PUBLIC_SUPABASE_URL       — from Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY  — from Supabase
NEXT_PUBLIC_RAZORPAY_KEY_ID    — from Razorpay
SUPABASE_SERVICE_ROLE_KEY      — from Supabase
SUPABASE_DB_URL                — postgres://... (from Supabase → Settings → Database)
SUPABASE_ACCESS_TOKEN          — from supabase.com/dashboard/account/tokens
RAZORPAY_KEY_SECRET            — from Razorpay
RAZORPAY_WEBHOOK_SECRET        — from Razorpay
UPSTASH_REDIS_REST_URL         — from Upstash
UPSTASH_REDIS_REST_TOKEN       — from Upstash
VERCEL_TOKEN                   — from vercel.com/account/tokens
VERCEL_ORG_ID                  — from .vercel/project.json
VERCEL_PROJECT_ID              — from .vercel/project.json
NEXT_PUBLIC_FINGERPRINTJS_API_KEY — from FingerprintJS
```

---

## Step 4 — Razorpay Webhook

1. Razorpay Dashboard → Developers → Webhooks → Add New Webhook
2. **Webhook URL**: `https://taj-mahal-express.in/api/webhooks/razorpay`
3. **Secret**: set one, copy to `RAZORPAY_WEBHOOK_SECRET` env var
4. **Active Events**:
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`

---

## Step 5 — Push Workflow Files

The `.github/workflows/` files require a PAT with the `workflow` scope:

1. Go to github.com/settings/tokens
2. Generate new token (classic)
3. Tick: `repo` ✓ and `workflow` ✓
4. Update your git remote credentials or run:

```bash
git remote set-url origin https://<new-token>@github.com/MeherAwadikian/taj-mahal-express.git
git push origin main
```

---

## Step 6 — Cloudflare (Production hardening)

1. Add domain `taj-mahal-express.in` to Cloudflare
2. Point DNS to Vercel (CNAME `cname.vercel-dns.com`)
3. **SSL/TLS** → Full (Strict)
4. **Security** → WAF → Enable OWASP Core Ruleset
5. **Security** → Bot Fight Mode → On
6. **Security** → DDoS → High sensitivity
7. **Rules** → Rate Limiting:
   - `/api/auth/*` — 20 req/min per IP
   - `/api/orders` — 10 req/min per IP

---

## Deployment Flow

```
git push origin main
      │
      ├── CI workflow (parallel)
      │   ├── Lint (ESLint)
      │   ├── TypeCheck (tsc --noEmit)
      │   ├── Build (next build)
      │   └── Migration Lint (sequential file check)
      │
      └── Deploy workflow (on push to main)
          ├── vercel build --prod
          ├── vercel deploy --prebuilt --prod
          ├── supabase db push (migrations)
          └── Smoke test (/api/products?limit=1)
```

---

## Local Development

```bash
# Copy env
cp .env.example .env.local
# Fill in your values

# Start Supabase locally
supabase start

# Run migrations
supabase db reset

# Start Next.js
npm run dev
```

### Useful commands

```bash
npm run typecheck          # check types
npm run lint               # ESLint
supabase db diff           # see pending migration diff
supabase gen types typescript --local > types/supabase.ts  # regenerate types
psql "$SUPABASE_DB_URL" -f scripts/verify-rls.sql          # verify RLS
```
