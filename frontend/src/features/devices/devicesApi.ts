import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { DeviceType } from '@/types/enums'
import type { RepairOrderSummary } from '@/features/repairs/repairsApi'
import { cleanParams } from '@/utils/params'

/** DeviceResponse.java – docs/api-specification.md §5 */
export interface DeviceResponse {
  id: number
  customerId: number
  customerName: string
  customerCode: string
  name: string
  deviceType: DeviceType
  brand: string | null
  model: string | null
  serialNumber: string | null
  color: string | null
  note: string | null
  createdAt: string
}

export interface DeviceSummary {
  id: number
  name: string
  deviceType: DeviceType
  brand: string | null
  model: string | null
  serialNumber: string | null
}

export interface DeviceRequest {
  customerId?: number
  name: string
  deviceType: DeviceType
  brand?: string
  model?: string
  serialNumber?: string
  color?: string
  note?: string
}

export const devicesApi = {
  search: (query: PageQuery & { q?: string; type?: DeviceType; customerId?: number }) =>
    http.get<PageResponse<DeviceResponse>>('/devices', { params: cleanParams(query) }).then((r) => r.data),
  get: (id: number) => http.get<DeviceResponse>(`/devices/${id}`).then((r) => r.data),
  create: (body: DeviceRequest) => http.post<DeviceResponse>('/devices', body).then((r) => r.data),
  update: (id: number, body: DeviceRequest) => http.put<DeviceResponse>(`/devices/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/devices/${id}`),
  repairHistory: (id: number) => http.get<RepairOrderSummary[]>(`/devices/${id}/repair-orders`).then((r) => r.data),
  mine: () => http.get<DeviceResponse[]>('/me/devices').then((r) => r.data),
  addMine: (body: DeviceRequest) => http.post<DeviceResponse>('/me/devices', body).then((r) => r.data),
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  PHONE: 'Điện thoại',
  LAPTOP: 'Laptop',
  TABLET: 'Máy tính bảng',
  DESKTOP: 'Máy tính bàn',
  SMARTWATCH: 'Đồng hồ thông minh',
  OTHER: 'Khác',
}

export const DEVICE_TYPE_OPTIONS = (Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((value) => ({
  value,
  label: DEVICE_TYPE_LABELS[value],
}))
