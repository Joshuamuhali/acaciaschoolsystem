import { z } from 'zod'

// Pupil validation schema
export const pupilSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  sex: z.enum(['M', 'F'], { required_error: 'Sex is required' }),
  grade_id: z.string().uuid('Invalid grade selected'),
  status: z.enum(['new', 'old']).default('new'),
})

// User validation schema
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Name is required'),
  role: z.enum(['system_admin', 'school_admin', 'teacher', 'parent']),
})

// Payment validation schema
export const paymentSchema = z.object({
  pupil_id: z.string().uuid('Invalid pupil selected'),
  amount: z.number().positive('Amount must be positive'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['cash', 'bank_transfer', 'mobile_money']),
  term_id: z.string().uuid('Invalid term selected'),
})

// Enrollment validation schema
export const enrollmentSchema = z.object({
  pupil_id: z.string().uuid('Invalid pupil selected'),
  grade_id: z.string().uuid('Invalid grade selected'),
  enrollment_date: z.string().min(1, 'Enrollment date is required'),
  status: z.enum(['active', 'inactive', 'graduated']),
})

// Fee validation schema
export const feeSchema = z.object({
  pupil_id: z.string().uuid('Invalid pupil selected'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  due_date: z.string().min(1, 'Due date is required'),
  fee_type: z.enum(['tuition', 'transport', 'meals', 'uniform', 'books', 'other']),
})

// Type exports for TypeScript
export type PupilInput = z.infer<typeof pupilSchema>
export type UserInput = z.infer<typeof userSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type EnrollmentInput = z.infer<typeof enrollmentSchema>
export type FeeInput = z.infer<typeof feeSchema>
