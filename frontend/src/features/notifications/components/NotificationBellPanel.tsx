import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import type { AppNotification } from '../notificationsApi'
import { markAllNotificationsRead, markNotificationRead, notificationLink } from '../notificationsSlice'
import { NotificationList } from './NotificationList'

/** Nội dung popover của chuông: 10 thông báo mới nhất (cập nhật realtime qua Redux). */
export function NotificationBellPanel({ onNavigate }: { onNavigate?: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { latest, unreadCount, connected } = useAppSelector((s) => s.notifications)
  const isCustomer = useAppSelector((s) => s.auth.user?.role === 'CUSTOMER')

  const open = (n: AppNotification) => {
    if (!n.read) void dispatch(markNotificationRead(n.id))
    const link = notificationLink(n, isCustomer)
    if (link) navigate(link)
    onNavigate?.()
  }

  return (
    <div className="w-[min(360px,calc(100vw-32px))]">
      <div className="flex items-center justify-between border-b border-border px-1 pb-2">
        <span className="flex items-center gap-2 font-semibold">
          Thông báo
          <span className={`size-2 rounded-full ${connected ? 'bg-success' : 'bg-text-muted'}`} title={connected ? 'Đang nhận realtime' : 'Mất kết nối realtime'} aria-label={connected ? 'Đang kết nối realtime' : 'Mất kết nối realtime'} />
        </span>
        <Button type="link" size="small" disabled={!unreadCount} onClick={() => dispatch(markAllNotificationsRead())}>
          Đánh dấu đã đọc
        </Button>
      </div>
      <div className="max-h-[420px] overflow-y-auto py-1">
        {latest.length ? <NotificationList compact items={latest} onOpen={open} /> : <EmptyState compact title="Chưa có thông báo" />}
      </div>
      <div className="border-t border-border pt-2 text-center">
        <Button type="link" size="small" onClick={() => { navigate('/notifications'); onNavigate?.() }}>Xem tất cả</Button>
      </div>
    </div>
  )
}
