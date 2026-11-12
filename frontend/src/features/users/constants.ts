import type { StatusConfig } from '@/components/StatusTag'
import type { Role, UserStatus } from '@/types/enums'

export const ROLE_TAG_CONFIG: StatusConfig<Role> = {
  ADMIN: { label: 'Quản trị viên', color: 'magenta' },
  STAFF: { label: 'Nhân viên', color: 'blue' },
  TECHNICIAN: { label: 'Kỹ thuật viên', color: 'purple' },
  CUSTOMER: { label: 'Khách hàng', color: 'default' },
}

export const USER_STATUS_CONFIG: StatusConfig<UserStatus> = {
  ACTIVE: { label: 'Hoạt động', color: 'green' },
  LOCKED: { label: 'Đã khóa', color: 'red' },
}

export const INTERNAL_ROLES = ['ADMIN', 'STAFF', 'TECHNICIAN'] as const satisfies readonly Role[]
export type InternalRole = (typeof INTERNAL_ROLES)[number]
