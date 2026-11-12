import { Card } from 'antd'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ROLE_LABELS } from '@/routes/appRoutes'

/** Mốc 3: khung dashboard. Số liệu thật từ /dashboard/{role} được nối ở Mốc 7. */
export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!
  const firstName = user.fullName.trim().split(/\s+/).pop()

  return (
    <>
      <PageHeader title={`Xin chào, ${firstName} 👋`} description={`Bạn đang đăng nhập với vai trò ${ROLE_LABELS[user.role]}.`} />
      <Card>
        <EmptyState
          title="Số liệu tổng quan sẽ có ở Mốc 7"
          description="Dashboard sẽ hiển thị chỉ số thật theo vai trò (phiếu mới, đang sửa, doanh thu, tồn kho thấp...) từ API /dashboard."
        />
      </Card>
    </>
  )
}
