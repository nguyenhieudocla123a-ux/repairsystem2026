import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import { cleanParams } from '@/utils/params'

/** Kiểu khớp InventoryDtos.java – docs/api-specification.md §9 */
export interface PartResponse {
  id: number
  sku: string
  name: string
  category: string | null
  unit: string
  /** null với KTV – giá vốn là thông tin nội bộ */
  costPrice: number | null
  sellingPrice: number
  quantityOnHand: number
  minStockLevel: number
  lowStock: boolean
  active: boolean
  version: number
}

export interface PartOption {
  id: number
  sku: string
  name: string
  unit: string
  sellingPrice: number
  quantityOnHand: number
}

export interface PartRequest {
  sku: string
  name: string
  category?: string
  unit: string
  costPrice: number
  sellingPrice: number
  minStockLevel: number
  version?: number
}

export type InventoryTransactionType = 'IMPORT' | 'EXPORT' | 'RETURN' | 'ADJUSTMENT'

export interface InventoryTransaction {
  id: number
  partId: number
  partSku: string
  partName: string
  type: InventoryTransactionType
  quantity: number
  balanceAfter: number
  unitCost: number | null
  repairOrderId: number | null
  repairOrderCode: string | null
  supplierName: string | null
  note: string | null
  createdByName: string
  createdAt: string
}

export interface PartUsage {
  partId: number
  partSku: string
  partName: string
  unit: string
  quantityUsed: number
}

export const inventoryApi = {
  search: (query: PageQuery & { q?: string; category?: string; lowStock?: boolean; active?: boolean }) =>
    http.get<PageResponse<PartResponse>>('/parts', { params: cleanParams(query) }).then((r) => r.data),
  options: () => http.get<PartOption[]>('/parts/options').then((r) => r.data),
  categories: () => http.get<string[]>('/parts/categories').then((r) => r.data),
  create: (body: PartRequest) => http.post<PartResponse>('/parts', body).then((r) => r.data),
  update: (id: number, body: PartRequest) => http.put<PartResponse>(`/parts/${id}`, body).then((r) => r.data),
  setActive: (id: number, active: boolean) => http.patch<PartResponse>(`/parts/${id}/active`, { active }).then((r) => r.data),
  importStock: (id: number, body: { quantity: number; unitCost?: number; supplierName?: string; note?: string }) =>
    http.post<PartResponse>(`/parts/${id}/import`, body).then((r) => r.data),
  adjust: (id: number, body: { newQuantity: number; note: string }) =>
    http.post<PartResponse>(`/parts/${id}/adjust`, body).then((r) => r.data),
  transactions: (query: PageQuery & { partId?: number; type?: InventoryTransactionType; repairOrderId?: number; from?: string; to?: string }) =>
    http.get<PageResponse<InventoryTransaction>>('/inventory/transactions', { params: cleanParams(query) }).then((r) => r.data),

  usage: (orderId: number) => http.get<PartUsage[]>(`/repair-orders/${orderId}/parts`).then((r) => r.data),
  exportToOrder: (orderId: number, body: { partId: number; quantity: number; note?: string }) =>
    http.post<PartUsage[]>(`/repair-orders/${orderId}/parts`, body).then((r) => r.data),
  returnFromOrder: (orderId: number, body: { partId: number; quantity: number; note?: string }) =>
    http.post<PartUsage[]>(`/repair-orders/${orderId}/parts/return`, body).then((r) => r.data),
}

export const TRANSACTION_TYPE_CONFIG: Record<InventoryTransactionType, { label: string; color: string }> = {
  IMPORT: { label: 'Nhập kho', color: 'green' },
  EXPORT: { label: 'Xuất cho phiếu', color: 'blue' },
  RETURN: { label: 'Hoàn kho', color: 'cyan' },
  ADJUSTMENT: { label: 'Điều chỉnh', color: 'orange' },
}
