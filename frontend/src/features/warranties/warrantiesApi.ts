import type { DeviceSummary } from '@/features/devices/devicesApi'
import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { RepairPriority } from '@/types/enums'
import { cleanParams } from '@/utils/params'
import type { PartGrade } from '@/features/inventory/inventoryApi'

/** Kiểu khớp WarrantyDtos.java – docs/api-specification.md §10 */
export interface Warranty {
  id: number
  code: string
  repairOrderId: number
  repairOrderCode: string
  customerId: number
  customerName: string
  device: DeviceSummary
  startDate: string
  endDate: string
  months: number
  terms: string | null
  status: 'ACTIVE' | 'VOID'
  voidReason: string | null
  valid: boolean
  daysRemaining: number
  createdAt: string
  /** Bảo hành theo từng linh kiện / dịch vụ; hạn của phiếu = dòng dài nhất */
  items: WarrantyItem[]
}

export interface WarrantyItem {
  id: number
  description: string
  partGrade: PartGrade | null
  quantity: number
  months: number
  endDate: string
  valid: boolean
  daysRemaining: number
  exclusions: string | null
}

export type ClaimStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED'

export interface WarrantyClaim {
  id: number
  code: string
  warrantyId: number
  warrantyCode: string
  customerName: string
  deviceName: string
  warrantyItemId: number | null
  warrantyItemDescription: string | null
  issueDescription: string
  status: ClaimStatus
  resolutionNote: string | null
  repairOrderId: number | null
  repairOrderCode: string | null
  createdByName: string
  handledByName: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface WarrantyDetail {
  warranty: Warranty
  claims: WarrantyClaim[]
  canClaim: boolean
}

export interface PublicWarrantyCheck {
  warrantyCode: string
  deviceModel: string
  serialMasked: string | null
  startDate: string
  endDate: string
  valid: boolean
  daysRemaining: number
  items: { description: string; endDate: string; valid: boolean }[]
}

export const warrantiesApi = {
  search: (query: PageQuery & { q?: string; validOnly?: boolean }) =>
    http.get<PageResponse<Warranty>>('/warranties', { params: cleanParams(query) }).then((r) => r.data),
  lookup: (keyword: string) => http.get<Warranty[]>('/warranties/lookup', { params: { keyword } }).then((r) => r.data),
  get: (id: number) => http.get<WarrantyDetail>(`/warranties/${id}`).then((r) => r.data),
  void: (id: number, reason: string) => http.patch<Warranty>(`/warranties/${id}/void`, { reason }).then((r) => r.data),
  mine: () => http.get<Warranty[]>('/me/warranties').then((r) => r.data),
  /** warrantyItemId: linh kiện / dịch vụ bị lỗi (bắt buộc khi phiếu có nhiều dòng) */
  createClaim: (id: number, issueDescription: string, warrantyItemId?: number) =>
    http.post<WarrantyClaim>(`/warranties/${id}/claims`, { issueDescription, warrantyItemId }).then((r) => r.data),
  claims: (query: PageQuery & { status?: ClaimStatus[] }) =>
    http.get<PageResponse<WarrantyClaim>>('/warranty-claims', { params: cleanParams(query) }).then((r) => r.data),
  accept: (id: number, body: { technicianId?: number; deviceCondition?: string; priority?: RepairPriority; note?: string }) =>
    http.post<WarrantyClaim>(`/warranty-claims/${id}/accept`, body).then((r) => r.data),
  reject: (id: number, reason: string) => http.post<WarrantyClaim>(`/warranty-claims/${id}/reject`, { reason }).then((r) => r.data),
  publicCheck: (keyword: string) =>
    http.get<PublicWarrantyCheck>('/public/warranty-check', { params: { keyword }, skipAuthRefresh: true }).then((r) => r.data),
}

export const CLAIM_STATUS_CONFIG: Record<ClaimStatus, { label: string; color: string }> = {
  SUBMITTED: { label: 'Chờ xử lý', color: 'gold' },
  ACCEPTED: { label: 'Đang sửa bảo hành', color: 'blue' },
  REJECTED: { label: 'Từ chối', color: 'red' },
  RESOLVED: { label: 'Đã xử lý xong', color: 'green' },
}
