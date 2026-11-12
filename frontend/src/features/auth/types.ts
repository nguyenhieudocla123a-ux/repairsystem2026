import type { Role, UserStatus } from '@/types/enums'

/** UserResponse – docs/api-specification.md §2 */
export interface AuthUser {
  id: number
  email: string
  fullName: string
  phone: string | null
  role: Role
  status: UserStatus
  customerId: number | null
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
}

export interface ForgotPasswordRequest {
  email: string
}
