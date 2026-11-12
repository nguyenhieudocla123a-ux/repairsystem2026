import type { StatusConfig } from '@/components/StatusTag'
import type { RepairPriority, RepairStatus } from '@/types/enums'

/** Nguồn duy nhất cho nhãn + màu trạng thái phiếu (docs/ui-ux-design.md §1.3). */
export const REPAIR_STATUS_CONFIG: StatusConfig<RepairStatus> = {
  RECEIVED: { label: 'Đã tiếp nhận', color: 'blue' },
  INSPECTING: { label: 'Đang kiểm tra', color: 'geekblue' },
  WAITING_CONFIRMATION: { label: 'Chờ khách xác nhận', color: 'gold' },
  APPROVED: { label: 'Đã duyệt báo giá', color: 'cyan' },
  WAITING_FOR_PARTS: { label: 'Chờ linh kiện', color: 'orange' },
  REPAIRING: { label: 'Đang sửa', color: 'purple' },
  COMPLETED: { label: 'Sửa xong', color: 'green' },
  DELIVERED: { label: 'Đã bàn giao', color: 'default' },
  REJECTED: { label: 'Khách từ chối', color: 'volcano' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
}

export const REPAIR_PRIORITY_CONFIG: StatusConfig<RepairPriority> = {
  LOW: { label: 'Thấp', color: 'default' },
  NORMAL: { label: 'Thường', color: 'blue' },
  HIGH: { label: 'Cao', color: 'orange' },
  URGENT: { label: 'Khẩn cấp', color: 'red' },
}
