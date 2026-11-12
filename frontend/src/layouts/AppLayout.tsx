import { Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { logout } from '@/features/auth/authSlice'
import { NotificationBellPanel } from '@/features/notifications/components/NotificationBellPanel'
import { useNotificationSocket } from '@/features/notifications/useNotificationSocket'
import type { BreadcrumbEntry } from './AppHeader'
import { AppShell } from './AppShell'

export interface RouteHandle {
  breadcrumb?: string
}

/** Nối AppShell (trình bày) với Redux + Router. Chỉ render khi đã đăng nhập (ProtectedRoute bảo đảm). */
export function AppLayout() {
  const user = useAppSelector((s) => s.auth.user)!
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const matches = useMatches()
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount)
  useNotificationSocket() // kết nối STOMP khi đã đăng nhập

  const breadcrumbs: BreadcrumbEntry[] = [
    { title: 'Trang chủ', path: '/dashboard' },
    ...matches
      .filter((m) => (m.handle as RouteHandle | undefined)?.breadcrumb && m.pathname !== '/dashboard')
      .map((m) => ({ title: (m.handle as RouteHandle).breadcrumb!, path: m.pathname })),
  ]

  return (
    <AppShell
      role={user.role}
      userName={user.fullName}
      breadcrumbs={breadcrumbs}
      selectedPath={location.pathname}
      unreadCount={unreadCount}
      notificationContent={<NotificationBellPanel />}
      onNavigate={(path) => navigate(path)}
      onQuickSearch={(keyword) => navigate(`/repairs?q=${encodeURIComponent(keyword)}`)}
      onLogout={async () => {
        await dispatch(logout())
        navigate('/login', { replace: true })
      }}
    >
      <Outlet />
    </AppShell>
  )
}
