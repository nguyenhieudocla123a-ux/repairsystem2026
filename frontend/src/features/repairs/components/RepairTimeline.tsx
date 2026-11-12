import { Timeline } from 'antd'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { ROLE_LABELS } from '@/routes/appRoutes'
import { useAsyncData } from '@/hooks/useAsyncData'
import { formatDateTime } from '@/utils/format'
import { REPAIR_STATUS_CONFIG } from '../constants/status'
import { repairsApi } from '../repairsApi'
import { RepairStatusTag } from './RepairStatusTag'

/** Lịch sử chuyển trạng thái (audit) – reloadKey đổi khi phiếu được cập nhật. */
export function RepairTimeline({ repairId, reloadKey, showActor = true }: { repairId: number; reloadKey: unknown; showActor?: boolean }) {
  const { data, loading, error, reload } = useAsyncData(() => repairsApi.history(repairId), [repairId, reloadKey])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!loading && !data?.length) return <EmptyState compact title="Chưa có lịch sử" />

  return (
    <Timeline
      pending={loading ? 'Đang tải...' : undefined}
      items={[...(data ?? [])].reverse().map((h) => ({
        color: REPAIR_STATUS_CONFIG[h.toStatus].color === 'red' ? 'red' : h.toStatus === 'DELIVERED' ? 'green' : 'blue',
        children: (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <RepairStatusTag status={h.toStatus} />
              <span className="text-xs text-text-muted">{formatDateTime(h.changedAt)}</span>
            </div>
            {showActor && (
              <span className="text-xs text-text-secondary">
                {h.changedByName} · {ROLE_LABELS[h.changedByRole]}
              </span>
            )}
            {h.note && <span className="text-sm text-text">{h.note}</span>}
          </div>
        ),
      }))}
    />
  )
}
