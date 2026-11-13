import type { DeviceSummary } from '@/features/devices/devicesApi'
import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { PaymentMethod, RepairPriority, RepairStatus, Role } from '@/types/enums'
import { cleanParams } from '@/utils/params'
import type { PartGrade } from '@/features/inventory/inventoryApi'

/** Kiểu khớp RepairOrderDtos.java – docs/api-specification.md §6–7 */
export interface RepairOrderSummary {
  id: number
  code: string
  status: RepairStatus
  priority: RepairPriority
  customerId: number
  customerName: string
  customerPhone: string
  deviceId: number
  deviceName: string
  technicianId: number | null
  technicianName: string | null
  warrantyRepair: boolean
  expectedReturnDate: string | null
  receivedAt: string
  updatedAt: string
}

export interface UserBrief {
  id: number
  fullName: string
}

export interface RepairOrderDetail {
  id: number
  code: string
  status: RepairStatus
  priority: RepairPriority
  customer: { id: number; code: string; fullName: string; phone: string; email: string | null }
  device: DeviceSummary
  technician: UserBrief | null
  createdBy: UserBrief
  reportedIssue: string
  deviceCondition: string | null
  accessories: string | null
  diagnosis: string | null
  solution: string | null
  warrantyRepair: boolean
  expectedReturnDate: string | null
  finalAmount: number | null
  paymentMethod: PaymentMethod | null
  cancelReason: string | null
  receivedAt: string
  completedAt: string | null
  deliveredAt: string | null
  updatedAt: string
  repairRequestId: number | null
  allowedTransitions: RepairStatus[]
  canEditReception: boolean
  canAssign: boolean
  canDiagnose: boolean
  /** Lập/gửi báo giá, bàn giao, xuất/hoàn linh kiện – Backend tính theo vai trò & trạng thái */
  canQuote: boolean
  canDeliver: boolean
  canUseParts: boolean
  /** Tổng báo giá đã duyệt mới nhất – số tiền gợi ý khi bàn giao */
  approvedQuotationTotal: number | null
  warrantyId: number | null
  warrantyCode: string | null
  version: number
}

export interface DeliverRequest {
  finalAmount?: number
  paymentMethod?: PaymentMethod
  /** Bảo hành công sửa chữa – chỉ dùng khi không gửi warrantyItems */
  warrantyMonths?: number
  warrantyTerms?: string
  /** Bảo hành theo từng dòng (partId null = công sửa chữa); months 0 = bỏ dòng */
  warrantyItems?: WarrantyItemRequest[]
  note?: string
  version: number
}

export interface WarrantyItemRequest {
  partId?: number | null
  description: string
  quantity?: number
  months: number
}

/** Gợi ý dòng bảo hành khi bàn giao: linh kiện trong báo giá đã duyệt + số tháng đã báo khách */
export interface WarrantyItemSuggestion {
  partId: number | null
  description: string
  categoryName: string | null
  partGrade: PartGrade | null
  quantity: number
  months: number
  exclusions: string | null
}

export interface StatusHistoryEntry {
  id: number
  fromStatus: RepairStatus | null
  toStatus: RepairStatus
  changedByName: string
  changedByRole: Role
  note: string | null
  changedAt: string
}

export interface ReceptionInfo {
  reportedIssue: string
  deviceCondition?: string
  accessories?: string
  priority?: RepairPriority
  expectedReturnDate?: string
  technicianId?: number
}

export interface RepairOrderQuery extends PageQuery {
  status?: RepairStatus[]
  technicianId?: number
  customerId?: number
  priority?: RepairPriority
  q?: string
  from?: string
  to?: string
}

export type RepairRequestStatus = 'PENDING' | 'CONVERTED' | 'REJECTED' | 'CANCELLED'

export interface RepairRequestResponse {
  id: number
  code: string
  customerId: number
  customerName: string
  customerPhone: string
  device: DeviceSummary
  issueDescription: string
  expectedDropOffDate: string | null
  status: RepairRequestStatus
  repairOrderId: number | null
  repairOrderCode: string | null
  rejectReason: string | null
  createdAt: string
}

export const repairsApi = {
  search: (query: RepairOrderQuery) =>
    http.get<PageResponse<RepairOrderSummary>>('/repair-orders', { params: cleanParams({ ...query }) }).then((r) => r.data),
  get: (id: number) => http.get<RepairOrderDetail>(`/repair-orders/${id}`).then((r) => r.data),
  history: (id: number) => http.get<StatusHistoryEntry[]>(`/repair-orders/${id}/history`).then((r) => r.data),
  lookup: (code: string) => http.get<RepairOrderSummary>('/repair-orders/lookup', { params: { code } }).then((r) => r.data),
  create: (body: ReceptionInfo & { customerId: number; deviceId: number }) =>
    http.post<RepairOrderDetail>('/repair-orders', body).then((r) => r.data),
  update: (id: number, body: Omit<ReceptionInfo, 'technicianId'> & { priority: RepairPriority; version: number }) =>
    http.put<RepairOrderDetail>(`/repair-orders/${id}`, body).then((r) => r.data),
  assign: (id: number, technicianId: number) =>
    http.patch<RepairOrderDetail>(`/repair-orders/${id}/assign`, { technicianId }).then((r) => r.data),
  diagnosis: (id: number, body: { diagnosis?: string; solution?: string }) =>
    http.patch<RepairOrderDetail>(`/repair-orders/${id}/diagnosis`, body).then((r) => r.data),
  warrantySuggestions: (id: number) => http.get<WarrantyItemSuggestion[]>(`/repair-orders/${id}/warranty-suggestions`).then((r) => r.data),
  deliver: (id: number, body: DeliverRequest) => http.post<RepairOrderDetail>(`/repair-orders/${id}/deliver`, body).then((r) => r.data),
  transition: (id: number, body: { toStatus: RepairStatus; note?: string; version: number }) =>
    http.post<RepairOrderDetail>(`/repair-orders/${id}/transitions`, body).then((r) => r.data),

  // Cổng khách hàng
  mine: (query: PageQuery & { status?: RepairStatus[] }) =>
    http.get<PageResponse<RepairOrderSummary>>('/me/repair-orders', { params: cleanParams({ ...query }) }).then((r) => r.data),
  cancelMine: (id: number, reason: string) =>
    http.post<RepairOrderDetail>(`/me/repair-orders/${id}/cancel`, { reason }).then((r) => r.data),
}

export const repairRequestsApi = {
  search: (query: PageQuery & { status?: RepairRequestStatus; q?: string }) =>
    http.get<PageResponse<RepairRequestResponse>>('/repair-requests', { params: cleanParams({ ...query }) }).then((r) => r.data),
  convert: (id: number, body: ReceptionInfo) =>
    http.post<RepairOrderDetail>(`/repair-requests/${id}/convert`, body).then((r) => r.data),
  reject: (id: number, reason: string) =>
    http.post<RepairRequestResponse>(`/repair-requests/${id}/reject`, { reason }).then((r) => r.data),

  mine: (query: PageQuery) =>
    http.get<PageResponse<RepairRequestResponse>>('/me/repair-requests', { params: cleanParams({ ...query }) }).then((r) => r.data),
  createMine: (body: { deviceId: number; issueDescription: string; expectedDropOffDate?: string }) =>
    http.post<RepairRequestResponse>('/me/repair-requests', body).then((r) => r.data),
  cancelMine: (id: number) => http.post<RepairRequestResponse>(`/me/repair-requests/${id}/cancel`).then((r) => r.data),
}
