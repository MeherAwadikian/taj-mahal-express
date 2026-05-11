# Taj Mahal Express — Phase 1: Strategy & Blueprint

> Document version: 1.0 | Date: 2026-05-11 | Status: Draft for review

---

## 1.1 Product Strategy

### Positioning Statement

Taj Mahal Express is India's trust-first, mobile-native multi-vendor marketplace built to bridge the gap between India's 70 million+ MSMEs and 850 million internet users — across every tier city, in their language, on their payment method of choice. Where incumbents built for scale and sacrificed trust, we build for trust and earn scale. Every seller is GST-verified. Every payment is escrowed until delivery. Every dispute is resolved in 48 hours. We are not a race to the bottom on price — we are a race to the top on reliability.

---

### Buyer Value Proposition

| # | Value | Why It Matters |
|---|-------|---------------|
| 1 | **Price History Transparency** | Real-time price history graph (90-day) on every product — no fake MRP inflation, no manufactured "70% off" theatrics that erode trust post-purchase |
| 2 | **3-Tap UPI Checkout** | PhonePe, GPay, Paytm, BHIM — checkout in under 10 seconds without entering card details or OTPs; built for India's actual payment behaviour |
| 3 | **Verified Seller Badges** | KYC + GST-registered sellers only; buyers see seller rating, fulfillment rate, dispute history before adding to cart |
| 4 | **Vernacular-First UI** | Browse, search, read reviews, and get support in Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam — not as an afterthought, as a first-class feature |
| 5 | **Guaranteed Returns + Escrow** | Payment held in escrow for 72 hours post-delivery; 7-day no-questions return window; real-time dispute status with SLA countdown visible to buyer |

---

### Seller Value Proposition

| # | Value | Why It Matters |
|---|-------|---------------|
| 1 | **Fair Commission Structure** | 5–12% of GMV (category-tiered) vs 15–30% on Amazon/Flipkart; micro-sellers can actually build a business here |
| 2 | **Weekly Payouts** | T+3 escrow release then weekly settlement cycle — vs 7–15 days elsewhere; critical for working-capital-constrained small sellers |
| 3 | **Zero Listing Fees — First 500 SKUs** | No upfront cost barrier; sellers list, learn, then scale; monetised through commission only in MVP phase |
| 4 | **Built-in GST Invoicing** | Auto-generated GSTIN-compliant invoices, GSTR-1 reconciliation export, TCS deduction statements — accounting work sellers currently pay CAs for |
| 5 | **Seller Growth Dashboard** | Demand forecasting, keyword ranking, conversion funnel, return rate benchmarks by category — actionable data, not vanity metrics |

---

### Revenue Model

| Stream | Mechanism | Rate / Range | Timeline |
|--------|-----------|-------------|----------|
| **GMV Commission** | % of each completed order, net of returns | 5% (grocery/FMCG) → 8% (fashion) → 12% (electronics accessories) | Day 1 |
| **Premium Seller Subscription** | Taj Pro tier: lower commission −2%, priority placement, advanced analytics, dedicated account manager | ₹1,499/month or ₹12,999/year | Month 3 |
| **Sponsored Listings (CPC Ads)** | Sellers bid on keyword/category placement; charged per click, minimum ₹2 CPC | Estimated 8–15% revenue contribution at scale | Month 6 |
| **Logistics Margin** | Partner-fulfilled orders via Shiprocket/Delhivery: we pass volume pricing, retain 10–15% margin | Scales with GMV | Month 3 |
| **Buyer Financial Services** | EMI via Bajaj Finserv / Simpl integration; we earn referral fee | ₹80–200 per activated loan | Year 2 |
| **Seller Working Capital** | Lending against payout history (partnered NBFC); arrangement fee | 1–2% of loan | Year 2 |

**Unit economics target (Year 1):** 8% blended take rate on GMV → at ₹100 Cr GMV = ₹8 Cr revenue → contribution positive at ~₹250 Cr GMV with logistics margin included.

---

### Launch Strategy

**Phase 0 — Invite-Only Beta (Months 1–2)**
- 50 hand-picked sellers across 3 categories: Fashion Accessories, Home Décor, Electronics Accessories
- 3 cities: Bengaluru, Delhi NCR, Pune (tech-savvy early adopters; strong UPI adoption; return logistics manageable)
- Invite buyers via WhatsApp referral — 1,000 active buyers target before public launch
- Goal: expose edge cases in dispute flow, payout flow, and seller onboarding before scaling

**Phase 1 — Controlled Public Launch (Months 3–4)**
- Open seller onboarding in 3 launch categories; strict quality gate (GST mandatory, minimum 3 product photos, filled return policy)
- Add 2 metros: Mumbai, Hyderabad
- Marketing: micro-influencer partnerships (YouTube regional creators), Google Shopping ads, Meta retargeting
- Target: 500 sellers, 50,000 registered buyers, ₹2 Cr GMV/month

**Phase 2 — Category & City Expansion (Months 5–9)**
- Add: Kitchen & Dining, Books & Stationery, Sports & Fitness, Baby & Kids
- Expand to Tier 2: Ahmedabad, Jaipur, Lucknow, Kochi, Chandigarh
- Launch vernacular apps (Android-first: Hindi, Tamil, Telugu)
- Target: 5,000 sellers, ₹15 Cr GMV/month

**Phase 3 — Monetisation Scale (Month 10+)**
- Activate sponsored listings ad platform
- Launch Taj Pro seller subscription
- Introduce buyer wallet + cashback rewards loop
- Explore B2B procurement lane (office supplies, hospitality bulk orders)

---

### Top 5 Competitive Advantages

| # | Advantage | vs Meesho | vs Flipkart | vs Amazon India |
|---|-----------|-----------|-------------|-----------------|
| 1 | **Trust Infrastructure from Day 1** | Meesho is reseller-heavy with quality inconsistency and no escrow | Flipkart has escrow but opaque dispute process | Amazon has A-to-Z but India support is bot-heavy |
| 2 | **Price History Transparency** | None of the three show price history natively | Fake "deal" inflation is a documented Flipkart complaint | Amazon has browser extension hacks but no native tool |
| 3 | **Vernacular-First (not bolt-on)** | Meesho has Hindi but limited; deep UX in regional still weak across all | Flipkart's regional is surface-level | Amazon India's regional support is inconsistent |
| 4 | **GST + Accounting Suite for Sellers** | None provide integrated GST invoicing/GSTR export | Partial | Partial |
| 5 | **Lean Take Rate with Fast Payouts** | Meesho ~15–20% + slow settlement | Flipkart 15–25% | Amazon 15–30% |

---

### Trust & Safety Strategy

**Seller Verification (Pre-Listing Gate)**
- GSTIN validation via API (GST Suvidha Provider integration or GST API sandbox)
- Aadhaar / PAN verification via DigiLocker or third-party KYC provider (Onfido India / Karza)
- Bank account verification (penny drop via Razorpay Route / Cashfree)
- Sellers cannot list until all three pass; KYC status displayed on seller profile

**Payment Escrow**
- Razorpay Route splits payment at checkout: platform escrow account holds seller portion
- Released T+3 after delivery confirmation (buyer triggers) or auto-released T+10 if no dispute raised
- Refunds processed from escrow directly — never from platform operating account

**Dispute Resolution SLA**
- Buyer must raise within 7 days of delivery date
- 48-hour first response SLA by support team
- 7-day total resolution SLA with escalation path to admin
- Unresolved disputes auto-escalate; seller payout held until resolution
- Dispute history visible on seller profile (rolling 90 days) as trust signal

**Fraud Detection**
- Device fingerprinting on signup and checkout (FingerprintJS Pro)
- Velocity rules: >3 orders from same device/IP in 10 minutes flagged
- Address mismatch alerts: billing vs shipping PINCODE distance anomaly
- High-refund-rate seller auto-flag: >15% refund rate in 30 days triggers manual review
- Duplicate account detection: same phone/Aadhaar → flag, require manual KYC re-verification

---

## 1.2 Full Sitemap

```
taj-mahal-express.in/
│
├── / (Home)
│   ├── Hero banner (rotating, campaign-driven)
│   ├── Category grid (top-level)
│   ├── Flash deals strip (live countdown)
│   ├── Trending products (algorithmically ranked)
│   ├── Seller spotlight section
│   ├── Trust strip (badges: verified sellers, secure pay, easy returns)
│   └── Recently viewed (personalised, logged-in users)
│
├── /c/[category-slug]/ (Category PLP)
│   ├── Breadcrumb
│   ├── Subcategory chips (horizontal scroll mobile)
│   ├── Filter sidebar (price range, rating, brand, delivery speed, seller tier, discount %)
│   ├── Sort controls (relevance, price ↑↓, newest, top-rated, fastest delivery)
│   ├── Product grid (infinite scroll / pagination toggle)
│   └── Mobile: bottom-sheet filters
│
├── /search?q= (Search Results)
│   ├── Spell-corrected query display
│   ├── Filters (same as PLP)
│   ├── "Did you mean?" suggestions
│   ├── Product grid
│   └── No-results → curated suggestions
│
├── /p/[product-slug]/ (Product Detail Page)
│   ├── Image gallery (swipeable on mobile, zoom on desktop)
│   ├── Title, brand, rating summary
│   ├── Price display (current, MRP, discount %, price history link)
│   ├── Variant selector (size, colour, material)
│   ├── Quantity selector + stock status
│   ├── Add to Cart / Buy Now CTAs
│   ├── Delivery date estimate (PINCODE input)
│   ├── Seller card (name, rating, GST badge, response time)
│   ├── Product description + specifications table
│   ├── Reviews section (with filters: rating, media, verified purchase)
│   ├── Q&A section
│   └── Similar / Frequently Bought Together
│
├── /cart/ (Cart)
│   ├── Item list (image, title, variant, qty stepper, remove)
│   ├── Seller grouping (items grouped by seller for clarity)
│   ├── Coupon / gift card input
│   ├── Price summary (subtotal, shipping, discount, GST, total)
│   ├── Estimated delivery dates
│   └── Proceed to Checkout CTA
│
├── /checkout/ (3-Step Checkout)
│   ├── Step 1: Delivery Address
│   │   ├── Saved addresses list
│   │   ├── Add new address form (name, phone, flat, street, PINCODE, city, state)
│   │   └── PINCODE → city/state auto-fill
│   ├── Step 2: Delivery Options
│   │   ├── Estimated dates per seller
│   │   ├── Standard / Express options (if available)
│   │   └── COD availability check
│   └── Step 3: Payment
│       ├── UPI (collect flow — enter UPI ID or select app)
│       ├── Saved cards / Add new card (Razorpay iframe)
│       ├── Net banking
│       ├── EMI options
│       ├── Cash on Delivery (eligibility-gated)
│       ├── Wallet (Taj wallet balance)
│       └── Order summary sidebar
│
├── /order-confirmed/[order-id]/ (Order Confirmation)
│   ├── Success animation
│   ├── Order number + summary
│   ├── Estimated delivery
│   └── Track / Continue shopping CTAs
│
├── /track/[order-id]/ (Order Tracking — public, token-gated)
│   ├── Status timeline (placed → confirmed → shipped → out for delivery → delivered)
│   ├── Shipment events feed
│   ├── Courier name + AWB
│   └── Delivery partner map (future)
│
├── /account/ (Buyer Account — auth required)
│   ├── /account/orders/
│   │   ├── Order list (filterable: all, active, completed, cancelled, returned)
│   │   └── /account/orders/[order-id]/ — Order detail + per-item actions
│   ├── /account/wishlist/
│   ├── /account/addresses/
│   ├── /account/returns/
│   │   ├── Active returns / disputes
│   │   └── /account/returns/[return-id]/ — Return detail + message thread
│   ├── /account/wallet/
│   ├── /account/coupons/
│   └── /account/settings/ (profile, phone, email, password, notifications, language)
│
├── /seller/ (Seller Dashboard — seller role required)
│   ├── /seller/onboarding/ (multi-step: business info → KYC → bank → first product)
│   ├── /seller/dashboard/ (overview: GMV today/week/month, orders pending, low stock)
│   ├── /seller/products/
│   │   ├── Product list (draft, active, paused, rejected)
│   │   ├── /seller/products/new/
│   │   └── /seller/products/[id]/edit/
│   ├── /seller/orders/
│   │   ├── Order queue (new, confirmed, shipped, delivered, return requested)
│   │   └── /seller/orders/[id]/ — Order detail + shipment entry
│   ├── /seller/payouts/
│   │   ├── Payout schedule + history
│   │   └── /seller/payouts/[id]/ — Payout statement (line items per order)
│   ├── /seller/analytics/
│   │   ├── Revenue chart, top products, conversion funnel, return rate
│   │   └── GST report export (GSTR-1 format)
│   ├── /seller/disputes/
│   └── /seller/settings/ (business info, bank, GST, notifications, vacation mode)
│
├── /admin/ (Admin Dashboard — admin role required, separate subdomain: admin.taj-mahal-express.in)
│   ├── /admin/dashboard/ (platform KPIs: GMV, orders, active sellers, open disputes, fraud flags)
│   ├── /admin/users/ (buyer list, search, suspend, view profile)
│   ├── /admin/sellers/
│   │   ├── Seller list (pending KYC, active, suspended)
│   │   ├── /admin/sellers/[id]/ — Full seller profile + KYC docs + products + payouts
│   │   └── KYC approval / rejection flow
│   ├── /admin/products/
│   │   ├── Moderation queue (newly submitted, flagged)
│   │   └── /admin/products/[id]/ — Product review + approve / reject with reason
│   ├── /admin/orders/ (full order view, cross-seller visibility)
│   ├── /admin/disputes/
│   │   ├── Open disputes queue (SLA countdown)
│   │   └── /admin/disputes/[id]/ — Message thread + resolution actions (approve refund, reject, partial)
│   ├── /admin/payouts/ (approve / release payout batches)
│   ├── /admin/fraud/ (flagged signals, device clusters, high-risk sellers/buyers)
│   ├── /admin/audit-logs/ (immutable log of all admin actions)
│   ├── /admin/coupons/ (create, pause, view redemptions)
│   └── /admin/settings/ (platform commission rates, feature flags, maintenance mode)
│
├── /returns/ (Returns & Refund Flow — buyer-initiated)
│   ├── Step 1: Select order + item(s)
│   ├── Step 2: Select reason (wrong item, damaged, not as described, changed mind)
│   ├── Step 3: Upload photos (if damaged/wrong)
│   ├── Step 4: Choose resolution (refund, replacement, store credit)
│   └── Step 5: Confirmation + pickup scheduling (where applicable)
│
├── /help/ (Help Center)
│   ├── Search
│   ├── FAQ categories (orders, payments, returns, seller, account)
│   ├── /help/[article-slug]/
│   ├── Live chat widget (business hours; WhatsApp fallback)
│   └── /help/contact/ (support ticket form)
│
├── /login/
│   ├── Phone OTP (primary — enter phone → 6-digit OTP via SMS)
│   ├── Email + password (fallback)
│   ├── Google OAuth
│   └── Role-aware redirect (buyer → home; seller → dashboard; admin → admin)
│
└── /signup/
    ├── Choose role: Buyer / Seller
    ├── Buyer: phone OTP → name → done
    └── Seller: phone OTP → business name → GSTIN → proceed to onboarding

---
MOBILE LAYOUT DIFFERENCES
- Bottom navigation bar (5 tabs: Home, Categories, Search, Wishlist, Account)
- Floating "Cart" FAB with item count badge
- Full-screen bottom-sheet for filters (vs sidebar on desktop)
- Swipeable horizontal carousels replace multi-column grids in some sections
- Sticky "Add to Cart / Buy Now" bar on PDP (above fold always visible)
- Touch-optimised quantity steppers (44px tap targets)
- PWA installable; Add to Home Screen prompt after 3rd visit
```

---

## 1.3 Core Feature List

### Legend
- **Role:** B = Buyer, S = Seller, A = Admin, P = Public
- **Priority:** P0 = launch blocker, P1 = launch week, P2 = within 60 days
- **MVP:** ✅ = in MVP, 🔜 = post-MVP

---

### Discovery & Navigation

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Homepage with hero, deals, trending | P | P0 | ✅ |
| Category tree navigation (mega-menu desktop, bottom-sheet mobile) | P | P0 | ✅ |
| Full-text product search with instant suggestions | P | P0 | ✅ |
| Trigram fuzzy search (typo tolerance) | P | P1 | ✅ |
| Search filters: price, rating, brand, delivery speed | P | P0 | ✅ |
| Sort: relevance, price, newest, top-rated | P | P0 | ✅ |
| Recently viewed products (local + server) | B | P1 | ✅ |
| Personalised homepage recommendations | B | P2 | 🔜 |
| Vernacular language toggle (Hindi + 4 regional) | P | P1 | 🔜 |
| PWA / Add to Home Screen | P | P2 | 🔜 |

### Product Management

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Product create / edit / publish / pause | S | P0 | ✅ |
| Product image upload (max 8, min 3) | S | P0 | ✅ |
| Product variants (size, colour, material) | S | P0 | ✅ |
| Inventory tracking per variant | S | P0 | ✅ |
| Product categories (self-referencing tree, admin-managed) | A | P0 | ✅ |
| Admin moderation queue (approve/reject with reason) | A | P0 | ✅ |
| Bulk product import via CSV | S | P2 | 🔜 |
| Product Q&A section | B, S | P2 | 🔜 |
| Price history graph | P | P1 | ✅ |
| Low stock alerts for sellers | S | P1 | ✅ |

### Cart & Wishlist

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Add to cart / update quantity / remove | B | P0 | ✅ |
| Guest cart (localStorage) synced on login | P | P0 | ✅ |
| Server-side cart (Postgres, logged-in) | B | P0 | ✅ |
| Wishlist add / remove / move to cart | B | P0 | ✅ |
| Share wishlist (public link) | B | P2 | 🔜 |
| Saved for later | B | P2 | 🔜 |

### Checkout & Payments

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Address management (CRUD, default) | B | P0 | ✅ |
| PINCODE → city/state autofill | B | P0 | ✅ |
| UPI payment (collect flow) | B | P0 | ✅ |
| Card payment (Razorpay hosted) | B | P0 | ✅ |
| Net banking | B | P0 | ✅ |
| Cash on Delivery (eligibility-gated) | B | P0 | ✅ |
| Coupon / promo code application | B | P0 | ✅ |
| EMI options | B | P1 | 🔜 |
| Razorpay webhook handler + idempotency | A | P0 | ✅ |
| Escrow release logic (T+3 / T+10 auto) | A | P0 | ✅ |
| Taj wallet / store credit | B | P2 | 🔜 |
| Buy Now Pay Later (Simpl/LazyPay) | B | P2 | 🔜 |

### Orders & Fulfillment

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Order placement + order number generation | B | P0 | ✅ |
| Order splitting per seller | A | P0 | ✅ |
| Buyer order history + detail | B | P0 | ✅ |
| Seller order queue + fulfillment actions | S | P0 | ✅ |
| Order status transitions (placed → confirmed → shipped → delivered) | S, A | P0 | ✅ |
| Manual shipment entry (AWB, courier) | S | P0 | ✅ |
| Shiprocket / Delhivery API integration | S | P1 | 🔜 |
| Order tracking page (public, token-gated) | P | P0 | ✅ |
| Delivery confirmation + escrow trigger | B, A | P0 | ✅ |
| GST invoice auto-generation (PDF) | B, S | P0 | ✅ |
| Order cancellation (buyer, before shipped) | B | P0 | ✅ |

### Reviews & Trust

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Verified purchase reviews only | B | P0 | ✅ |
| Star rating + text review | B | P0 | ✅ |
| Photo / video in reviews | B | P1 | ✅ |
| Helpful votes on reviews | B | P1 | ✅ |
| Seller response to reviews | S | P1 | 🔜 |
| Trust badges on seller profile | P | P0 | ✅ |
| Price history transparency graph | P | P1 | ✅ |
| Review moderation (flag / remove spam) | A | P1 | ✅ |

### Coupons & Promotions

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Admin coupon creation (flat / percent) | A | P0 | ✅ |
| Coupon constraints (min order, category scope, user limit, expiry) | A | P0 | ✅ |
| Coupon redemption tracking | A | P0 | ✅ |
| Flash deals (time-limited price override) | A, S | P1 | 🔜 |
| Referral program | B | P2 | 🔜 |

### Returns, Disputes & Refunds

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Return initiation (7-day window) | B | P0 | ✅ |
| Return reason selection + photo upload | B | P0 | ✅ |
| Dispute message thread (buyer ↔ seller ↔ admin) | B, S, A | P0 | ✅ |
| Admin dispute resolution (approve / partial / reject) | A | P0 | ✅ |
| Razorpay refund API integration | A | P0 | ✅ |
| Dispute SLA countdown + auto-escalation | A | P0 | ✅ |
| Return pickup scheduling | B | P1 | 🔜 |

### Seller Tools & Payouts

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Seller onboarding (multi-step + KYC) | S | P0 | ✅ |
| GSTIN validation | S, A | P0 | ✅ |
| Bank account penny-drop verification | S, A | P0 | ✅ |
| Seller analytics dashboard | S | P0 | ✅ |
| GSTR-1 reconciliation export | S | P1 | 🔜 |
| Weekly automated payout calculation | A | P0 | ✅ |
| Payout statements (line items per order) | S | P0 | ✅ |
| Vacation mode (pause listings) | S | P1 | ✅ |
| Taj Pro subscription tier | S | P2 | 🔜 |
| Sponsored listing bids | S | P2 | 🔜 |

### Admin, Security & Compliance

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Role-based access control (buyer / seller / admin / super_admin) | A | P0 | ✅ |
| Admin product moderation queue | A | P0 | ✅ |
| Admin seller KYC approval | A | P0 | ✅ |
| Fraud signal dashboard | A | P0 | ✅ |
| Device fingerprinting + velocity rules | A | P0 | ✅ |
| Audit log (immutable, all admin actions) | A | P0 | ✅ |
| Cloudflare WAF + rate limiting | A | P0 | ✅ |
| Razorpay webhook signature verification | A | P0 | ✅ |
| Supabase RLS on all tables | A | P0 | ✅ |
| Admin 2FA (TOTP) | A | P0 | ✅ |
| IP allowlist for /admin subdomain | A | P1 | 🔜 |
| Automated Dependabot + secret scanning | A | P0 | ✅ |

### Notifications

| Feature | Role | Priority | MVP |
|---------|------|----------|-----|
| Transactional SMS (order placed, shipped, OTP) | B, S | P0 | ✅ |
| Transactional email (order, invoice, payout) | B, S | P0 | ✅ |
| In-app notification bell | B, S | P1 | ✅ |
| WhatsApp notifications (opt-in) | B, S | P2 | 🔜 |
| Push notifications (PWA) | B | P2 | 🔜 |

---

*End of Phase 1 — Strategy & Blueprint*

*Total estimated MVP features: 68 | Post-MVP: 24*
*Next phase: Database Schema → `/supabase/migrations/0001_initial_schema.sql`*
