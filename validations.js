import { z } from 'zod'

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').max(20),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6),
  level: z.number().int().min(1).max(11).optional(),
  fullname: z.string().min(1, 'Full name is required'),
  phone: z.string().optional()
})

export const loginSchema = registerSchema.pick({
  email: true,
  password: true
})

export function validateUser (object) {
  return registerSchema.safeParse(object)
}
