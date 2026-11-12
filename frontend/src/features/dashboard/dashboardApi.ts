import type { RepairOrderSummary } from '@/features/repairs/repairsApi'
import { http } from '@/services/http'
import type { RepairStatus } from '@/types/enums'

/** Kiểu khớp DashboardDtos.java – docs/api-specification.md §12 */
export interface AmountPoint {
  date: string
  amount: number
}
export interface StatusCount {
  status: RepairStatus
  count: number
}
export interface PartUsageStat {
  partId: number
  sku: string
  partName: string
  quantity: number
}
export interface LowStockPart {
  id: number
  sku: string
  name: string
  quantityOnHand: number
  minStockLevel: number
}
export interface TechnicianStat {
  technicianId: number
  fullName: string
  completedCount: number
  activeCount: number
  avgHoursToComplete: number | null
}
export interface AdminDashboard {
  from: string
  to: string
  totalOrders: number
  inProgressOrders: number
  completedOrders: number
  revenue: number
  revenueSeries: AmountPoint[]
  statusDistribution: StatusCount[]
  topParts: PartUsageStat[]
  lowStockParts: LowStockPart[]
}
export interface StaffDashboard {
  newOrders: number
  pendingRequests: number
  waitingConfirmation: number
  readyForDelivery: number
  openWarrantyClaims: number
  todo: RepairOrderSummary[]
}
export interface TechnicianDashboard {
  assigned: number
  inProgress: number
  completedThisMonth: number
  priorityTasks: RepairOrderSummary[]
}
export interface CustomerDashboard {
  deviceCount: number
  activeOrders: number
  pendingQuotations: number
  activeWarranties: number
  activeOrderList: RepairOrderSummary[]
}

export interface DateRange {
  from: string
  to: string
}

export const dashboardApi = {
  admin: (range?: DateRange) => http.get<AdminDashboard>('/dashboard/admin', { params: range }).then((r) => r.data),
  staff: () => http.get<StaffDashboard>('/dashboard/staff').then((r) => r.data),
  technician: () => http.get<TechnicianDashboard>('/dashboard/technician').then((r) => r.data),
  customer: () => http.get<CustomerDashboard>('/dashboard/customer').then((r) => r.data),
  revenue: (range: DateRange, groupBy: 'DAY' | 'MONTH') =>
    http.get<AmountPoint[]>('/reports/revenue', { params: { ...range, groupBy } }).then((r) => r.data),
  partsUsage: (range: DateRange, limit = 10) =>
    http.get<PartUsageStat[]>('/reports/parts-usage', { params: { ...range, limit } }).then((r) => r.data),
  technicianPerformance: (range: DateRange) =>
    http.get<TechnicianStat[]>('/reports/technician-performance', { params: range }).then((r) => r.data),
}
