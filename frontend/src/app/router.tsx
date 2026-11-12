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
import { CustomerDetailPage } from '@/features/customers/pages/CustomerDetailPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { DevicesPage } from '@/features/devices/pages/DevicesPage'
import { MyDevicesPage } from '@/features/portal/pages/MyDevicesPage'
import { MyRepairsPage } from '@/features/portal/pages/MyRepairsPage'
import { ReceptionPage } from '@/features/repairs/pages/ReceptionPage'
import { RepairDetailPage } from '@/features/repairs/pages/RepairDetailPage'
import { RepairRequestsPage } from '@/features/repairs/pages/RepairRequestsPage'
import { RepairsPage } from '@/features/repairs/pages/RepairsPage'
import { TasksPage } from '@/features/repairs/pages/TasksPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { MyQuotationsPage, QuotationsPage } from '@/features/quotations/pages/QuotationsPages'
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
  '/customers': <CustomersPage />,
  '/devices': <DevicesPage />,
  '/reception': <ReceptionPage />,
  '/repair-requests': <RepairRequestsPage />,
  '/repairs': <RepairsPage />,
  '/tasks': <TasksPage />,
  '/my/devices': <MyDevicesPage />,
  '/my/repairs': <MyRepairsPage />,
  '/inventory': <InventoryPage />,
  '/quotations': <QuotationsPage />,
  '/my/quotations': <MyQuotationsPage />,
}

/** Trang chi tiết lồng dưới trang danh sách → breadcrumb tự thành "Khách hàng / Chi tiết". */
const DETAIL_PAGES: Record<string, { element: ReactNode; label: string }> = {
  '/customers': { element: <CustomerDetailPage />, label: 'Chi tiết khách hàng' },
  '/repairs': { element: <RepairDetailPage />, label: 'Chi tiết phiếu' },
  '/my/repairs': { element: <RepairDetailPage />, label: 'Theo dõi sửa chữa' },
}

const appChildren: RouteObject[] = APP_ROUTES.map((r) => {
  const guard = (node: ReactNode) => <RoleGuard roles={r.roles}>{node}</RoleGuard>
  const page = guard(IMPLEMENTED[r.path] ?? <ComingSoonPage title={r.label} milestone={r.milestone} />)
  const detail = DETAIL_PAGES[r.path]
  return {
    path: r.path.slice(1),
    handle: { breadcrumb: r.label } satisfies RouteHandle,
    ...(detail
      ? {
          children: [
            { index: true, element: page },
            { path: ':id', handle: { breadcrumb: detail.label } satisfies RouteHandle, element: guard(detail.element) },
          ],
        }
      : { element: page }),
  }
})

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
