import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import type { Role } from '@/types/enums'

/** Chưa đăng nhập → chuyển /login (ghi nhớ trang định vào để quay lại sau khi đăng nhập). */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status)
  const location = useLocation()

  if (status === 'bootstrapping') return <FullScreenLoader tip="Đang khôi phục phiên đăng nhập..." />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

/** Đã đăng nhập thì không vào lại trang login/register. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status)
  if (status === 'bootstrapping') return <FullScreenLoader />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return children
}

/** Chặn theo vai trò ở tầng giao diện. Backend vẫn trả 403 nếu gọi API trái quyền. */
export function RoleGuard({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const role = useAppSelector((s) => s.auth.user?.role)
  if (!role || !roles.includes(role)) return <ForbiddenPage />
  return children
}
