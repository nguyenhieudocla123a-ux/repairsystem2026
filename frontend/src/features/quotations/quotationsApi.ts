import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { QuotationStatus } from '@/types/enums'
import { cleanParams } from '@/utils/params'
import type { PartGrade } from '@/features/inventory/inventoryApi'

/** Kiểu khớp QuotationDtos.java – docs/api-specification.md §8 */
export type QuotationItemType = 'LABOR' | 'PART'

export interface QuotationItem {
  id: number
  itemType: QuotationItemType
  partId: number | null
  partSku: string | null
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  /** Loại linh kiện + số tháng bảo hành đã báo cho khách (chỉ dòng linh kiện) */
  partGrade: PartGrade | null
  warrantyMonths: number | null
}

export interface Quotation {
  id: number
  repairOrderId: number
  repairOrderCode: string
  versionNo: number
  status: QuotationStatus
  items: QuotationItem[]
  laborTotal: number
  partsTotal: number
  discount: number
  totalAmount: number
  note: string | null
  validUntil: string | null
  customerResponseNote: string | null
  createdByName: string
  respondedByName: string | null
  sentAt: string | null
  respondedAt: string | null
  createdAt: string
  version: number
}

export interface QuotationSummary {
  id: number
  repairOrderId: number
  repairOrderCode: string
  customerName: string
  versionNo: number
  status: QuotationStatus
  totalAmount: number
  sentAt: string | null
  respondedAt: string | null
  createdAt: string
}

export interface QuotationItemRequest {
  itemType: QuotationItemType
  partId?: number
  description?: string
  quantity: number
  /** Bỏ trống với dòng linh kiện → Backend lấy giá bán hiện tại */
  unitPrice?: number
}

export interface QuotationRequest {
  items: QuotationItemRequest[]
  discount?: number
  note?: string
  validUntil?: string
}

export const quotationsApi = {
  ofOrder: (orderId: number) => http.get<Quotation[]>(`/repair-orders/${orderId}/quotations`).then((r) => r.data),
  create: (orderId: number, body: QuotationRequest) =>
    http.post<Quotation>(`/repair-orders/${orderId}/quotations`, body).then((r) => r.data),
  update: (id: number, body: QuotationRequest) => http.put<Quotation>(`/quotations/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/quotations/${id}`),
  send: (id: number) => http.post<Quotation>(`/quotations/${id}/send`).then((r) => r.data),
  approve: (id: number, note?: string) => http.post<Quotation>(`/quotations/${id}/approve`, { note }).then((r) => r.data),
  reject: (id: number, note?: string) => http.post<Quotation>(`/quotations/${id}/reject`, { note }).then((r) => r.data),
  search: (query: PageQuery & { status?: QuotationStatus; q?: string }) =>
    http.get<PageResponse<QuotationSummary>>('/quotations', { params: cleanParams(query) }).then((r) => r.data),
  mine: (query: PageQuery & { status?: QuotationStatus }) =>
    http.get<PageResponse<QuotationSummary>>('/me/quotations', { params: cleanParams(query) }).then((r) => r.data),
}
