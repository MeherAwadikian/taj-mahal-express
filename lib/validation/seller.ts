import { z } from 'zod'
import { gstinSchema, panSchema, ifscSchema, slugSchema } from './common'

export const BUSINESS_TYPES = [
  'individual',
  'proprietorship',
  'partnership',
  'private_limited',
  'public_limited',
  'llp',
] as const

export const sellerOnboardingSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters').max(200),
  display_name:  z.string().min(2).max(100),
  slug:          slugSchema,
  description:   z.string().max(1000).optional(),
  business_type: z.enum(BUSINESS_TYPES),
  gstin:         gstinSchema,
  pan:           panSchema,
})

export const sellerBankSchema = z.object({
  bank_account_number: z
    .string()
    .min(9, 'Account number must be at least 9 digits')
    .max(18, 'Account number cannot exceed 18 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  bank_ifsc:         ifscSchema,
  bank_account_name: z.string().min(2).max(200),
})

export const sellerProfileUpdateSchema = z.object({
  display_name:     z.string().min(2).max(100).optional(),
  description:      z.string().max(1000).optional(),
  is_vacation_mode: z.boolean().optional(),
})

export const sellerKycReviewSchema = z.object({
  seller_id:   z.string().uuid(),
  action:      z.enum(['approve', 'reject']),
  reason:      z.string().min(10).max(500).optional(),
}).refine(d => d.action !== 'reject' || !!d.reason, {
  message: 'Rejection reason required',
  path: ['reason'],
})

export type SellerOnboardingInput  = z.infer<typeof sellerOnboardingSchema>
export type SellerBankInput        = z.infer<typeof sellerBankSchema>
export type SellerProfileUpdate    = z.infer<typeof sellerProfileUpdateSchema>
