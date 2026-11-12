import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  FileTextOutlined,
  InboxOutlined,
  LaptopOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SolutionOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import type { Role } from '@/types/enums'

/**
 * Định nghĩa trang trong khu vực đã đăng nhập – nguồn duy nhất cho router, sidebar và breadcrumb.
 * `roles` chỉ phục vụ trải nghiệm (ẩn menu, chặn route); quyền thật do Backend kiểm tra.
 */
export interface AppRouteDef {
  path: string
  label: string
  icon: ReactNode
  roles: readonly Role[]
  /** Mốc triển khai nội dung trang – trang chưa làm hiển thị "Đang phát triển" thay vì dữ liệu giả. */
  milestone?: number
  inMenu?: boolean
  group?: string
}

const ALL: readonly Role[] = ['ADMIN', 'STAFF', 'TECHNICIAN', 'CUSTOMER']
const BACK_OFFICE: readonly Role[] = ['ADMIN', 'STAFF']

export const APP_ROUTES: AppRouteDef[] = [
  { path: '/dashboard', label: 'Tổng quan', icon: <DashboardOutlined />, roles: ALL, milestone: 7 },

  // Vận hành
  { path: '/reception', label: 'Tiếp nhận thiết bị', icon: <InboxOutlined />, roles: BACK_OFFICE, milestone: 5, group: 'Vận hành' },
  { path: '/repair-requests', label: 'Yêu cầu online', icon: <ScheduleOutlined />, roles: BACK_OFFICE, milestone: 5, group: 'Vận hành' },
  { path: '/repairs', label: 'Phiếu sửa chữa', icon: <ToolOutlined />, roles: ['ADMIN', 'STAFF', 'TECHNICIAN'], milestone: 5, group: 'Vận hành' },
  { path: '/tasks', label: 'Công việc của tôi', icon: <AppstoreOutlined />, roles: ['TECHNICIAN'], milestone: 5, group: 'Vận hành' },
  { path: '/quotations', label: 'Báo giá', icon: <FileTextOutlined />, roles: BACK_OFFICE, milestone: 6, group: 'Vận hành' },

  // Dữ liệu
  { path: '/customers', label: 'Khách hàng', icon: <TeamOutlined />, roles: BACK_OFFICE, milestone: 5, group: 'Dữ liệu' },
  { path: '/devices', label: 'Thiết bị', icon: <LaptopOutlined />, roles: BACK_OFFICE, milestone: 5, group: 'Dữ liệu' },
  { path: '/inventory', label: 'Kho linh kiện', icon: <AuditOutlined />, roles: ['ADMIN', 'STAFF', 'TECHNICIAN'], milestone: 6, group: 'Dữ liệu' },
  { path: '/warranties', label: 'Bảo hành', icon: <SafetyCertificateOutlined />, roles: BACK_OFFICE, milestone: 7, group: 'Dữ liệu' },

  // Khách hàng
  { path: '/my/devices', label: 'Thiết bị của tôi', icon: <MobileOutlined />, roles: ['CUSTOMER'], milestone: 5, group: 'Của tôi' },
  { path: '/my/repairs', label: 'Sửa chữa của tôi', icon: <ToolOutlined />, roles: ['CUSTOMER'], milestone: 5, group: 'Của tôi' },
  { path: '/my/quotations', label: 'Báo giá chờ duyệt', icon: <FileTextOutlined />, roles: ['CUSTOMER'], milestone: 6, group: 'Của tôi' },
  { path: '/my/warranties', label: 'Bảo hành của tôi', icon: <SafetyCertificateOutlined />, roles: ['CUSTOMER'], milestone: 7, group: 'Của tôi' },

  // Quản trị
  { path: '/reports', label: 'Báo cáo', icon: <BarChartOutlined />, roles: ['ADMIN'], milestone: 7, group: 'Quản trị' },
  { path: '/staff', label: 'Nhân viên & KTV', icon: <SolutionOutlined />, roles: ['ADMIN'], milestone: 4, group: 'Quản trị' },
  { path: '/users', label: 'Người dùng', icon: <UserSwitchOutlined />, roles: ['ADMIN'], milestone: 4, group: 'Quản trị' },

  // Không hiện trên sidebar (truy cập qua header)
  { path: '/notifications', label: 'Thông báo', icon: <BellOutlined />, roles: ALL, milestone: 7, inMenu: false },
  { path: '/profile', label: 'Hồ sơ cá nhân', icon: <UserOutlined />, roles: ALL, milestone: 4, inMenu: false },
]

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên tiếp nhận',
  TECHNICIAN: 'Kỹ thuật viên',
  CUSTOMER: 'Khách hàng',
}

export function routesForRole(role: Role): AppRouteDef[] {
  return APP_ROUTES.filter((r) => r.roles.includes(role))
}
