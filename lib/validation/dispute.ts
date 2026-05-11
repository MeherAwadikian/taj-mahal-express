import { z } from 'zod'
import { uuidSchema } from './common'

export const DISPUTE_REASONS = [
  'wrong_item',
  'damaged',
  'not_as_described',
  'not_delivered',
  'changed_mind',
  'quality_issue',
  'other',
] as const

export const RESOLUTION_TYPES = ['refund', 'replacement', 'store_credit'] as const

export const disputeOpenSchema = z.object({
  order_item_id:   uuidSchema,
  reason:          z.enum(DISPUTE_REASONS),
  description:     z.string().min(20, 'Describe the issue in at least 20 characters').max(2000),
  resolution_type: z.enum(RESOLUTION_TYPES),
})

export const disputeMessageSchema = z.object({
  dispute_id: uuidSchema,
  message:    z.string().min(1).max(2000),
})

export const disputeResolveSchema = z.object({
  dispute_id:       uuidSchema,
  resolution_type:  z.enum([...RESOLUTION_TYPES, 'rejected'] as const),
  resolution_notes: z.string().min(10).max(1000),
  refund_amount:    z.number().positive().optional(),
})

export type DisputeOpenInput    = z.infer<typeof disputeOpenSchema>
export type DisputeMessageInput = z.infer<typeof disputeMessageSchema>
export type DisputeResolveInput = z.infer<typeof disputeResolveSchema>
