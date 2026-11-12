import {
  AlertOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  ToolOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { ReactNode } from 'react'
import { toneClasses, type Tone } from '@/theme/tokens'
import type { AppNotification, NotificationType } from '../notificationsApi'

dayjs.extend(relativeTime)

const VISUAL: Record<NotificationType, { icon: ReactNode; tone: Tone }> = {
  REPAIR_STATUS_CHANGED: { icon: <SyncOutlined />, tone: 'info' },
  QUOTATION_SENT: { icon: <FileTextOutlined />, tone: 'warning' },
  QUOTATION_APPROVED: { icon: <CheckCircleOutlined />, tone: 'success' },
  QUOTATION_REJECTED: { icon: <CloseCircleOutlined />, tone: 'error' },
  REPAIR_ASSIGNED: { icon: <UserAddOutlined />, tone: 'primary' },
  REPAIR_COMPLETED: { icon: <ToolOutlined />, tone: 'success' },
  LOW_STOCK: { icon: <AlertOutlined />, tone: 'error' },
  REPAIR_REQUEST_CREATED: { icon: <InboxOutlined />, tone: 'primary' },
  WARRANTY_CLAIM_CREATED: { icon: <SafetyCertificateOutlined />, tone: 'warning' },
}

/** Danh sách thông báo dùng chung cho chuông (header) và trang Thông báo. */
export function NotificationList({ items, onOpen, compact = false }: { items: AppNotification[]; onOpen: (n: AppNotification) => void; compact?: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-label="Danh sách thông báo">
      {items.map((n) => {
        const v = VISUAL[n.type]
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className={`focus-ring flex w-full cursor-pointer items-start gap-3 rounded-lg border-none px-2 text-left hover:bg-tone-neutral-bg ${compact ? 'py-2' : 'py-3'} ${n.read ? 'bg-transparent' : 'bg-tone-primary-bg/50'}`}
            >
              <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[v.tone]}`}>{v.icon}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span className={`truncate text-sm ${n.read ? 'text-text' : 'font-semibold text-text'}`}>{n.title}</span>
                  {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />}
                </span>
                <span className={`text-xs text-text-secondary ${compact ? 'line-clamp-2' : ''}`}>{n.message}</span>
                <span className="mt-0.5 text-xs text-text-muted" title={dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}>{dayjs(n.createdAt).fromNow()}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
