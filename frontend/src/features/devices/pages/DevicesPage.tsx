import { EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, Select, Table, type TableProps } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { DeviceType } from '@/types/enums'
import { formatDate } from '@/utils/format'
import { DeviceFormModal } from '../components/DeviceFormModal'
import { DEVICE_TYPE_LABELS, DEVICE_TYPE_OPTIONS, devicesApi, type DeviceResponse } from '../devicesApi'

export function DevicesPage() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<DeviceType>()
  const [editing, setEditing] = useState<DeviceResponse | 'new' | null>(null)
  const q = useDebouncedValue(keyword)
  const { data, loading, error, reload } = useAsyncData(() => devicesApi.search({ page, size, q, type }), [page, size, q, type])

  const columns: TableProps<DeviceResponse>['columns'] = [
    {
      title: 'Thiết bị',
      dataIndex: 'name',
      render: (_, d) => (
        <div>
          <div className="font-medium text-text">{d.name}</div>
          <div className="text-xs text-text-secondary">{[d.brand, d.model].filter(Boolean).join(' ') || DEVICE_TYPE_LABELS[d.deviceType]}</div>
        </div>
      ),
    },
    { title: 'Loại', dataIndex: 'deviceType', responsive: ['md'], render: (t: DeviceType) => DEVICE_TYPE_LABELS[t] },
    { title: 'Serial / IMEI', dataIndex: 'serialNumber', render: (v: string | null) => (v ? <span className="font-mono text-xs">{v}</span> : '—') },
    {
      title: 'Chủ sở hữu',
      dataIndex: 'customerName',
      render: (_, d) => <Link to={`/customers/${d.customerId}`}>{d.customerName}</Link>,
    },
    { title: 'Ngày thêm', dataIndex: 'createdAt', responsive: ['lg'], render: formatDate },
    {
      title: <span className="sr-only">Thao tác</span>,
      key: 'actions',
      align: 'right',
      render: (_, d) => <Button type="text" icon={<EditOutlined />} aria-label={`Sửa ${d.name}`} onClick={() => setEditing(d)} />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Thiết bị"
        description="Tất cả thiết bị của khách hàng đã đăng ký tại cửa hàng."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>Thêm thiết bị</Button>}
      />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
          <Input
            aria-label="Tìm thiết bị"
            placeholder="Tìm theo tên, model, serial, chủ sở hữu..."
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(0)
            }}
            className="md:max-w-md"
          />
          <Select<DeviceType>
            aria-label="Lọc loại thiết bị"
            placeholder="Tất cả loại"
            allowClear
            value={type}
            onChange={(v) => {
              setType(v)
              setPage(0)
            }}
            options={DEVICE_TYPE_OPTIONS}
            className="md:w-52"
          />
        </div>
        {error && !loading ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table<DeviceResponse>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={loading}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: loading ? ' ' : <EmptyState compact title={q || type ? 'Không có thiết bị phù hợp' : 'Chưa có thiết bị'} /> }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: data?.totalElements ?? 0,
              showSizeChanger: true,
              showTotal: (t) => `${t} thiết bị`,
              className: '!px-4',
            }}
            onChange={(p) => {
              setPage((p.current ?? 1) - 1)
              setSize(p.pageSize ?? 20)
            }}
          />
        )}
      </Card>
      {editing && (
        <DeviceFormModal
          key={editing === 'new' ? 'new' : editing.id}
          mode="staff"
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
