import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import type { AuthUser } from '@/features/auth/types'
import { makeStore, renderWithProviders } from '@/test/render'
import { ProtectedRoute, RoleGuard } from './guards'

const customer: AuthUser = {
  id: 1,
  email: 'c@test.local',
  fullName: 'Khách A',
  phone: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
  customerId: 1,
  lastLoginAt: null,
  createdAt: '2026-11-12T00:00:00Z',
  avatarUpdatedAt: null,
}

describe('route guards', () => {
  it('chưa đăng nhập → chuyển tới /login', () => {
    renderWithProviders(
      [
        { path: '/repairs', element: <ProtectedRoute><p>secret</p></ProtectedRoute> },
        { path: '/login', element: <p>login page</p> },
      ],
      { initialPath: '/repairs' },
    )
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })

  it('CUSTOMER vào trang của ADMIN → trang 403', () => {
    const store = makeStore({ status: 'authenticated', user: customer, accessToken: 't' })
    renderWithProviders(<RoleGuard roles={['ADMIN']}><p>admin only</p></RoleGuard>, { store })

    expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
    expect(screen.queryByText('admin only')).not.toBeInTheDocument()
  })

  it('đúng vai trò → hiển thị nội dung', () => {
    const store = makeStore({ status: 'authenticated', user: customer, accessToken: 't' })
    renderWithProviders(<RoleGuard roles={['CUSTOMER']}><p>my repairs</p></RoleGuard>, { store })
    expect(screen.getByText('my repairs')).toBeInTheDocument()
  })
})

describe('LoginPage', () => {
  it('submit form trống hiển thị lỗi validation, không gọi API', async () => {
    renderWithProviders(<LoginPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(await screen.findByText('Vui lòng nhập email')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu')).toBeInTheDocument()
  })
})
