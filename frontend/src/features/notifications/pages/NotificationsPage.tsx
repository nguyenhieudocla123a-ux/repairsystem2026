import { CheckOutlined } from '@ant-design/icons'
import { Button, Card, Pagination, Segmented, Skeleton } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import { NotificationList } from '../components/NotificationList'
import { notificationsApi, type AppNotification } from '../notificationsApi'
import { markAllNotificationsRead, markNotificationRead, notificationLink } from '../notificationsSlice'

export function NotificationsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isCustomer = useAppSelector((s) => s.auth.user?.role === 'CUSTOMER')
  const unread = useAppSelector((s) => s.notifications.unreadCount)
  const latestId = useAppSelector((s) => s.notifications.latest[0]?.id)
  const [page, setPage] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  // latestId đổi khi có thông báo realtime mới → tự tải lại trang hiện tại
  const { data, loading, error, reload } = useAsyncData(() => notificationsApi.list({ page, size: 20, unreadOnly }), [page, unreadOnly, latestId, unread])

  const open = (n: AppNotification) => {
    if (!n.read) void dispatch(markNotificationRead(n.id))
    const link = notificationLink(n, isCustomer)
    if (link) navigate(link)
  }

  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Cập nhật về phiếu sửa chữa, báo giá, kho và bảo hành."
        extra={<Button icon={<CheckOutlined />} disabled={!unread} onClick={() => dispatch(markAllNotificationsRead()).then(reload)}>Đánh dấu tất cả đã đọc</Button>}
      />
      <Card>
        <Segmented<'all' | 'unread'>
          className="mb-3"
          value={unreadOnly ? 'unread' : 'all'}
          onChange={(v) => { setUnreadOnly(v === 'unread'); setPage(0) }}
          options={[{ value: 'all', label: 'Tất cả' }, { value: 'unread', label: `Chưa đọc (${unread})` }]}
        />
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <Skeleton active />
        ) : !data?.content.length ? (
          <EmptyState title={unreadOnly ? 'Bạn đã đọc hết thông báo' : 'Chưa có thông báo'} />
        ) : (
          <>
            <NotificationList items={data.content} onOpen={open} />
            <div className="mt-4 flex justify-end">
              <Pagination current={page + 1} pageSize={20} total={data.totalElements} onChange={(p) => setPage(p - 1)} showSizeChanger={false} />
            </div>
          </>
        )}
      </Card>
    </>
  )
}
