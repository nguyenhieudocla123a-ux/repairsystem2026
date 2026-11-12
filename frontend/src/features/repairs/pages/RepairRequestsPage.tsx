import { CloseOutlined, InboxOutlined, SearchOutlined } from '@ant-design/icons'
import { App, Button, Card, Input, Segmented, Space, Table, type TableProps } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { StatusTag } from '@/components/StatusTag'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import { REQUEST_STATUS_CONFIG } from '../constants/status'
import { repairRequestsApi, type RepairRequestResponse, type RepairRequestStatus } from '../repairsApi'

/** STAFF xử lý yêu cầu sửa chữa khách gửi online. */
export function RepairRequestsPage() {
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const [status, setStatus] = useState<RepairRequestStatus | 'ALL'>('PENDING')
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const q = useDebouncedValue(keyword)
  const { data, loading, error, reload } = useAsyncData(
    () => repairRequestsApi.search({ page, size: 20, q, status: status === 'ALL' ? undefined : status }),
    [page, q, status],
  )

  const reject = (r: RepairRequestResponse) => {
    let reason = ''
    modal.confirm({
      title: `Từ chối yêu cầu ${r.code}?`,
      content: (
        <Input.TextArea
          aria-label="Lý do từ chối"
          rows={3}
          placeholder="Lý do (khách sẽ thấy), VD: Cửa hàng không sửa dòng máy này"
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      okText: 'Từ chối yêu cầu',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        if (!reason.trim()) {
          message.warning('Vui lòng nhập lý do')
          throw new Error('missing reason') // giữ modal mở
        }
        try {
          await repairRequestsApi.reject(r.id, reason)
          message.success('Đã từ chối yêu cầu')
          reload()
        } catch (e) {
          message.error(getErrorMessage(e))
        }
      },
    })
  }

  const columns: TableProps<RepairRequestResponse>['columns'] = [
    {
      title: 'Yêu cầu',
      dataIndex: 'code',
      render: (_, r) => (
        <div>
          <div className="font-mono text-xs font-semibold">{r.code}</div>
          <div className="text-xs text-text-muted">{formatDateTime(r.createdAt)}</div>
        </div>
      ),
    },
    {
      title: 'Khách hàng / Thiết bị',
      render: (_, r) => (
        <div>
          <Link to={`/customers/${r.customerId}`} onClick={(e) => e.stopPropagation()}>{r.customerName}</Link>
          <span className="text-xs text-text-secondary"> · {r.customerPhone}</span>
          <div className="text-xs text-text-secondary">{r.device.name}</div>
        </div>
      ),
    },
    { title: 'Mô tả lỗi', dataIndex: 'issueDescription', ellipsis: true, responsive: ['md'] },
    { title: 'Dự kiến mang tới', dataIndex: 'expectedDropOffDate', responsive: ['lg'], render: (v: string | null) => formatDate(v) },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: RepairRequestStatus, r) =>
        r.repairOrderId ? (
          <Link to={`/repairs/${r.repairOrderId}`}>{r.repairOrderCode}</Link>
        ) : (
          <StatusTag value={s} config={REQUEST_STATUS_CONFIG} />
        ),
    },
    {
      title: <span className="sr-only">Thao tác</span>,
      key: 'actions',
      align: 'right',
      render: (_, r) =>
        r.status === 'PENDING' && (
          <Space>
            <Button type="primary" size="small" icon={<InboxOutlined />} onClick={() => navigate('/reception', { state: { request: r } })}>
              Tiếp nhận
            </Button>
            <Button size="small" icon={<CloseOutlined />} aria-label={`Từ chối ${r.code}`} onClick={() => reject(r)} />
          </Space>
        ),
    },
  ]

  return (
    <>
      <PageHeader title="Yêu cầu sửa chữa online" description="Khách gửi trước qua web; bấm Tiếp nhận khi khách mang máy tới quầy." />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <Segmented<RepairRequestStatus | 'ALL'>
            value={status}
            onChange={(v) => {
              setStatus(v)
              setPage(0)
            }}
            options={[
              { value: 'PENDING', label: 'Chờ tiếp nhận' },
              { value: 'CONVERTED', label: 'Đã tạo phiếu' },
              { value: 'REJECTED', label: 'Từ chối' },
              { value: 'ALL', label: 'Tất cả' },
            ]}
          />
          <Input
            aria-label="Tìm yêu cầu"
            placeholder="Mã, tên khách, SĐT..."
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(0)
            }}
            className="md:max-w-xs"
          />
        </div>
        {error && !loading ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table<RepairRequestResponse>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={loading}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: loading ? ' ' : <EmptyState compact title={status === 'PENDING' ? 'Không có yêu cầu nào đang chờ' : 'Không có yêu cầu'} /> }}
            pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1), className: '!px-4' }}
          />
        )}
      </Card>
    </>
  )
}
