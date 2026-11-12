import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { cleanParams, toSortParam } from '@/utils/params'
import { RepairProgress } from './components/RepairProgress'
import { TransitionActions } from './components/TransitionActions'
import type { RepairOrderDetail } from './repairsApi'

const baseOrder: RepairOrderDetail = {
  id: 1,
  code: 'RO-2026-000001',
  status: 'REPAIRING',
  priority: 'NORMAL',
  customer: { id: 1, code: 'CUS-000001', fullName: 'Khách', phone: '0900000004', email: null },
  device: { id: 1, name: 'iPhone 13', deviceType: 'PHONE', brand: 'Apple', model: '13', serialNumber: null },
  technician: { id: 3, fullName: 'KTV' },
  createdBy: { id: 2, fullName: 'Staff' },
  reportedIssue: 'Sọc màn',
  deviceCondition: null,
  accessories: null,
  diagnosis: null,
  solution: null,
  warrantyRepair: false,
  expectedReturnDate: null,
  finalAmount: null,
  paymentMethod: null,
  cancelReason: null,
  receivedAt: '2026-11-12T00:00:00Z',
  completedAt: null,
  deliveredAt: null,
  updatedAt: '2026-11-12T00:00:00Z',
  repairRequestId: null,
  allowedTransitions: [],
  canEditReception: false,
  canAssign: false,
  canDiagnose: false,
  canQuote: false,
  canDeliver: false,
  canUseParts: false,
  approvedQuotationTotal: null,
  warrantyId: null,
  warrantyCode: null,
  version: 3,
}

describe('TransitionActions', () => {
  it('chỉ hiển thị nút cho các trạng thái Backend cho phép', () => {
    renderWithProviders(<TransitionActions order={{ ...baseOrder, allowedTransitions: ['WAITING_FOR_PARTS', 'COMPLETED'] }} onChanged={() => undefined} />)

    expect(screen.getByRole('button', { name: /Chờ linh kiện/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hoàn thành sửa chữa/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hủy phiếu/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bắt đầu kiểm tra/ })).not.toBeInTheDocument()
  })

  it('không có quyền gì → không render nút nào', () => {
    renderWithProviders(<TransitionActions order={baseOrder} onChanged={() => undefined} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('khách hàng thấy nhãn "Hủy yêu cầu sửa" thay vì "Hủy phiếu"', () => {
    renderWithProviders(<TransitionActions asCustomer order={{ ...baseOrder, status: 'RECEIVED', allowedTransitions: ['CANCELLED'] }} onChanged={() => undefined} />)
    expect(screen.getByRole('button', { name: /Hủy yêu cầu sửa/ })).toBeInTheDocument()
  })
})

describe('RepairProgress', () => {
  it('trạng thái phụ quy về mốc chính (chờ linh kiện → Sửa chữa)', () => {
    renderWithProviders(<RepairProgress status="WAITING_FOR_PARTS" />)
    expect(screen.getByLabelText('Tiến độ: Chờ linh kiện')).toBeInTheDocument()
    expect(screen.getByText('Chờ linh kiện')).toBeInTheDocument() // nhãn của bước hiện tại
  })
})

describe('params', () => {
  it('cleanParams bỏ giá trị rỗng và nối mảng enum', () => {
    expect(cleanParams({ page: 0, q: '  ', status: ['RECEIVED', 'INSPECTING'], technicianId: undefined, from: null, empty: [] })).toEqual({
      page: 0,
      status: 'RECEIVED,INSPECTING',
    })
  })

  it('toSortParam chỉ nhận field trong whitelist', () => {
    const allowed = new Set(['receivedAt'])
    expect(toSortParam('receivedAt', 'descend', allowed)).toBe('receivedAt,desc')
    expect(toSortParam('passwordHash', 'ascend', allowed)).toBeUndefined()
    expect(toSortParam('receivedAt', null, allowed)).toBeUndefined()
  })
})
