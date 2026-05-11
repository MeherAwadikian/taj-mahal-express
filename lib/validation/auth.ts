import { z } from 'zod'
import { phoneSchema } from './common'

export const otpRequestSchema = z.object({
  phone: phoneSchema,
})

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  token: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
})

export const emailSignupSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['buyer', 'seller']).default('buyer'),
})

export const emailLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Password is required'),
})

export const passwordResetSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export const newPasswordSchema = z
  .object({
    password:        z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type OtpRequestInput   = z.infer<typeof otpRequestSchema>
export type OtpVerifyInput    = z.infer<typeof otpVerifySchema>
export type EmailSignupInput  = z.infer<typeof emailSignupSchema>
export type EmailLoginInput   = z.infer<typeof emailLoginSchema>
