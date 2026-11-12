import { CheckCircleOutlined, CloseCircleOutlined, PauseCircleOutlined, PlayCircleOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Input, Space } from 'antd'
import type { ReactNode } from 'react'
import type { RepairStatus } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { repairsApi, type RepairOrderDetail } from '../repairsApi'

const ACTIONS: Partial<Record<RepairStatus, { label: string; icon: ReactNode; danger?: boolean; primary?: boolean; noteRequired?: boolean; hint: string }>> = {
  INSPECTING: { label: 'Bắt đầu kiểm tra', icon: <SearchOutlined />, primary: true, hint: 'Ghi chú (không bắt buộc)' },
  REPAIRING: { label: 'Bắt đầu sửa', icon: <PlayCircleOutlined />, primary: true, hint: 'Ghi chú (không bắt buộc)' },
  WAITING_FOR_PARTS: { label: 'Chờ linh kiện', icon: <PauseCircleOutlined />, hint: 'Linh kiện đang chờ, dự kiến về khi nào?' },
  COMPLETED: { label: 'Hoàn thành sửa chữa', icon: <CheckCircleOutlined />, primary: true, hint: 'Ghi chú cho nhân viên bàn giao (không bắt buộc)' },
  CANCELLED: { label: 'Hủy phiếu', icon: <CloseCircleOutlined />, danger: true, noteRequired: true, hint: 'Lý do hủy (bắt buộc)' },
}

export interface TransitionActionsProps {
  order: RepairOrderDetail
  /** Khách hàng hủy qua API riêng /me/repair-orders/{id}/cancel */
  asCustomer?: boolean
  onChanged: (order: RepairOrderDetail) => void
}

/**
 * Nút chuyển trạng thái – CHỈ hiển thị các trạng thái Backend trả về trong allowedTransitions (TD-07):
 * Frontend không tự đoán luật nghiệp vụ, mọi kiểm tra quyền vẫn nằm ở Backend.
 */
export function TransitionActions({ order, asCustomer, onChanged }: TransitionActionsProps) {
  const { modal, message } = App.useApp()

  const run = (to: RepairStatus) => {
    const action = ACTIONS[to]!
    let note = ''
    modal.confirm({
      title: `${action.label} – ${order.code}?`,
      icon: action.icon,
      content: <Input.TextArea aria-label={action.hint} rows={3} placeholder={action.hint} onChange={(e) => (note = e.target.value)} />,
      okText: action.label,
      okButtonProps: { danger: action.danger },
      cancelText: 'Đóng',
      onOk: async () => {
        if (action.noteRequired && !note.trim()) {
          message.warning('Vui lòng nhập lý do')
          throw new Error('note required') // giữ modal mở
        }
        try {
          const updated = asCustomer
            ? await repairsApi.cancelMine(order.id, note)
            : await repairsApi.transition(order.id, { toStatus: to, note: note || undefined, version: order.version })
          message.success(`Đã cập nhật phiếu ${order.code}`)
          onChanged(updated)
        } catch (e) {
          message.error(getErrorMessage(e))
        }
      },
    })
  }

  const targets = order.allowedTransitions.filter((s) => ACTIONS[s])
  if (!targets.length) return null
  return (
    <Space wrap>
      {targets.map((to) => {
        const a = ACTIONS[to]!
        return (
          <Button key={to} type={a.primary ? 'primary' : 'default'} danger={a.danger} icon={a.icon} onClick={() => run(to)}>
            {asCustomer && to === 'CANCELLED' ? 'Hủy yêu cầu sửa' : a.label}
          </Button>
        )
      })}
    </Space>
  )
}
