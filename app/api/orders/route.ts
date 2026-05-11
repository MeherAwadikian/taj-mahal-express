import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRazorpayOrder } from '@/lib/razorpay/client'
import { limiters, checkRateLimit } from '@/lib/rate-limit'
import { checkoutSchema } from '@/lib/validation/order'
import { rupeesToPaise } from '@/lib/utils/currency'

// GET /api/orders — list buyer's orders
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page  = Number(req.nextUrl.searchParams.get('page')  ?? 1)
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 10)
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, total_amount, created_at,
      order_items(
        id, quantity, unit_price, status,
        product_variants(
          title,
          products(id, slug, title,
            product_images(url, sort_order)
          )
        )
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

// POST /api/orders — create order + Razorpay order
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

  // Load cart items
  const { data: cartItems } = await supabase
    .from('cart_items')
    .select(`
      quantity,
      product_variants(
        id, price, mrp, quantity, reserved_quantity, is_active,
        products(id, seller_profile_id, status)
      )
    `)
    .eq('user_id', user.id)

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  // Validate all variants are active and have stock
  for (const item of cartItems) {
    const v = item.product_variants as unknown as {
      id: string; price: number; mrp: number; quantity: number; reserved_quantity: number; is_active: boolean
      products: { id: string; seller_profile_id: string; status: string }
    }
    if (!v?.is_active || v?.products?.status !== 'active') {
      return NextResponse.json({ error: 'One or more products are no longer available' }, { status: 409 })
    }
    const available = (v.quantity ?? 0) - (v.reserved_quantity ?? 0)
    if (available < item.quantity) {
      return NextResponse.json({ error: `Insufficient stock for a product (${available} left)` }, { status: 409 })
    }
  }

  // Calculate totals
  let subtotal = 0
  for (const item of cartItems) {
    const v = item.product_variants as unknown as { price: number }
    subtotal += (v?.price ?? 0) * item.quantity
  }

  // Apply coupon if provided
  let discountAmount = 0
  let couponId: string | null = null
  if (coupon_code) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, discount_type, discount_value, min_order_value, max_uses, used_count, expires_at')
      .eq('code', coupon_code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (coupon) {
      const now       = new Date()
      const expired   = coupon.expires_at && new Date(coupon.expires_at) < now
      const exhausted = coupon.max_uses !== null && (coupon.used_count ?? 0) >= coupon.max_uses
      const tooSmall  = coupon.min_order_value && subtotal < coupon.min_order_value

      if (!expired && !exhausted && !tooSmall) {
        couponId = coupon.id
        discountAmount = coupon.discount_type === 'percentage'
          ? Math.round((subtotal * coupon.discount_value) / 100)
          : coupon.discount_value
      }
    }
  }

  const shippingAmount = subtotal > 499 ? 0 : 49
  const totalAmount    = subtotal - discountAmount + shippingAmount

  // Create order row
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id:         user.id,
      shipping_address_id: address_id,
      payment_method,
      subtotal_amount:  subtotal,
      discount_amount:  discountAmount,
      shipping_amount:  shippingAmount,
      total_amount:     totalAmount,
      coupon_id:        couponId,
      status:           'pending',
      payment_status:   'pending',
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Create order items
  const orderItems = cartItems.map((item) => {
    const v = item.product_variants as unknown as { id: string; price: number; products: { id: string; seller_profile_id: string } }
    return {
      order_id:          order.id,
      product_variant_id: v.id,
      product_id:        v.products.id,
      seller_profile_id: v.products.seller_profile_id,
      quantity:          item.quantity,
      unit_price:        v.price,
      status:            'pending',
    }
  })

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
  }

  // For COD: mark order confirmed immediately, skip Razorpay
  if (payment_method === 'cod') {
    await supabase.from('orders').update({ status: 'confirmed', payment_status: 'cod_pending' }).eq('id', order.id)
    await supabase.from('cart_items').delete().eq('user_id', user.id)

    return NextResponse.json({
      data: { order_id: order.id, order_number: order.order_number, payment_method: 'cod' },
    }, { status: 201 })
  }

  // Create Razorpay order
  let rpOrder: { id: string }
  try {
    rpOrder = await createRazorpayOrder({
      orderId:     order.id,
      amountPaise: rupeesToPaise(totalAmount),
      notes:       { order_number: order.order_number, buyer_id: user.id },
    }) as { id: string }
  } catch {
    await supabase.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: 'Payment gateway error' }, { status: 502 })
  }

  // Store Razorpay order ID
  await supabase
    .from('orders')
    .update({ razorpay_order_id: rpOrder.id })
    .eq('id', order.id)

  return NextResponse.json({
    data: {
      order_id:         order.id,
      order_number:     order.order_number,
      razorpay_order_id: rpOrder.id,
      razorpay_key_id:  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount_paise:     rupeesToPaise(totalAmount),
    },
  }, { status: 201 })
}
