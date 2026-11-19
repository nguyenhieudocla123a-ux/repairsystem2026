import { createContext, useContext } from 'react'
import type { AuthUser } from './types'

export const PROFILE_PATH = '/profile'

/** state khi điều hướng tới trang hồ sơ để hoàn tất: lưu xong quay về returnTo. */
export interface ProfileReturnState {
  returnTo?: string
}

/** Khách tự đăng ký chỉ có email + mật khẩu; thiếu SĐT = hồ sơ chưa hoàn tất (backend chặn thao tác dịch vụ). */
export function isProfileComplete(user: AuthUser | null): boolean {
  return !user || user.role !== 'CUSTOMER' || Boolean(user.phone && user.fullName)
}

/** Họ tên còn là giá trị tạm lấy từ email lúc đăng ký (phần trước @). */
export function hasPlaceholderName(user: AuthUser): boolean {
  return user.fullName === user.email.split('@')[0]
}

export interface ProfileGate {
  complete: boolean
  /** Hồ sơ đủ → chạy action ngay; chưa đủ → nhắc và đưa tới trang hồ sơ. */
  requireProfile: (action?: () => void) => void
  /** Mở trang hồ sơ, nhớ trang hiện tại để quay lại sau khi lưu. */
  goToProfile: () => void
}

export const ProfileGateContext = createContext<ProfileGate>({ complete: true, requireProfile: (a) => a?.(), goToProfile: () => {} })

export const useProfileGate = () => useContext(ProfileGateContext)
