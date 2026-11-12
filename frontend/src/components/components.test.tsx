import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RepairStatusTag } from '@/features/repairs/components/RepairStatusTag'
import { renderWithProviders } from '@/test/render'
import { MoneyText } from './MoneyText'
import { StatCard } from './StatCard'

describe('design system components', () => {
  it('RepairStatusTag hiển thị nhãn tiếng Việt', () => {
    renderWithProviders(<RepairStatusTag status="WAITING_CONFIRMATION" />)
    expect(screen.getByText('Chờ khách xác nhận')).toBeInTheDocument()
  })

  it('MoneyText định dạng VND, null → —', () => {
    renderWithProviders(
      <>
        <MoneyText value={2800000} />
        <MoneyText value={null} />
      </>,
    )
    expect(screen.getByText(/2\.800\.000/)).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('StatCard có onClick render thành button bấm được bằng bàn phím', async () => {
    const onClick = vi.fn()
    renderWithProviders(<StatCard label="Đang sửa" value="37" onClick={onClick} />)

    const button = screen.getByRole('button', { name: /Đang sửa/ })
    button.focus()
    await userEvent.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('StatCard không có onClick thì không phải button', () => {
    renderWithProviders(<StatCard label="Tổng phiếu" value="10" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
