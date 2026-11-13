import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { QuotationCard } from './components/QuotationCard'
import type { Quotation } from './quotationsApi'

const base: Quotation = {
  id: 1,
  repairOrderId: 1,
  repairOrderCode: 'RO-2026-000001',
  versionNo: 1,
  status: 'DRAFT',
  items: [
    { id: 1, itemType: 'PART', partId: 7, partSku: 'LCD-IP13', description: 'Màn hình OLED', quantity: 1, unitPrice: 2500000, lineTotal: 2500000, partGrade: null, warrantyMonths: null },
    { id: 2, itemType: 'LABOR', partId: null, partSku: null, description: 'Công thay', quantity: 1, unitPrice: 300000, lineTotal: 300000, partGrade: null, warrantyMonths: null },
  ],
  laborTotal: 300000,
  partsTotal: 2500000,
  discount: 100000,
  totalAmount: 2700000,
  note: null,
  validUntil: '2026-11-19',
  customerResponseNote: null,
  createdByName: 'Lê Thu Ngân',
  respondedByName: null,
  sentAt: null,
  respondedAt: null,
  createdAt: '2026-11-12T00:00:00Z',
  version: 0,
}

const render = (q: Partial<Quotation>, viewer: 'staff' | 'customer' | 'readonly') =>
  renderWithProviders(<QuotationCard quotation={{ ...base, ...q }} viewer={viewer} onChanged={() => undefined} />)

describe('QuotationCard', () => {
  it('nhân viên thấy Sửa / Gửi cho khách với báo giá nháp', () => {
    render({}, 'staff')
    expect(screen.getByRole('button', { name: /Gửi cho khách/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xóa báo giá nháp/ })).toBeInTheDocument()
    expect(screen.getAllByText(/2\.700\.000/).length).toBeGreaterThan(0)
    expect(screen.getByText(/-100\.000/)).toBeInTheDocument()
  })

  it('khách thấy Đồng ý sửa / Từ chối khi báo giá đang chờ', () => {
    render({ status: 'SENT', sentAt: '2026-11-12T00:00:00Z' }, 'customer')
    expect(screen.getByRole('button', { name: /Đồng ý sửa/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Từ chối/ })).toBeInTheDocument()
    expect(screen.queryByText(/lập bởi/)).not.toBeInTheDocument() // không lộ tên nhân viên cho khách
  })

  it('nhân viên xác nhận thay khách có nhãn riêng', () => {
    render({ status: 'SENT' }, 'staff')
    expect(screen.getByRole('button', { name: /Khách đồng ý/ })).toBeInTheDocument()
  })

  it('KTV (readonly) và báo giá đã chốt không có nút thao tác', () => {
    render({ status: 'SENT' }, 'readonly')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
