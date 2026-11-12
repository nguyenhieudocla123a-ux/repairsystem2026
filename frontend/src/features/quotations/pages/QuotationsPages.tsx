import { FileTextOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, Input, List, Segmented, Table, type TableProps } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { MoneyText } from '@/components/MoneyText'
import { PageHeader } from '@/components/PageHeader'
import { StatusTag } from '@/components/StatusTag'
import { QUOTATION_STATUS_CONFIG } from '@/features/repairs/constants/status'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { QuotationStatus } from '@/types/enums'
import { formatDateTime } from '@/utils/format'
import { quotationsApi, type QuotationSummary } from '../quotationsApi'

/** STAFF/ADMIN: mọi báo giá trong hệ thống, mặc định lọc báo giá đang chờ khách. */
export function QuotationsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<QuotationStatus | 'ALL'>('SENT')
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const q = useDebouncedValue(keyword)
  const { data, loading, error, reload } = useAsyncData(
    () => quotationsApi.search({ page, size: 20, q, status: status === 'ALL' ? undefined : status }),
    [page, q, status],
  )
  const columns: TableProps<QuotationSummary>['columns'] = [
    { title: 'Phiếu', dataIndex: 'repairOrderCode', render: (v: string, r) => <span className="font-mono text-xs font-semibold text-primary">{v} <span className="font-sans font-normal text-text-muted">v{r.versionNo}</span></span> },
    { title: 'Khách hàng', dataIndex: 'customerName' },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', align: 'right', render: (v: number) => <MoneyText value={v} className="font-medium" /> },
    { title: 'Trạng thái', dataIndex: 'status', render: (s: QuotationStatus) => <StatusTag value={s} config={QUOTATION_STATUS_CONFIG} /> },
    { title: 'Gửi lúc', dataIndex: 'sentAt', responsive: ['md'], render: (v: string | null) => (v ? formatDateTime(v) : '—') },
    { title: 'Phản hồi', dataIndex: 'respondedAt', responsive: ['lg'], render: (v: string | null) => (v ? formatDateTime(v) : '—') },
  ]
  return (
    <>
      <PageHeader title="Báo giá" description="Theo dõi báo giá đã gửi; mở phiếu để lập, gửi hoặc xác nhận thay khách." />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <Segmented<QuotationStatus | 'ALL'>
            value={status}
            onChange={(v) => { setStatus(v); setPage(0) }}
            options={[
              { value: 'SENT', label: 'Chờ khách' },
              { value: 'DRAFT', label: 'Nháp' },
              { value: 'APPROVED', label: 'Đã duyệt' },
              { value: 'REJECTED', label: 'Từ chối' },
              { value: 'ALL', label: 'Tất cả' },
            ]}
          />
          <Input
            aria-label="Tìm báo giá"
            placeholder="Mã phiếu, tên khách..."
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(0) }}
            className="md:max-w-xs"
          />
        </div>
        {error && !loading ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table<QuotationSummary>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={loading}
            scroll={{ x: 'max-content' }}
            onRow={(r) => ({ onClick: () => navigate(`/repairs/${r.repairOrderId}`), className: 'cursor-pointer' })}
            locale={{ emptyText: loading ? ' ' : <EmptyState compact title={status === 'SENT' ? 'Không có báo giá nào đang chờ khách' : 'Không có báo giá'} /> }}
            pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1), className: '!px-4' }}
          />
        )}
      </Card>
    </>
  )
}

/** Khách hàng: báo giá cần mình xác nhận (và lịch sử báo giá). */
export function MyQuotationsPage() {
  const [status, setStatus] = useState<QuotationStatus | 'ALL'>('SENT')
  const { data, loading, error, reload } = useAsyncData(
    () => quotationsApi.mine({ size: 50, status: status === 'ALL' ? undefined : status }),
    [status],
  )
  return (
    <>
      <PageHeader title="Báo giá của tôi" description="Xem chi tiết và xác nhận báo giá sửa chữa từ cửa hàng." />
      <Card>
        <Segmented<QuotationStatus | 'ALL'>
          className="mb-4"
          value={status}
          onChange={setStatus}
          options={[{ value: 'SENT', label: 'Chờ tôi xác nhận' }, { value: 'ALL', label: 'Tất cả' }]}
        />
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <List
            loading={loading}
            dataSource={data?.content}
            locale={{ emptyText: <EmptyState compact title={status === 'SENT' ? 'Không có báo giá nào chờ bạn xác nhận' : 'Chưa có báo giá'} /> }}
            renderItem={(qt) => (
              <List.Item
                actions={[
                  <Link key="v" to={`/my/repairs/${qt.repairOrderId}`}>
                    <Button type={qt.status === 'SENT' ? 'primary' : 'default'} icon={<FileTextOutlined />}>
                      {qt.status === 'SENT' ? 'Xem & xác nhận' : 'Xem phiếu'}
                    </Button>
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{qt.repairOrderCode}</span> · Báo giá v{qt.versionNo}
                      <StatusTag value={qt.status} config={QUOTATION_STATUS_CONFIG} />
                    </span>
                  }
                  description={<>Tổng <MoneyText value={qt.totalAmount} className="font-semibold text-text" />{qt.sentAt && ` · gửi lúc ${formatDateTime(qt.sentAt)}`}</>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  )
}
