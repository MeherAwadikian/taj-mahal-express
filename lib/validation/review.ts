import { z } from 'zod'
import { uuidSchema } from './common'

export const reviewCreateSchema = z.object({
  order_item_id: uuidSchema,
  product_id:    uuidSchema,
  rating:        z.number().int().min(1).max(5),
  title:         z.string().max(150).optional(),
  body:          z.string().min(10, 'Review must be at least 10 characters').max(2000).optional(),
})

export const reviewVoteSchema = z.object({
  review_id:  uuidSchema,
  is_helpful: z.boolean(),
})

export const reviewModerationSchema = z.object({
  review_id: uuidSchema,
  action:    z.enum(['approve', 'reject']),
})

export type ReviewCreateInput     = z.infer<typeof reviewCreateSchema>
export type ReviewVoteInput       = z.infer<typeof reviewVoteSchema>
