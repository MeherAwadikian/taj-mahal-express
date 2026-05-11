import { z } from 'zod'

export const uuidSchema    = z.string().uuid('Invalid ID')
export const phoneSchema   = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
export const pincodeSchema = z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code')
export const gstinSchema   = z.string().regex(
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  'Enter a valid GSTIN (15-character format)',
)
export const panSchema     = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid PAN')
export const ifscSchema    = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code')

// INR amounts — max 99,99,999.99
export const inrAmountSchema = z
  .number({ invalid_type_error: 'Amount must be a number' })
  .positive('Amount must be positive')
  .max(9_999_999_99, 'Amount exceeds maximum')
  .multipleOf(0.01, 'Maximum 2 decimal places')

export const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only')

export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
})
