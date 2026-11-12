import { InboxOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Input, Select, Table, type TableProps } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { TechnicianSelect } from '@/features/users/components/TechnicianSelect'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { REPAIR_STATUSES, type RepairPriority, type RepairStatus } from '@/types/enums'
import { formatDate, formatDateTime } from '@/utils/format'
import { toSortParam } from '@/utils/params'
import { RepairPriorityTag, RepairStatusTag } from '../components/RepairStatusTag'
import { REPAIR_PRIORITY_CONFIG, REPAIR_STATUS_CONFIG } from '../constants/status'
import { repairsApi, type RepairOrderSummary } from '../repairsApi'

const SORT_FIELDS = new Set(['receivedAt', 'updatedAt', 'expectedReturnDate', 'priority'])

/** Danh sách phiếu – ADMIN/STAFF thấy tất cả, KTV chỉ thấy phiếu được giao (Backend tự lọc). */
export function RepairsPage() {
  const navigate = useNavigate()
  const role = useAppSelector((s) => s.auth.user!.role)
  const [params] = useSearchParams()
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [sort, setSort] = useState<string>()
  const [keyword, setKeyword] = useState(params.get('q') ?? '')
  const [statuses, setStatuses] = useState<RepairStatus[]>([])
  const [priority, setPriority] = useState<RepairPriority>()
  const [technicianId, setTechnicianId] = useState<number>()
  const [range, setRange] = useState<[string, string] | null>(null)
  const q = useDebouncedValue(keyword)

  const { data, loading, error, reload } = useAsyncData(
    () => repairsApi.search({ page, size, sort, q, status: statuses, priority, technicianId, from: range?.[0], to: range?.[1] }),
    [page, size, sort, q, statuses, priority, technicianId, range],
  )
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(0)
  }

  const columns: TableProps<RepairOrderSummary>['columns'] = [
    {
      title: 'Phiếu',
      dataIndex: 'code',
      render: (_, r) => (
        <div>
          <div className="font-mono text-xs font-semibold text-primary">{r.code}</div>
          <div className="text-xs text-text-muted">{formatDateTime(r.receivedAt)}</div>
        </div>
      ),
    },
    {
      title: 'Khách hàng / Thiết bị',
      render: (_, r) => (
        <div className="min-w-0">
          <div className="font-medium text-text">{r.deviceName}</div>
          <div className="text-xs text-text-secondary">
            {r.customerName} · <span className="tabular-nums">{r.customerPhone}</span>
          </div>
        </div>
      ),
    },
    { title: 'Trạng thái', dataIndex: 'status', render: (s: RepairStatus) => <RepairStatusTag status={s} /> },
    { title: 'Ưu tiên', dataIndex: 'priority', sorter: true, responsive: ['md'], render: (p: RepairPriority) => <RepairPriorityTag priority={p} /> },
    { title: 'Kỹ thuật viên', dataIndex: 'technicianName', responsive: ['lg'], render: (v: string | null) => v ?? <span className="text-warning">Chưa phân công</span> },
    {
      title: 'Hẹn trả',
      dataIndex: 'expectedReturnDate',
      sorter: true,
      responsive: ['md'],
      render: (v: string | null, r) => {
        if (!v) return '—'
        const overdue = dayjs(v).isBefore(dayjs(), 'day') && !['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(r.status)
        return <span className={overdue ? 'font-medium text-error' : ''}>{formatDate(v)}{overdue && ' · trễ hẹn'}</span>
      },
    },
  ]

  const hasFilter = Boolean(q || statuses.length || priority || technicianId || range)

  return (
    <>
      <PageHeader
        title={role === 'TECHNICIAN' ? 'Phiếu được giao' : 'Phiếu sửa chữa'}
        description="Theo dõi tiến độ, lọc theo trạng thái, kỹ thuật viên và thời gian tiếp nhận."
        extra={role !== 'TECHNICIAN' && <Button type="primary" icon={<InboxOutlined />} onClick={() => navigate('/reception')}>Tiếp nhận thiết bị</Button>}
      />
      <Card styles={{ body: { padding: 0 } }}>
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-5">
          <Input
            aria-label="Tìm phiếu"
            placeholder="Mã phiếu, khách, SĐT, serial..."
            prefix={<SearchOutlined className="text-text-muted" />}
            allowClear
            value={keyword}
            onChange={(e) => resetPage(setKeyword)(e.target.value)}
            className="xl:col-span-2"
          />
          <Select<RepairStatus[]>
            aria-label="Lọc trạng thái"
            mode="multiple"
            maxTagCount="responsive"
            placeholder="Tất cả trạng thái"
            allowClear
            value={statuses}
            onChange={resetPage(setStatuses)}
            options={REPAIR_STATUSES.map((s) => ({ value: s, label: REPAIR_STATUS_CONFIG[s].label }))}
          />
          <Select<RepairPriority>
            aria-label="Lọc ưu tiên"
            placeholder="Mọi mức ưu tiên"
            allowClear
            value={priority}
            onChange={resetPage(setPriority)}
            options={(Object.keys(REPAIR_PRIORITY_CONFIG) as RepairPriority[]).map((p) => ({ value: p, label: REPAIR_PRIORITY_CONFIG[p].label }))}
          />
          {role !== 'TECHNICIAN' ? (
            <TechnicianSelect value={technicianId} onChange={resetPage(setTechnicianId)} placeholder="Mọi kỹ thuật viên" />
          ) : (
            <span />
          )}
          <DatePicker.RangePicker
            aria-label="Khoảng ngày tiếp nhận"
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            onChange={(v) => resetPage(setRange)(v?.[0] && v[1] ? [v[0].format('YYYY-MM-DD'), v[1].format('YYYY-MM-DD')] : null)}
            className="md:col-span-2 xl:col-span-2"
          />
        </div>
        {error && !loading ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table<RepairOrderSummary>
            rowKey="id"
            columns={columns}
            dataSource={data?.content}
            loading={loading}
            scroll={{ x: 'max-content' }}
            onRow={(r) => ({ onClick: () => navigate(`/repairs/${r.id}`), className: 'cursor-pointer' })}
            locale={{
              emptyText: loading ? ' ' : (
                <EmptyState compact title={hasFilter ? 'Không có phiếu phù hợp' : 'Chưa có phiếu sửa chữa'} description={hasFilter ? 'Thử bỏ bớt bộ lọc.' : undefined} />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: data?.totalElements ?? 0,
              showSizeChanger: true,
              showTotal: (t) => `${t} phiếu`,
              className: '!px-4',
            }}
            onChange={(p, _f, sorter) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter
              setSort(toSortParam(s?.field, s?.order, SORT_FIELDS))
              setPage((p.current ?? 1) - 1)
              setSize(p.pageSize ?? 20)
            }}
          />
        )}
      </Card>
    </>
  )
}
