import { EditOutlined, LaptopOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { Button, Card, Skeleton } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { DeviceFormModal } from '@/features/devices/components/DeviceFormModal'
import { DEVICE_TYPE_LABELS, devicesApi, type DeviceResponse } from '@/features/devices/devicesApi'
import { useAsyncData } from '@/hooks/useAsyncData'

export function MyDevicesPage() {
  const navigate = useNavigate()
  const [editing, setEditing] = useState<DeviceResponse | 'new' | null>(null)
  const { data, loading, error, reload } = useAsyncData(() => devicesApi.mine(), [])

  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <>
      <PageHeader
        title="Thiết bị của tôi"
        description="Thêm thiết bị để gửi yêu cầu sửa chữa trực tuyến."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>Thêm thiết bị</Button>}
      />
      {loading ? (
        <Skeleton active />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            title="Bạn chưa có thiết bị nào"
            description="Thêm thiết bị (điện thoại, laptop...) để gửi yêu cầu sửa chữa và tra cứu bảo hành."
            action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>Thêm thiết bị</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((d) => (
            <Card
              key={d.id}
              actions={[
                <Button key="repair" type="link" icon={<ToolOutlined />} onClick={() => navigate('/my/repairs', { state: { requestDeviceId: d.id } })}>
                  Yêu cầu sửa
                </Button>,
                <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => setEditing(d)}>Sửa</Button>,
              ]}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tone-info-bg text-xl text-tone-info-fg" aria-hidden="true">
                  <LaptopOutlined />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-text">{d.name}</div>
                  <div className="text-sm text-text-secondary">
                    {DEVICE_TYPE_LABELS[d.deviceType]} · {[d.brand, d.model].filter(Boolean).join(' ') || '—'}
                  </div>
                  {d.serialNumber && <div className="font-mono text-xs text-text-muted">{d.serialNumber}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <DeviceFormModal
          key={editing === 'new' ? 'new' : editing.id}
          mode="customer"
          device={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}
