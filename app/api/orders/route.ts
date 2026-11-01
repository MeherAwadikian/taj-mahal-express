import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRazorpayOrder, isRazorpayConfigured } from '@/lib/razorpay/client'
import { limiters, checkRateLimit } from '@/lib/rate-limit'
import { checkoutSchema } from '@/lib/validation/order'
import { rupeesToPaise } from '@/lib/utils/currency'

const FREE_SHIPPING_THRESHOLD = 499
const SHIPPING_FLAT_FEE       = 49

// GET /api/orders — list buyer's orders
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page  = Number(req.nextUrl.searchParams.get('page')  ?? 1)
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 10)
  const offset = (page - 1) * limit

  // order_items snapshots product/variant details at time of purchase, so order
  // history doesn't need to join products/product_variants at all.
  const { data, error, count } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status,
      subtotal, shipping_total, discount_total, tax_total, grand_total, created_at,
      order_items(
        id, quantity, unit_price, item_status,
        product_title, variant_title, product_image_url, product_id
      )
    `, { count: 'exact' })
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

  return NextResponse.json({
    data,
    meta: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  })
}

// POST /api/orders — create order (+ Razorpay order for online payment methods)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkRateLimit(limiters.orderPlace, user.id)
  if (limited) return limited

  const body   = await req.json().catch(() => null)
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { address_id, payment_method, coupon_code } = parsed.data

  if (payment_method !== 'cod' && !isRazorpayConfigured()) {
    return NextResponse.json({ error: 'Online payments are not configured yet — please use Cash on Delivery' }, { status: 503 })
  }

  // Verify address belongs to user
  const { data: address } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', address_id)
    .eq('user_id', user.id)
    .single()

  if (!address) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }

  // Resolve the user's cart
  const { data: cart } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cart) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      quantity,
      product_variants(
        id, sku, title, price, mrp, is_active,
        inventory(quantity, reserved_quantity),
        products(
          id, seller_id, status, title, gst_rate, hsn_code,
          product_images(url, is_primary, sort_order),
          seller_profiles(commission_rate)
        )
      )
    `)
    .eq('cart_id', cart.id)

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  type VariantRow = {
    id: string; sku: string; title: string; price: number; mrp: number; is_active: boolean
    inventory: { quantity: number; reserved_quantity: number } | { quantity: number; reserved_quantity: number }[] | null
    products: {
      id: string; seller_id: string; status: string; title: string
      gst_rate: number; hsn_code: string | null
      product_images: { url: string; is_primary: boolean; sort_order: number }[] | null
      seller_profiles: { commission_rate: number } | { commission_rate: number }[] | null
    } | null
  }

  const firstOf = <T,>(v: T | T[] | null | undefined) => Array.isArray(v) ? v[0] : v ?? undefined

  // Validate stock + build line items
  const lineItems: {
    variant: VariantRow; quantity: number; subtotal: number; taxAmount: number
    commissionAmount: number; payoutAmount: number
  }[] = []

  for (const item of cartItems) {
    const v = firstOf(item.product_variants) as VariantRow | undefined
    const product = v?.products
    if (!v?.is_active || product?.status !== 'active') {
      return NextResponse.json({ error: 'One or more products are no longer available' }, { status: 409 })
    }

    const inv = firstOf(v.inventory)
    const available = (inv?.quantity ?? 0) - (inv?.reserved_quantity ?? 0)
    if (available < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for ${product.title} (${available} left)` }, { status: 409 })
    }

    const subtotal         = Number(v.price) * item.quantity
    const taxAmount        = Math.round(subtotal * (Number(product.gst_rate) / 100) * 100) / 100
    const commissionRate   = Number(firstOf(product.seller_profiles)?.commission_rate ?? 0)
    const commissionAmount = Math.round(subtotal * (commissionRate / 100) * 100) / 100
    const payoutAmount     = Math.round((subtotal - commissionAmount) * 100) / 100

    lineItems.push({ variant: v, quantity: item.quantity, subtotal, taxAmount, commissionAmount, payoutAmount })
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.subtotal, 0)
  const taxTotal  = lineItems.reduce((sum, i) => sum + i.taxAmount, 0)

  // Apply coupon if provided
  let discountAmount = 0
  let couponId: string | null = null
  if (coupon_code) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, type, value, max_discount, min_order_value, max_uses, current_uses, expires_at, is_active')
      .eq('code', coupon_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (coupon) {
      const now       = new Date()
      const expired   = coupon.expires_at !== null && new Date(coupon.expires_at) < now
      const exhausted = coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses
      const tooSmall  = subtotal < coupon.min_order_value

      if (!expired && !exhausted && !tooSmall) {
        couponId = coupon.id
        discountAmount = coupon.type === 'percent'
          ? Math.round((subtotal * Number(coupon.value)) / 100 * 100) / 100
          : Number(coupon.value)
        if (coupon.max_discount !== null) {
          discountAmount = Math.min(discountAmount, Number(coupon.max_discount))
        }
      }
    }
  }

  const shippingTotal = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_FEE
  const grandTotal    = Math.round((subtotal - discountAmount + shippingTotal + taxTotal) * 100) / 100

  const { data: orderNumberResult } = await supabase.rpc('generate_order_number')
  const orderNumber = orderNumberResult as unknown as string

  // Create order row
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number:         orderNumber,
      buyer_id:             user.id,
      shipping_address_id:  address_id,
      status:               'pending_payment',
      subtotal,
      shipping_total:       shippingTotal,
      discount_total:       discountAmount,
      tax_total:            taxTotal,
      grand_total:          grandTotal,
      coupon_id:            couponId,
      coupon_discount:      discountAmount,
      payment_method,
      payment_status:       'pending',
      notes:                parsed.data.notes ?? null,
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Create order items (snapshotted — survives future product/variant edits or deletes)
  const orderItemRows = lineItems.map(({ variant, quantity, subtotal: itemSubtotal, taxAmount, commissionAmount, payoutAmount }) => {
    const product      = variant.products!
    const primaryImage = (product.product_images ?? []).find((i) => i.is_primary)
      ?? [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]
    const commissionRate = Number(firstOf(product.seller_profiles)?.commission_rate ?? 0)

    return {
      order_id:             order.id,
      seller_id:            product.seller_id,
      product_id:           product.id,
      variant_id:           variant.id,
      product_title:        product.title,
      variant_title:        variant.title,
      product_image_url:    primaryImage?.url ?? null,
      sku:                  variant.sku,
      quantity,
      unit_price:           variant.price,
      mrp:                  variant.mrp,
      subtotal:             itemSubtotal,
      tax_rate:             product.gst_rate,
      tax_amount:           taxAmount,
      hsn_code:             product.hsn_code,
      commission_rate:      commissionRate,
      commission_amount:    commissionAmount,
      seller_payout_amount: payoutAmount,
      item_status:          'pending' as const,
    }
  })

  // Inserting order_items triggers the DB's stock-reservation trigger automatically.
  const { error: itemsError } = await supabase.from('order_items').insert(orderItemRows)
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
  }

  if (couponId) {
    await supabase.from('coupon_redemptions').insert({
      coupon_id: couponId, user_id: user.id, order_id: order.id, discount_amount: discountAmount,
    })
  }

  // For COD: mark order confirmed immediately, skip Razorpay
  if (payment_method === 'cod') {
    await supabase.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
    await supabase.from('cart_items').delete().eq('cart_id', cart.id)

    return NextResponse.json({
      data: { order_id: order.id, order_number: order.order_number, payment_method: 'cod' },
    }, { status: 201 })
  }

  // Create Razorpay order + our payments row (razorpay_order_id lives on `payments`, not `orders`)
  let rpOrder: { id: string }
  try {
    rpOrder = await createRazorpayOrder({
      orderId:     order.id,
      amountPaise: rupeesToPaise(grandTotal),
      notes:       { order_number: order.order_number, buyer_id: user.id },
    }) as { id: string }
  } catch {
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Payment gateway error' }, { status: 502 })
  }

  const { error: paymentError } = await supabase.from('payments').insert({
    order_id:          order.id,
    razorpay_order_id: rpOrder.id,
    amount:            grandTotal,
    currency:          'INR',
    status:            'created',
    idempotency_key:   randomUUID(),
  })

  if (paymentError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      order_id:          order.id,
      order_number:      order.order_number,
      razorpay_order_id: rpOrder.id,
      razorpay_key_id:   process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount_paise:      rupeesToPaise(grandTotal),
    },
  }, { status: 201 })
}
