import { CalendarOutlined, TableOutlined } from '@ant-design/icons'
import { Badge, Button, Card, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import type { RepairStatus } from '@/types/enums'
import { formatDate } from '@/utils/format'
import { RepairPriorityTag } from '../components/RepairStatusTag'
import { repairsApi, type RepairOrderSummary } from '../repairsApi'

const COLUMNS: { title: string; statuses: RepairStatus[] }[] = [
  { title: 'Được giao', statuses: ['RECEIVED'] },
  { title: 'Đang kiểm tra', statuses: ['INSPECTING'] },
  { title: 'Chờ khách / linh kiện', statuses: ['WAITING_CONFIRMATION', 'APPROVED', 'WAITING_FOR_PARTS'] },
  { title: 'Đang sửa', statuses: ['REPAIRING'] },
]
const ACTIVE = COLUMNS.flatMap((c) => c.statuses)
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const

/**
 * Kanban công việc của KTV (docs/ui-ux-design.md §4.5). Không kéo-thả đổi trạng thái để tránh thao tác nhầm –
 * đổi trạng thái trong trang chi tiết có xác nhận.
 */
export function TasksPage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => repairsApi.search({ status: ACTIVE, size: 100 }), [])

  if (error) return <ErrorState error={error} onRetry={reload} />

  const sorted = [...(data?.content ?? [])].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.expectedReturnDate ?? '9').localeCompare(b.expectedReturnDate ?? '9'),
  )

  const TaskCard = ({ r }: { r: RepairOrderSummary }) => {
    const overdue = r.expectedReturnDate && dayjs(r.expectedReturnDate).isBefore(dayjs(), 'day')
    return (
      <button
        type="button"
        onClick={() => navigate(`/repairs/${r.id}`)}
        className="focus-ring w-full cursor-pointer rounded-lg border border-border bg-surface p-3 text-left shadow-card motion-safe:transition-colors hover:border-primary/40"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-primary">{r.code}</span>
          {r.priority !== 'NORMAL' && <RepairPriorityTag priority={r.priority} />}
        </div>
        <div className="font-medium text-text">{r.deviceName}</div>
        <div className="text-xs text-text-secondary">{r.customerName}</div>
        {r.expectedReturnDate && (
          <div className={`mt-2 flex items-center gap-1 text-xs ${overdue ? 'font-medium text-error' : 'text-text-muted'}`}>
            <CalendarOutlined /> Hẹn {formatDate(r.expectedReturnDate)}{overdue && ' · trễ hẹn'}
          </div>
        )}
      </button>
    )
  }

  return (
    <>
      <PageHeader
        title="Công việc của tôi"
        description="Phiếu đang được giao cho bạn, sắp theo độ ưu tiên và ngày hẹn trả."
        extra={<Button icon={<TableOutlined />} onClick={() => navigate('/repairs')}>Dạng bảng</Button>}
      />
      {loading ? (
        <Skeleton active />
      ) : !sorted.length ? (
        <Card><EmptyState title="Bạn chưa có việc nào" description="Phiếu được phân công cho bạn sẽ xuất hiện ở đây." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = sorted.filter((r) => col.statuses.includes(r.status))
            return (
              <section key={col.title} aria-label={col.title} className="flex flex-col gap-3 rounded-card bg-tone-neutral-bg p-3">
                <h2 className="m-0 flex items-center justify-between px-1 text-sm font-semibold text-text-secondary">
                  {col.title} <Badge count={items.length} showZero color="#94A3B8" />
                </h2>
                {items.map((r) => <TaskCard key={r.id} r={r} />)}
                {!items.length && <p className="m-0 px-1 py-4 text-center text-xs text-text-muted">Trống</p>}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
