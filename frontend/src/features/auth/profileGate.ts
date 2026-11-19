import { createContext, useContext } from 'react'
import type { AuthUser } from './types'

/** Khách tự đăng ký chỉ có email + mật khẩu; thiếu SĐT = hồ sơ chưa hoàn tất (backend chặn thao tác dịch vụ). */
export function isProfileComplete(user: AuthUser | null): boolean {
  return !user || user.role !== 'CUSTOMER' || Boolean(user.phone && user.fullName)
}

export interface ProfileGate {
  complete: boolean
  /** Hồ sơ đủ → chạy action ngay; chưa đủ → mở hộp "Hoàn tất hồ sơ", lưu xong mới chạy action. */
  requireProfile: (action?: () => void) => void
}

export const ProfileGateContext = createContext<ProfileGate>({ complete: true, requireProfile: (a) => a?.() })

export const useProfileGate = () => useContext(ProfileGateContext)

