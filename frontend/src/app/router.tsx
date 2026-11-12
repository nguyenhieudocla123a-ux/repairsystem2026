import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProfilePage } from '@/features/auth/pages/ProfilePage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { STAFF_SCOPE, UsersPage } from '@/features/users/pages/UsersPage'
import { AppLayout, type RouteHandle } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { APP_ROUTES } from '@/routes/appRoutes'
import { GuestRoute, ProtectedRoute, RoleGuard } from '@/routes/guards'

/** Trang đã có nội dung thật; còn lại hiển thị ComingSoonPage. */
const IMPLEMENTED: Record<string, ReactNode> = {
  '/dashboard': <DashboardPage />,
  '/profile': <ProfilePage />,
  '/users': <UsersPage title="Người dùng" description="Tất cả tài khoản trong hệ thống, gồm cả khách hàng." />,
  '/staff': (
    <UsersPage title="Nhân viên & KTV" description="Tài khoản nội bộ: quản trị viên, nhân viên tiếp nhận, kỹ thuật viên." scopeRoles={STAFF_SCOPE} />
  ),
}

const appChildren: RouteObject[] = APP_ROUTES.map((r) => ({
  path: r.path.slice(1),
  handle: { breadcrumb: r.label } satisfies RouteHandle,
  element: <RoleGuard roles={r.roles}>{IMPLEMENTED[r.path] ?? <ComingSoonPage title={r.label} milestone={r.milestone} />}</RoleGuard>,
}))

const devRoutes: RouteObject[] = []
if (import.meta.env.DEV) {
  // Chỉ tồn tại khi chạy `npm run dev` – bị loại khỏi bundle production nhờ dead-code elimination
  const UiKitPage = lazy(() => import('@/pages/dev/UiKitPage').then((m) => ({ default: m.UiKitPage })))
  devRoutes.push({
    path: '/dev/ui-kit',
    element: (
      <Suspense fallback={<FullScreenLoader />}>
        <UiKitPage />
      </Suspense>
    ),
  })
}

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: '/reset-password', element: <ResetPasswordPage /> }],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [...appChildren, { path: '*', element: <NotFoundPage /> }],
  },
  ...devRoutes,
]

export const router = createBrowserRouter(routes)
