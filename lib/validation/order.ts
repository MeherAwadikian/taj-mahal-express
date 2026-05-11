import { z } from 'zod'
import { uuidSchema, pincodeSchema, phoneSchema, inrAmountSchema } from './common'

export const addressSchema = z.object({
  full_name:     z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone:         phoneSchema,
  address_line1: z.string().min(5, 'Enter full address').max(200),
  address_line2: z.string().max(200).optional(),
  city:          z.string().min(2).max(100),
  state:         z.string().min(2).max(100),
  pincode:       pincodeSchema,
  label:         z.enum(['Home', 'Office', 'Other']).optional(),
  is_default:    z.boolean().default(false),
})

export const cartItemSchema = z.object({
  product_id: uuidSchema,
  variant_id: uuidSchema,
  quantity:   z.number().int().min(1).max(100),
})

export const couponApplySchema = z.object({
  code:        z.string().min(3).max(30).toUpperCase(),
  order_total: inrAmountSchema,
})

export const checkoutSchema = z.object({
  address_id:     uuidSchema,
  payment_method: z.enum(['upi', 'card', 'netbanking', 'wallet', 'cod']),
  coupon_code:    z.string().max(30).optional(),
  notes:          z.string().max(500).optional(),
})

// Seller: mark an order item as shipped
export const shipmentCreateSchema = z.object({
  order_item_ids:          z.array(uuidSchema).min(1),
  courier_name:            z.string().min(2).max(100),
  awb_number:              z.string().min(5).max(50),
  tracking_url:            z.string().url().optional(),
  estimated_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const orderCancelSchema = z.object({
  order_id: uuidSchema,
  reason:   z.string().min(5).max(300),
})

export type AddressInput       = z.infer<typeof addressSchema>
export type CartItemInput      = z.infer<typeof cartItemSchema>
export type CheckoutInput      = z.infer<typeof checkoutSchema>
export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>
