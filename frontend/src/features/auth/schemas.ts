import { z } from 'zod'

/** Quy tắc khớp với validation Backend (@StrongPassword, @VietnamesePhone). */
export const emailSchema = z.string().trim().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ'))

export const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[a-z]/, 'Cần ít nhất 1 chữ thường')
  .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
  .regex(/\d/, 'Cần ít nhất 1 chữ số')

/** 0 = chưa nhập, 1 = yếu, 2 = trung bình, 3 = mạnh */
export type PasswordLevel = 0 | 1 | 2 | 3

/**
 * Độ mạnh mật khẩu:
 * - Yếu: chưa đạt yêu cầu tối thiểu (passwordSchema – khớp @StrongPassword backend), không đăng ký được;
 * - Trung bình: đạt yêu cầu tối thiểu;
 * - Mạnh: đạt yêu cầu và dài từ 12 ký tự có ký tự đặc biệt, hoặc dài từ 14 ký tự.
 */
export function passwordLevel(value: string): PasswordLevel {
  if (!value) return 0
  if (!passwordSchema.safeParse(value).success) return 1
  const special = /[^A-Za-z0-9]/.test(value)
  return (value.length >= 12 && special) || value.length >= 14 ? 3 : 2
}

export const VN_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/

export const phoneSchema = z.string().trim().regex(VN_PHONE, 'Số điện thoại không hợp lệ (VD 0901234567)')

/** SĐT không bắt buộc: chuỗi rỗng hợp lệ (gửi lên API dạng undefined). */
export const optionalPhoneSchema = z.union([z.literal(''), phoneSchema])

export const fullNameSchema = z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(150, 'Họ tên quá dài')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

const confirmMatches = <T extends { password: string; confirmPassword: string }>(v: T) => v.password === v.confirmPassword
const confirmError = { path: ['confirmPassword'], message: 'Mật khẩu nhập lại không khớp' }

/** Đăng ký khách hàng chỉ cần email + mật khẩu; họ tên / SĐT bổ sung ở trang hồ sơ trước khi dùng dịch vụ. */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine(confirmMatches, confirmError)

/** Hoàn tất hồ sơ khách hàng: bắt buộc họ tên và SĐT (khoá để cửa hàng tra cứu khi nhận máy). */
export const completeProfileSchema = z.object({ fullName: fullNameSchema, phone: phoneSchema })

export const forgotPasswordSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu') })
  .refine(confirmMatches, confirmError)

export const profileSchema = z.object({ fullName: fullNameSchema, phone: optionalPhoneSchema })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine(confirmMatches, confirmError)

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
export type ProfileForm = z.infer<typeof profileSchema>
export type CompleteProfileForm = z.infer<typeof completeProfileSchema>
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>
