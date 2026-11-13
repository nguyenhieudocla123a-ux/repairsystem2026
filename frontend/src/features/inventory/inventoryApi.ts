import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { DeviceType } from '@/types/enums'
import { cleanParams } from '@/utils/params'

/** Kiểu khớp InventoryDtos.java – docs/api-specification.md §9 */
/** Chất lượng / nguồn gốc linh kiện */
export type PartGrade = 'OEM' | 'ORIGINAL_USED' | 'AFTERMARKET' | 'GENERIC'

export const PART_GRADE_CONFIG: Record<PartGrade, { label: string; short: string; color: string }> = {
  OEM: { label: 'Chính hãng', short: 'Chính hãng', color: 'green' },
  ORIGINAL_USED: { label: 'Zin tháo máy', short: 'Zin tháo máy', color: 'blue' },
  AFTERMARKET: { label: 'Linh kiện thay thế (có thương hiệu)', short: 'Thay thế', color: 'gold' },
  GENERIC: { label: 'Linh kiện thay thế không thương hiệu', short: 'Không thương hiệu', color: 'default' },
}
export const PART_GRADE_OPTIONS = (Object.keys(PART_GRADE_CONFIG) as PartGrade[]).map((value) => ({ value, label: PART_GRADE_CONFIG[value].label }))

/** Nhóm linh kiện + bảo hành mặc định (PartCategoryResponse) */
export interface PartCategory {
  id: number
  code: string
  name: string
  deviceTypes: DeviceType[]
  defaultWarrantyMonths: number
  warrantyScope: string | null
  exclusions: string | null
  sortOrder: number
  active: boolean
  version: number
  /** Số linh kiện đang kinh doanh + tổng tồn của nhóm */
  partCount: number
  stockQuantity: number
}

export interface PartCategoryRequest {
  code?: string
  name: string
  deviceTypes: DeviceType[]
  defaultWarrantyMonths: number
  warrantyScope?: string
  exclusions?: string
  sortOrder?: number
  active?: boolean
  version?: number
}

export interface PartResponse {
  id: number
  sku: string
  name: string
  categoryId: number | null
  categoryCode: string | null
  categoryName: string | null
  /** null = dùng chung nhiều loại thiết bị */
  deviceType: DeviceType | null
  grade: PartGrade | null
  brand: string | null
  compatibleModels: string | null
  /** Bảo hành riêng; null = theo nhóm */
  warrantyMonths: number | null
  effectiveWarrantyMonths: number
  /** null = chưa có ảnh thật (hiển thị ảnh mặc định của nhóm) */
  imageUpdatedAt: string | null
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
  categoryCode: string | null
  categoryName: string | null
  deviceType: DeviceType | null
  grade: PartGrade | null
  warrantyMonths: number
  imageUpdatedAt: string | null
}

export interface PartRequest {
  sku: string
  name: string
  categoryId: number
  deviceType?: DeviceType | null
  grade: PartGrade
  brand?: string
  compatibleModels?: string
  warrantyMonths?: number | null
  unit: string
  costPrice: number
  sellingPrice: number
  minStockLevel: number
  /** Chỉ khi tạo: số lượng nhập ban đầu → ghi sổ kho "tồn đầu kỳ" */
  initialQuantity?: number
  supplierName?: string
  version?: number
}

export type InventoryTransactionType = 'IMPORT' | 'EXPORT' | 'RETURN' | 'ADJUSTMENT'

export interface InventoryTransaction {
  id: number
  partId: number
  partSku: string
  partName: string
  partUnit: string
  partCategoryCode: string | null
  partImageUpdatedAt: string | null
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

/** Tổng hợp sổ kho theo bộ lọc + giá trị tồn hiện tại */
export interface LedgerSummary {
  importQuantity: number
  importValue: number
  exportQuantity: number
  exportValue: number
  returnQuantity: number
  returnValue: number
  adjustmentQuantity: number
  transactionCount: number
  stockQuantity: number
  stockValue: number
}

export interface PartUsage {
  partId: number
  partSku: string
  partName: string
  unit: string
  quantityUsed: number
}

export const inventoryApi = {
  search: (query: PageQuery & { q?: string; categoryId?: number; deviceType?: DeviceType; lowStock?: boolean; active?: boolean }) =>
    http.get<PageResponse<PartResponse>>('/parts', { params: cleanParams(query) }).then((r) => r.data),
  options: () => http.get<PartOption[]>('/parts/options').then((r) => r.data),
  /** deviceType: số linh kiện / tồn trên từng nhóm chỉ tính linh kiện của loại thiết bị đó (+ dùng chung) */
  categories: (deviceType?: DeviceType) => http.get<PartCategory[]>('/part-categories', { params: { deviceType } }).then((r) => r.data),
  createCategory: (body: PartCategoryRequest) => http.post<PartCategory>('/part-categories', body).then((r) => r.data),
  updateCategory: (id: number, body: PartCategoryRequest) => http.put<PartCategory>(`/part-categories/${id}`, body).then((r) => r.data),
  uploadImage: (id: number, image: Blob) => {
    const form = new FormData()
    form.append('file', image, image.type === 'image/webp' ? 'part.webp' : 'part.jpg')
    return http.put<PartResponse>(`/parts/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },
  deleteImage: (id: number) => http.delete<PartResponse>(`/parts/${id}/image`).then((r) => r.data),
  create: (body: PartRequest) => http.post<PartResponse>('/parts', body).then((r) => r.data),
  update: (id: number, body: PartRequest) => http.put<PartResponse>(`/parts/${id}`, body).then((r) => r.data),
  setActive: (id: number, active: boolean) => http.patch<PartResponse>(`/parts/${id}/active`, { active }).then((r) => r.data),
  importStock: (id: number, body: { quantity: number; unitCost?: number; supplierName?: string; note?: string }) =>
    http.post<PartResponse>(`/parts/${id}/import`, body).then((r) => r.data),
  adjust: (id: number, body: { newQuantity: number; note: string }) =>
    http.post<PartResponse>(`/parts/${id}/adjust`, body).then((r) => r.data),
  transactions: (query: PageQuery & { partId?: number; type?: InventoryTransactionType; repairOrderId?: number; from?: string; to?: string }) =>
    http.get<PageResponse<InventoryTransaction>>('/inventory/transactions', { params: cleanParams(query) }).then((r) => r.data),

  summary: (query: { partId?: number; type?: InventoryTransactionType; from?: string; to?: string }) =>
    http.get<LedgerSummary>('/inventory/summary', { params: cleanParams(query) }).then((r) => r.data),

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
