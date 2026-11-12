import { Card, DatePicker, Segmented, Table } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { MoneyText } from '@/components/MoneyText'
import { PageHeader } from '@/components/PageHeader'
import { useAsyncData } from '@/hooks/useAsyncData'
import { formatMoney, formatNumber } from '@/utils/format'
import { HorizontalBars, RevenueBars } from '../components/Charts'
import { dashboardApi, type AmountPoint, type DateRange, type PartUsageStat, type TechnicianStat } from '../dashboardApi'

type GroupBy = 'DAY' | 'MONTH'

/** ADMIN: báo cáo doanh thu, linh kiện, hiệu suất KTV trong một khoảng thời gian (tối đa 366 ngày – Backend kiểm tra). */
export function ReportsPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(29, 'day'), dayjs()])
  const [groupBy, setGroupBy] = useState<GroupBy>('DAY')
  const r: DateRange = { from: range[0].format('YYYY-MM-DD'), to: range[1].format('YYYY-MM-DD') }
  const rangeLabel = `${range[0].format('DD/MM/YYYY')} – ${range[1].format('DD/MM/YYYY')}`

  return (
    <>
      <PageHeader
        title="Báo cáo"
        description="Số liệu tính theo giờ Việt Nam; doanh thu ghi nhận theo ngày bàn giao."
        extra={
          <DatePicker.RangePicker
            aria-label="Khoảng thời gian báo cáo"
            value={range}
            allowClear={false}
            format="DD/MM/YYYY"
            disabledDate={(d) => d.isAfter(dayjs(), 'day')}
            presets={[
              { label: '30 ngày qua', value: [dayjs().subtract(29, 'day'), dayjs()] },
              { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Quý này', value: [dayjs().subtract(dayjs().month() % 3, 'month').startOf('month'), dayjs()] },
              { label: '12 tháng qua', value: [dayjs().subtract(11, 'month').startOf('month'), dayjs()] },
            ]}
            onChange={(v) => {
              if (!v?.[0] || !v[1]) return
              setRange([v[0], v[1]])
              if (v[1].diff(v[0], 'day') > 92) setGroupBy('MONTH')
            }}
          />
        }
      />
      <div className="flex flex-col gap-6">
        <RevenueSection range={r} rangeLabel={rangeLabel} groupBy={groupBy} onGroupBy={setGroupBy} />
        <div className="grid gap-6 xl:grid-cols-2">
          <PartsSection range={r} rangeLabel={rangeLabel} />
          <TechnicianSection range={r} />
        </div>
      </div>
    </>
  )
}

function RevenueSection({ range, rangeLabel, groupBy, onGroupBy }: { range: DateRange; rangeLabel: string; groupBy: GroupBy; onGroupBy: (g: GroupBy) => void }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.revenue(range, groupBy), [range.from, range.to, groupBy])
  const total = data?.reduce((s, p) => s + p.amount, 0) ?? 0
  const hasData = !!data?.some((p) => p.amount > 0)

  return (
    <Card
      title={
        <span className="flex flex-col">
          <h2 className="m-0 text-base font-semibold">Doanh thu</h2>
          <span className="text-sm font-normal text-text-secondary">Tổng {loading ? '…' : formatMoney(total)}</span>
        </span>
      }
      extra={
        <span className="flex flex-wrap gap-2">
          <Segmented<GroupBy> size="small" value={groupBy} onChange={onGroupBy} options={[{ value: 'DAY', label: 'Theo ngày' }, { value: 'MONTH', label: 'Theo tháng' }]} />
          <Segmented<'chart' | 'table'> size="small" value={view} onChange={setView} options={[{ value: 'chart', label: 'Biểu đồ' }, { value: 'table', label: 'Bảng' }]} />
        </span>
      }
    >
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <div className="h-[300px]" />
      ) : !hasData ? (
        <EmptyState compact title="Chưa có doanh thu trong khoảng này" />
      ) : view === 'chart' ? (
        <RevenueBars data={data!} groupBy={groupBy} ariaLabel={`Biểu đồ cột doanh thu ${groupBy === 'DAY' ? 'theo ngày' : 'theo tháng'} từ ${rangeLabel}, tổng ${formatMoney(total)}`} />
      ) : (
        <Table<AmountPoint>
          rowKey="date"
          size="small"
          dataSource={data!.filter((p) => p.amount > 0)}
          pagination={{ pageSize: 12, hideOnSinglePage: true }}
          columns={[
            { title: groupBy === 'DAY' ? 'Ngày' : 'Tháng', dataIndex: 'date', render: (d: string) => dayjs(d).format(groupBy === 'DAY' ? 'DD/MM/YYYY' : 'MM/YYYY') },
            { title: 'Doanh thu', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          ]}
        />
      )}
    </Card>
  )
}

function PartsSection({ range, rangeLabel }: { range: DateRange; rangeLabel: string }) {
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.partsUsage(range, 10), [range.from, range.to])
  return (
    <Card title={<h2 className="m-0 text-base font-semibold">Linh kiện sử dụng nhiều nhất</h2>}>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !loading && !data?.length ? (
        <EmptyState compact title="Chưa xuất linh kiện nào trong khoảng này" />
      ) : (
        <>
          {data && <HorizontalBars unit="cái" ariaLabel={`Top linh kiện dùng nhiều từ ${rangeLabel}`} data={data.map((p) => ({ label: p.partName, value: p.quantity }))} />}
          <Table<PartUsageStat>
            className="mt-4"
            rowKey="partId"
            size="small"
            loading={loading}
            dataSource={data}
            pagination={false}
            columns={[
              { title: 'SKU', dataIndex: 'sku', render: (v: string) => <span className="font-mono text-xs">{v}</span> },
              { title: 'Linh kiện', dataIndex: 'partName' },
              { title: 'Số lượng', dataIndex: 'quantity', align: 'right', render: (v: number) => <span className="tabular-nums">{formatNumber(v)}</span> },
            ]}
          />
        </>
      )}
    </Card>
  )
}

function TechnicianSection({ range }: { range: DateRange }) {
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.technicianPerformance(range), [range.from, range.to])
  return (
    <Card title={<h2 className="m-0 text-base font-semibold">Hiệu suất kỹ thuật viên</h2>}>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Table<TechnicianStat>
          rowKey="technicianId"
          size="small"
          loading={loading}
          dataSource={data}
          pagination={false}
          locale={{ emptyText: <EmptyState compact title="Chưa có kỹ thuật viên" /> }}
          columns={[
            { title: 'Kỹ thuật viên', dataIndex: 'fullName' },
            { title: 'Hoàn thành', dataIndex: 'completedCount', align: 'right', sorter: (a, b) => a.completedCount - b.completedCount, defaultSortOrder: 'descend', render: (v: number) => <span className="tabular-nums">{v}</span> },
            { title: 'Đang xử lý', dataIndex: 'activeCount', align: 'right', render: (v: number) => <span className="tabular-nums">{v}</span> },
            {
              title: 'TB giờ hoàn thành', dataIndex: 'avgHoursToComplete', align: 'right',
              render: (v: number | null) => <span className="tabular-nums">{v == null ? '—' : `${formatNumber(Math.round(v * 10) / 10)} giờ`}</span>,
            },
          ]}
        />
      )}
    </Card>
  )
}
