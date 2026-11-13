import type { Role, UserStatus } from '@/types/enums'

/** UserResponse.java – docs/api-specification.md §2–3 */
export interface AuthUser {
  id: number
  email: string
  fullName: string
  phone: string | null
  role: Role
  status: UserStatus
  customerId: number | null
  lastLoginAt: string | null
  createdAt: string
  /** Phiên bản ảnh đại diện (ISO) – null = chưa có ảnh */
  avatarUpdatedAt: string | null
}

export interface AuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: AuthUser
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  phone: string
  password: string
  address?: string
  /** Mã 6 số gửi tới email ở bước 1 (POST /auth/register/send-code) */
  verificationCode: string
}

export interface SendRegistrationCodeResponse {
  /** Số giây mã còn hiệu lực */
  expiresIn: number
  /** Số giây phải chờ trước khi gửi lại */
  resendAfter: number
}

export interface UpdateProfileRequest {
  fullName: string
  phone?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export type SocialProvider = 'google' | 'facebook'

export interface PendingSocialSignup {
  provider: SocialProvider
  email: string
  fullName: string
}

export interface CompleteSocialSignupRequest {
  fullName: string
  phone: string
  address?: string
  verificationCode: string
}
