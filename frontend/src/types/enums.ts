/** Enum khớp 1-1 với enum Java ở backend (com.repairflow.*.entity). */

export const ROLES = ['ADMIN', 'STAFF', 'TECHNICIAN', 'CUSTOMER'] as const
export type Role = (typeof ROLES)[number]

export type UserStatus = 'ACTIVE' | 'LOCKED'

export const REPAIR_STATUSES = [
  'RECEIVED',
  'INSPECTING',
  'WAITING_CONFIRMATION',
  'APPROVED',
  'REJECTED',
  'WAITING_FOR_PARTS',
  'REPAIRING',
  'COMPLETED',
  'DELIVERED',
  'CANCELLED',
] as const
export type RepairStatus = (typeof REPAIR_STATUSES)[number]

export type RepairPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type DeviceType = 'PHONE' | 'LAPTOP' | 'TABLET' | 'DESKTOP' | 'SMARTWATCH' | 'OTHER'
export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD'
