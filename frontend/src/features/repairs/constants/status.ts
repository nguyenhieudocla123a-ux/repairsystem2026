import type { StatusConfig } from '@/components/StatusTag'
import type { PaymentMethod, QuotationStatus, RepairPriority, RepairStatus } from '@/types/enums'
import type { RepairRequestStatus } from '../repairsApi'

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

export const REQUEST_STATUS_CONFIG: StatusConfig<RepairRequestStatus> = {
  PENDING: { label: 'Chờ tiếp nhận', color: 'gold' },
  CONVERTED: { label: 'Đã tạo phiếu', color: 'green' },
  REJECTED: { label: 'Đã từ chối', color: 'red' },
  CANCELLED: { label: 'Khách đã hủy', color: 'default' },
}

export const QUOTATION_STATUS_CONFIG: StatusConfig<QuotationStatus> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  SENT: { label: 'Chờ khách xác nhận', color: 'gold' },
  APPROVED: { label: 'Khách đồng ý', color: 'green' },
  REJECTED: { label: 'Khách từ chối', color: 'red' },
  SUPERSEDED: { label: 'Đã thay thế', color: 'default' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
}

/** Tiến độ (0–100) của phiếu theo 6 mốc chính – dùng cho thanh tiến độ gọn (dashboard khách). */
const PROGRESS_STEP: Record<RepairStatus, number> = {
  RECEIVED: 0,
  INSPECTING: 1,
  WAITING_CONFIRMATION: 2,
  APPROVED: 2,
  REJECTED: 2,
  WAITING_FOR_PARTS: 3,
  REPAIRING: 3,
  COMPLETED: 4,
  DELIVERED: 5,
  CANCELLED: 0,
}

export function repairProgressPercent(status: RepairStatus): number {
  return Math.round((PROGRESS_STEP[status] / 5) * 100)
}
