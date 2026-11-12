import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { WarrantyStatusBadge } from './components/WarrantyStatusBadge'
import { PublicWarrantyCheckPage } from './pages/PublicWarrantyCheckPage'
import { warrantiesApi } from './warrantiesApi'

afterEach(() => vi.restoreAllMocks())

describe('WarrantyStatusBadge', () => {
  it('trạng thái luôn có chữ, không chỉ dựa vào màu', () => {
    renderWithProviders(<WarrantyStatusBadge valid voided={false} daysRemaining={12} />)
    expect(screen.getByText(/Còn hạn/)).toBeInTheDocument()
    expect(screen.getByText(/còn 12 ngày/)).toBeInTheDocument()
  })

  it('đã hủy ưu tiên hơn hết hạn', () => {
    renderWithProviders(<WarrantyStatusBadge valid={false} voided daysRemaining={0} />)
    expect(screen.getByText('Đã hủy bảo hành')).toBeInTheDocument()
  })
})

describe('PublicWarrantyCheckPage', () => {
  it('từ khóa dưới 4 ký tự bị chặn ở client, không gọi API', async () => {
    const spy = vi.spyOn(warrantiesApi, 'publicCheck')
    renderWithProviders(<PublicWarrantyCheckPage />)
    fireEvent.change(screen.getByRole('textbox', { name: /Mã bảo hành/ }), { target: { value: 'WR' } })
    fireEvent.click(screen.getByRole('button', { name: /Tra cứu/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/ít nhất 4 ký tự/)
    expect(spy).not.toHaveBeenCalled()
  })

  it('hiển thị kết quả với serial đã che, không có thông tin cá nhân', async () => {
    vi.spyOn(warrantiesApi, 'publicCheck').mockResolvedValue({
      warrantyCode: 'WR-2026-000001',
      deviceModel: 'iPhone 13',
      serialMasked: 'F2LX*****9QK',
      startDate: '2026-11-01',
      endDate: '2027-02-01',
      valid: true,
      daysRemaining: 81,
    })
    renderWithProviders(<PublicWarrantyCheckPage />)
    fireEvent.change(screen.getByRole('textbox', { name: /Mã bảo hành/ }), { target: { value: 'WR-2026-000001' } })
    fireEvent.click(screen.getByRole('button', { name: /Tra cứu/ }))
    await waitFor(() => expect(screen.getByText('iPhone 13')).toBeInTheDocument())
    expect(screen.getByText('F2LX*****9QK')).toBeInTheDocument()
    expect(screen.getByText(/còn 81 ngày/)).toBeInTheDocument()
    expect(warrantiesApi.publicCheck).toHaveBeenCalledWith('WR-2026-000001')
  })
})
