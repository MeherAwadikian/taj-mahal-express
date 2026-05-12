# Phase 8 — Real Data, Accounts & Notifications (Design)

## Goal
Turn the working prototype into a usable product. Every mock replaced with live data,
every stub filled, buyers can manage their account, sellers can upload images.

---

## Group 1 — Real Data Integration

Connect mock-data shop pages to live Supabase/API. No new routes needed — wire the existing ones.

| File | Change |
|---|---|
| `app/(shop)/page.tsx` | Replace mocks → `fetch('/api/products')` for trending + flash deals; `unstable_cache` 60s TTL |
| `app/(shop)/c/[slug]/page.tsx` | Convert to Server Component; real category + product query with URL search params |
| `app/(shop)/p/[slug]/page.tsx` | `fetch('/api/products/[slug]')`, `generateMetadata` for SEO, `generateStaticParams` for top products |
| `app/(shop)/search/page.tsx` | Wire to `GET /api/products?q=` |
| `lib/hooks/use-cart.ts` | Zustand store → sync to `/api/cart` when logged in, localStorage when guest |
| `components/product/deal-card.tsx` | Accept `endsAt: string` (ISO) not `Date` — fix hydration mismatch |

**Caching strategy**

| Route | Strategy |
|---|---|
| Homepage trending | `unstable_cache` revalidate 60s |
| PLP product list | Next.js fetch cache revalidate 30s |
| PDP product detail | ISR 5 min + on-demand revalidate on `PATCH /api/products/[slug]` |
| Cart / Orders | `no-store` — always fresh |

---

## Group 2 — Account Section

All 4 buyer account routes are empty stubs.

| File | Content |
|---|---|
| `app/account/layout.tsx` | `requireAuth()` guard + sidebar (Orders, Addresses, Wishlist, Profile) |
| `app/account/page.tsx` | Profile: name, phone, email — edit form with Server Action |
| `app/account/orders/page.tsx` | Paginated order list — status badge, total, date, Track / Return CTA |
| `app/account/orders/[id]/page.tsx` | Order detail: items, address, status timeline, invoice download |
| `app/account/addresses/page.tsx` | List saved addresses, set default, add/edit/delete |
| `app/account/wishlist/page.tsx` | Grid of wishlisted products; remove; Add to cart |
| `app/actions/account.ts` | `updateProfile()`, `addAddress()`, `deleteAddress()`, `setDefaultAddress()` |

---

## Group 3 — Wishlist Backend

Heart button exists on every ProductCard but calls nothing.

| File | Content |
|---|---|
| `app/api/wishlist/route.ts` | `GET` list · `POST` add · `DELETE ?product_id=` remove |
| `lib/store/wishlist.ts` | Zustand store (optimistic toggle) — syncs to API when logged in |
| `components/product/product-card.tsx` | Wire `onWishlist` → wishlist store action |

---

## Group 4 — Image Uploads

New-product form has a placeholder upload box. Fill it.

| File | Content |
|---|---|
| `app/api/upload/route.ts` | `POST` — `requireSeller()`, validate mime/size (jpg/png/webp ≤5MB), upload to `temp-uploads` bucket, return signed URL |
| `components/ui/image-uploader.tsx` | Drag-and-drop + click, multi-image reorder, upload progress, preview grid |
| `app/seller/products/new/page.tsx` | Replace placeholder with `<ImageUploader>` |
| `app/seller/products/[id]/edit/page.tsx` | Pre-populate form from DB, reuse same form component |

**Upload flow**
```
Browser → POST /api/upload → Supabase temp-uploads (private)
       ← signed URL (15 min TTL)
       → form submits with image URLs
       → POST /api/products → server moves to product-images (public)
```
Two-step flow prevents orphaned public images from abandoned forms.

---

## Group 5 — Notifications

Email (Resend) + SMS (MSG91) for the 4 most critical events.

| File | Content |
|---|---|
| `lib/notifications/email.ts` | `sendOrderConfirmation()`, `sendShipmentNotification()`, `sendOtpEmail()` — Resend SDK |
| `lib/notifications/sms.ts` | `sendOtpSms()`, `sendOrderSms()` — MSG91 REST, 160-char limit, DLT template IDs |
| `lib/notifications/templates/order-confirmed.tsx` | React Email: order number, items table, total, delivery address |
| `lib/notifications/templates/order-shipped.tsx` | React Email: courier, AWB, tracking link, ETA |
| `app/api/orders/route.ts` | After COD confirm → `sendOrderConfirmation()` |
| `app/api/orders/[id]/confirm/route.ts` | After payment verified → `sendOrderConfirmation()` + `sendOrderSms()` |
| `app/api/webhooks/razorpay/route.ts` | `payment.captured` → trigger notifications |

**Delivery rules**
- Email (Resend): `await` but catch + log — never block the response
- SMS (MSG91): `void sendOtpSms()` — fire-and-forget, never block

---

## Group 6 — Review System

Reviews display in PDP mock but can't be submitted.

| File | Content |
|---|---|
| `app/api/reviews/route.ts` | `GET ?product_id=&page=` · `POST` (buyer must have a `delivered` order_item for this product) |
| `app/api/reviews/[id]/vote/route.ts` | `POST` — helpful / not-helpful (one per user per review) |
| `components/product/review-form.tsx` | Star picker + textarea + submit; shown only to verified purchasers |
| `components/product/review-list.tsx` | Paginated, helpful vote button, sort (newest / most helpful) |
| `app/(shop)/p/[slug]/page.tsx` | Replace mock reviews with `<ReviewList>` + `<ReviewForm>` |

---

## What's deferred to Phase 9

| Feature | Reason |
|---|---|
| Admin panel | Complex moderation workflows |
| Seller analytics charts | Visual-heavy, needs charting library |
| Dispute resolution UI | Requires admin-in-the-loop |
| Seller GSTIN/bank verification | External API integration |
| Push notifications | Needs service worker |

---

## Summary

| Group | Files | ~Lines |
|---|---|---|
| Real data integration | 6 | 400 |
| Account section | 7 | 700 |
| Wishlist backend | 3 | 200 |
| Image uploads | 4 | 350 |
| Notifications | 8 | 500 |
| Review system | 5 | 450 |
| **Total** | **33** | **~2,600** |
