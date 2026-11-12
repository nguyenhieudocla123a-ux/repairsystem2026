import { SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Card, List } from 'antd'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { DEVICE_TYPE_LABELS } from '@/features/devices/devicesApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { formatDate } from '@/utils/format'
import { WarrantyDetailModal } from '../components/WarrantyDetailModal'
import { WarrantyStatusBadge } from '../components/WarrantyStatusBadge'
import { warrantiesApi } from '../warrantiesApi'

/** CUSTOMER: bảo hành của mình, gửi yêu cầu bảo hành khi máy lỗi lại. */
export function MyWarrantiesPage() {
  const { data, loading, error, reload } = useAsyncData(() => warrantiesApi.mine(), [])
  const [openId, setOpenId] = useState<number | null>(null)
  return (
    <>
      <PageHeader title="Bảo hành của tôi" description="Kiểm tra thời hạn bảo hành và gửi yêu cầu khi thiết bị gặp lại lỗi đã sửa." />
      <Card>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <List
            loading={loading}
            dataSource={data}
            locale={{ emptyText: <EmptyState compact title="Bạn chưa có phiếu bảo hành nào" description="Bảo hành được kích hoạt khi bạn nhận lại thiết bị sau sửa chữa." /> }}
            renderItem={(w) => (
              <List.Item
                actions={[
                  <Button key="v" type={w.valid ? 'primary' : 'default'} icon={<SafetyCertificateOutlined />} onClick={() => setOpenId(w.id)}>
                    {w.valid ? 'Chi tiết & yêu cầu BH' : 'Xem chi tiết'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{w.code}</span> · {w.device.name}
                    </span>
                  }
                  description={
                    <span className="flex flex-col gap-1">
                      <WarrantyStatusBadge valid={w.valid} voided={w.status === 'VOID'} daysRemaining={w.daysRemaining} />
                      <span className="text-xs">
                        {DEVICE_TYPE_LABELS[w.device.deviceType]} · {formatDate(w.startDate)} → {formatDate(w.endDate)} · Phiếu {w.repairOrderCode}
                      </span>
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
      {openId != null && <WarrantyDetailModal key={openId} warrantyId={openId} viewer="customer" onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  )
}
