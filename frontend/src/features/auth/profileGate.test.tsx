import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from 'antd'
import { Outlet, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeStore, renderWithProviders } from '@/test/render'
import { ProfileGateProvider, ProfileIncompleteBanner } from './components/ProfileGate'
import { isProfileComplete, useProfileGate } from './profileGate'
import type { AuthUser } from './types'

const customer = (phone: string | null): AuthUser => ({
  id: 7, email: 'khach@gmail.com', fullName: 'khach', phone, role: 'CUSTOMER', status: 'ACTIVE',
  customerId: 3, lastLoginAt: null, createdAt: '2026-11-19T00:00:00Z', avatarUpdatedAt: null,
})

function ProfileProbe() {
  const state = useLocation().state as { returnTo?: string } | null
  return <p>Trang hồ sơ – quay lại {state?.returnTo}</p>
}

function ServiceButton() {
  const { requireProfile } = useProfileGate()
  return <Button onClick={() => requireProfile(() => {})}>Gửi yêu cầu sửa chữa</Button>
}

const routes = [{
  element: <ProfileGateProvider><ProfileIncompleteBanner /><Outlet /></ProfileGateProvider>,
  children: [
    { path: '/my/repairs', element: <ServiceButton /> },
    { path: '/profile', element: <ProfileProbe /> },
  ],
}]

const renderAs = (user: AuthUser) =>
  renderWithProviders(routes, { store: makeStore({ status: 'authenticated', user, accessToken: 't' }), initialPath: '/my/repairs' })

describe('hoàn tất hồ sơ khách hàng', () => {
  it('thiếu SĐT là chưa hoàn tất; nhân viên luôn coi là đủ', () => {
    expect(isProfileComplete(customer(null))).toBe(false)
    expect(isProfileComplete(customer('0901234567'))).toBe(true)
    expect(isProfileComplete({ ...customer(null), role: 'STAFF' })).toBe(true)
  })

  it('"Hoàn tất ngay" đưa tới trang hồ sơ, nhớ trang đang làm để quay lại', async () => {
    renderAs(customer(null))
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tất ngay' }))
    expect(await screen.findByText('Trang hồ sơ – quay lại /my/repairs')).toBeInTheDocument()
    // Ở trang hồ sơ thì không lặp lại dải nhắc
    expect(screen.queryByRole('button', { name: 'Hoàn tất ngay' })).not.toBeInTheDocument()
  })

  it('bấm nút dịch vụ khi chưa đủ hồ sơ → hộp nhắc "Đi tới hồ sơ"', async () => {
    renderAs(customer(null))
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa chữa' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Đi tới hồ sơ' }))
    await waitFor(() => expect(screen.getByText('Trang hồ sơ – quay lại /my/repairs')).toBeInTheDocument())
  })

  it('hồ sơ đủ thì không có dải nhắc', () => {
    renderAs(customer('0901234567'))
    expect(screen.queryByText('Hồ sơ của bạn chưa đủ thông tin')).not.toBeInTheDocument()
  })
})
