# Taj Mahal Express

India's trust-first multi-vendor marketplace — verified GST-registered sellers, escrow payments, 48-hour dispute resolution.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Payments | Razorpay (UPI · Card · Net Banking · COD) |
| Hosting | Vercel (frontend) · Cloudflare (DNS · WAF · CDN) |
| State | Zustand (cart) · React Query (server state) |
| Forms | react-hook-form · zod |
| Notifications | Resend (email) · MSG91 (SMS) |
| Rate Limiting | Cloudflare (IP) · Upstash Redis (per-user) |

## Local Development

### Prerequisites
- Node.js ≥ 20
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Docker](https://www.docker.com/) (for local Supabase)

### Setup

```bash
# 1. Clone
git clone https://github.com/MeherAwadikian/taj-mahal-express.git
cd taj-mahal-express

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Fill in your values — see .env.example for all required vars

# 4. Start local Supabase
supabase start

# 5. Run migrations
supabase db reset          # applies all migrations from scratch

# 6. Generate TypeScript types
npm run supabase:types

# 7. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — never expose in browser |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | **Server only** |
| `RAZORPAY_WEBHOOK_SECRET` | **Server only** — for webhook verification |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `MSG91_AUTH_KEY` | MSG91 SMS API key |
| `RESEND_API_KEY` | Resend email API key |
| `NEXT_PUBLIC_APP_URL` | Full app URL e.g. `https://taj-mahal-express.in` |

### Useful Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run supabase:types   # Regenerate DB types after schema changes
supabase db reset        # Wipe local DB and re-run all migrations
supabase db push         # Push migrations to remote Supabase project
supabase functions serve # Run Edge Functions locally
```

## Project Structure

```
taj-mahal-express/
├── app/                     # Next.js App Router
│   ├── (shop)/              # Public shopping routes
│   ├── (auth)/              # Login / Signup
│   ├── account/             # Buyer dashboard
│   ├── seller/              # Seller dashboard
│   ├── admin/               # Admin dashboard (admin.taj-mahal-express.in)
│   └── api/                 # Route Handlers
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── layout/              # Header, Footer
│   ├── product/             # ProductCard, PriceDisplay, etc.
│   ├── cart/                # Cart components
│   └── checkout/            # Checkout steps
├── lib/
│   ├── supabase/            # Browser / server / middleware clients
│   ├── auth/                # requireRole() guard
│   ├── validation/          # zod schemas (one file per domain)
│   ├── razorpay/            # Razorpay client + webhook verification
│   ├── store/               # Zustand stores (cart)
│   ├── hooks/               # Custom React hooks
│   └── utils/               # cn(), currency, format helpers
├── supabase/
│   ├── migrations/          # SQL migration files
│   └── functions/           # Edge Functions (payout, escrow, upload)
├── types/
│   └── supabase.ts          # Generated DB types (npm run supabase:types)
└── .github/
    └── workflows/           # CI (lint + typecheck + build) + Deploy
```

## Database

Schema: 32 tables with RLS on all. See `supabase/migrations/0001_initial_schema.sql`.

After any schema change:
```bash
# Create a new migration
supabase migration new <description>
# Edit the file in supabase/migrations/
# Apply it locally
supabase db reset
# Regenerate types
npm run supabase:types
```

## Deployment

**Frontend:** Push to `main` → GitHub Actions → Vercel auto-deploys.

**Migrations:** Run after deploy via `supabase db push --db-url $SUPABASE_DB_URL`.

**Environment variables:** Set in Vercel project settings. Never commit `.env.local`.

## Documentation

| Doc | Contents |
|-----|----------|
| `/docs/01-strategy.md` | Product strategy, sitemap, feature list |
| `/docs/02-schema.md` | ER diagram, table design decisions |
| `/docs/03-security.md` | RLS, RBAC, Cloudflare, OWASP map |

## Contributing

1. Branch from `main`: `git checkout -b feat/my-feature`
2. Make changes, ensure `npm run typecheck` and `npm run lint` pass
3. Open a PR — CI must pass before merge
4. At least 1 reviewer approval required

## License

Proprietary. All rights reserved. © 2026 Taj Mahal Express Pvt. Ltd.
