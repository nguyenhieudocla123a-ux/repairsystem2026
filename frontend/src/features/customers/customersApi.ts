import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { DeviceResponse } from '@/features/devices/devicesApi'
import type { RepairOrderSummary } from '@/features/repairs/repairsApi'
import { cleanParams } from '@/utils/params'

/** CustomerResponse.java – docs/api-specification.md §4 */
export interface CustomerResponse {
  id: number
  code: string
  fullName: string
  phone: string
  email: string | null
  address: string | null
  note: string | null
  hasAccount: boolean
  createdAt: string
}

export interface CustomerDetailResponse extends CustomerResponse {
  deviceCount: number
  repairOrderCount: number
  totalSpent: number
}

export interface CustomerRequest {
  fullName: string
  phone: string
  email?: string
  address?: string
  note?: string
}

export const customersApi = {
  search: (query: PageQuery & { q?: string }) =>
    http.get<PageResponse<CustomerResponse>>('/customers', { params: cleanParams(query) }).then((r) => r.data),
  get: (id: number) => http.get<CustomerDetailResponse>(`/customers/${id}`).then((r) => r.data),
  create: (body: CustomerRequest) => http.post<CustomerResponse>('/customers', body).then((r) => r.data),
  update: (id: number, body: CustomerRequest) => http.put<CustomerResponse>(`/customers/${id}`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/customers/${id}`),
  devices: (id: number) => http.get<DeviceResponse[]>(`/customers/${id}/devices`).then((r) => r.data),
  repairOrders: (id: number, query: PageQuery) =>
    http
      .get<PageResponse<RepairOrderSummary>>(`/customers/${id}/repair-orders`, { params: cleanParams(query) })
      .then((r) => r.data),
  activateAccount: (id: number, body: { email: string; password: string }) =>
    http.post<CustomerResponse>(`/customers/${id}/account`, body).then((r) => r.data),
}
