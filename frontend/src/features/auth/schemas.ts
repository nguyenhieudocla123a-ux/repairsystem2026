import { z } from 'zod'

/** Quy tắc khớp với validation Backend (docs/api-specification.md §2). */
const email = z.string().trim().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ'))

const password = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
  .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
  .regex(/\d/, 'Cần ít nhất 1 chữ số')

export const VN_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(150, 'Họ tên quá dài'),
    email,
    phone: z.string().trim().regex(VN_PHONE, 'Số điện thoại không hợp lệ (VD 0901234567)'),
    password,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
    address: z.string().trim().max(255, 'Địa chỉ quá dài').optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  })

export const forgotPasswordSchema = z.object({ email })

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
