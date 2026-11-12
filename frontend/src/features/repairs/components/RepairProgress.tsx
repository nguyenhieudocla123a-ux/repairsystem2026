import { Steps } from 'antd'
import type { RepairStatus } from '@/types/enums'
import { REPAIR_STATUS_CONFIG } from '../constants/status'

/** Các mốc chính hiển thị cho người dùng; trạng thái phụ được quy về mốc gần nhất. */
const STEPS = ['RECEIVED', 'INSPECTING', 'WAITING_CONFIRMATION', 'REPAIRING', 'COMPLETED', 'DELIVERED'] as const
const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  RECEIVED: 'Tiếp nhận',
  INSPECTING: 'Kiểm tra',
  WAITING_CONFIRMATION: 'Báo giá',
  REPAIRING: 'Sửa chữa',
  COMPLETED: 'Hoàn thành',
  DELIVERED: 'Bàn giao',
}

function stepIndex(status: RepairStatus): number {
  switch (status) {
    case 'APPROVED':
    case 'REJECTED':
      return 2
    case 'WAITING_FOR_PARTS':
      return 3
    case 'CANCELLED':
      return -1
    default:
      return STEPS.indexOf(status as (typeof STEPS)[number])
  }
}

export function RepairProgress({ status, size = 'default' }: { status: RepairStatus; size?: 'default' | 'small' }) {
  const current = stepIndex(status)
  const cancelled = status === 'CANCELLED'
  const rejected = status === 'REJECTED'
  return (
    <Steps
      size={size}
      // Tiêu đề nằm dưới icon: mỗi bước dùng trọn bề rộng cột → không bị ngắt từng chữ ở màn hình hẹp
      titlePlacement="vertical"
      responsive
      current={cancelled ? 0 : current}
      status={cancelled || rejected ? 'error' : status === 'DELIVERED' ? 'finish' : 'process'}
      items={STEPS.map((s, i) => ({
        title: i === current && !cancelled ? REPAIR_STATUS_CONFIG[status].label : STEP_LABELS[s],
      }))}
      aria-label={`Tiến độ: ${REPAIR_STATUS_CONFIG[status].label}`}
    />
  )
}
