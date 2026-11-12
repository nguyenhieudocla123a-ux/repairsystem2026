import { FileAddOutlined } from '@ant-design/icons'
import { Button, Skeleton } from 'antd'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import type { RepairOrderDetail } from '@/features/repairs/repairsApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { quotationsApi, type Quotation } from '../quotationsApi'
import { QuotationCard } from './QuotationCard'
import { QuotationEditor } from './QuotationEditor'

/** Tab báo giá trong chi tiết phiếu: lịch sử phiên bản + lập / gửi / phản hồi. */
export function QuotationsTab({ order, viewer, onOrderChanged }: { order: RepairOrderDetail; viewer: 'staff' | 'customer' | 'readonly'; onOrderChanged: () => void }) {
  const [editing, setEditing] = useState<Quotation | 'new' | null>(null)
  const { data, loading, error, reload } = useAsyncData(() => quotationsApi.ofOrder(order.id), [order.id, order.version])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading && !data) return <Skeleton active />

  const hasDraft = data?.some((q) => q.status === 'DRAFT')
  const changed = () => {
    reload()
    onOrderChanged() // gửi / duyệt / từ chối làm đổi trạng thái phiếu
  }

  return (
    <div className="flex flex-col gap-4">
      {order.canQuote && !hasDraft && (
        <div className="flex justify-end">
          <Button type="primary" icon={<FileAddOutlined />} onClick={() => setEditing('new')}>
            {data?.length ? 'Lập báo giá mới' : 'Lập báo giá'}
          </Button>
        </div>
      )}
      {!data?.length ? (
        <EmptyState
          compact
          title="Chưa có báo giá"
          description={
            viewer === 'customer'
              ? 'Cửa hàng sẽ gửi báo giá sau khi kiểm tra máy.'
              : order.canQuote
                ? 'Lập báo giá dựa trên chẩn đoán của kỹ thuật viên.'
                : 'Chỉ lập báo giá khi phiếu đang kiểm tra, đang sửa hoặc khách vừa từ chối báo giá trước.'
          }
        />
      ) : (
        data.map((q) => <QuotationCard key={q.id} quotation={q} viewer={viewer} onEdit={() => setEditing(q)} onChanged={changed} />)
      )}
      {editing && (
        <QuotationEditor
          key={editing === 'new' ? 'new' : editing.id}
          orderId={order.id}
          quotation={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
