import { z } from 'zod'
import { uuidSchema, inrAmountSchema, slugSchema } from './common'

export const VALID_GST_RATES = [0, 5, 12, 18, 28] as const

const variantOptionSchema = z.record(z.string(), z.string())

export const productVariantSchema = z.object({
  sku:        z.string().min(3).max(50),
  title:      z.string().min(1).max(200),
  options:    variantOptionSchema,
  price:      inrAmountSchema,
  mrp:        inrAmountSchema,
  is_active:  z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
}).refine(d => d.price <= d.mrp, {
  message: 'Sale price cannot exceed MRP',
  path: ['price'],
})

export const productCreateSchema = z.object({
  title:             z.string().min(10, 'Title must be at least 10 characters').max(200),
  slug:              slugSchema.optional(),
  description:       z.string().min(20, 'Provide at least a 20-character description').max(5000).optional(),
  category_id:       uuidSchema,
  brand:             z.string().max(100).optional(),
  tags:              z.array(z.string().max(30)).max(10).default([]),
  base_price:        inrAmountSchema,
  mrp:               inrAmountSchema,
  gst_rate:          z.number().refine(v => VALID_GST_RATES.includes(v as typeof VALID_GST_RATES[number]), {
                       message: `GST rate must be one of: ${VALID_GST_RATES.join(', ')}`,
                     }).default(18),
  hsn_code:          z.string().regex(/^\d{4,8}$/, 'HSN code must be 4-8 digits').optional(),
  return_policy_days: z.number().int().min(0).max(30).default(7),
  is_cod_available:  z.boolean().default(true),
  warranty_info:     z.string().max(500).optional(),
  country_of_origin: z.string().max(100).default('India'),
  specifications:    z.record(z.string(), z.string()).optional().default({}),
  weight_grams:      z.number().int().positive().optional(),
  variants:          z.array(productVariantSchema).min(1, 'At least one variant is required'),
}).refine(d => d.base_price <= d.mrp, {
  message: 'Sale price cannot exceed MRP',
  path: ['base_price'],
})

export const productUpdateSchema = productCreateSchema.partial().omit({ variants: true })

export const productStatusSchema = z.object({
  status: z.enum(['draft', 'pending_review', 'active', 'paused']),
})

// Admin moderation
export const productModerationSchema = z.object({
  product_id:       uuidSchema,
  action:           z.enum(['approve', 'reject']),
  rejection_reason: z.string().min(10).max(500).optional(),
}).refine(d => d.action !== 'reject' || !!d.rejection_reason, {
  message: 'Rejection reason is required when rejecting a product',
  path: ['rejection_reason'],
})

export type ProductCreateInput    = z.infer<typeof productCreateSchema>
export type ProductVariantInput   = z.infer<typeof productVariantSchema>
export type ProductUpdateInput    = z.infer<typeof productUpdateSchema>
export type ProductModerationInput = z.infer<typeof productModerationSchema>
