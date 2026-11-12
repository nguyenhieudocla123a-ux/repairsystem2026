import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SendOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Card, DatePicker, List, Table } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { WorkbenchIllustration } from '@/components/illustrations'
import { Scene3DBoundary } from '@/components/three/Scene3DBoundary'
import { StatCard } from '@/components/StatCard'
import { StatusTag } from '@/components/StatusTag'
import { REPAIR_PRIORITY_CONFIG, REPAIR_STATUS_CONFIG } from '@/features/repairs/constants/status'
import type { RepairOrderSummary } from '@/features/repairs/repairsApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { ROLE_LABELS } from '@/routes/appRoutes'
import { formatDate, formatMoney, formatNumber } from '@/utils/format'
import { HorizontalBars, RevenueChart } from '../components/Charts'
import { dashboardApi, type LowStockPart } from '../dashboardApi'

/** Dashboard theo vai trò – mỗi vai trò gọi đúng một API /dashboard/{role} (Backend tự giới hạn dữ liệu). */
export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!
  const firstName = user.fullName.trim().split(/\s+/).pop()
  return (
    <>
      <WelcomeBanner name={firstName ?? user.fullName} role={ROLE_LABELS[user.role]} />
      {user.role === 'ADMIN' && <AdminDashboardView />}
      {user.role === 'STAFF' && <StaffDashboardView />}
      {user.role === 'TECHNICIAN' && <TechnicianDashboardView />}
      {user.role === 'CUSTOMER' && <CustomerDashboardView />}
    </>
  )
}

const TODAY_LABEL = (() => {
  const s = dayjs().format('dddd, DD/MM/YYYY')
  return s.charAt(0).toUpperCase() + s.slice(1)
})()

const RepairScene3D = lazy(() => import('@/components/three/RepairScene3D'))

/** Banner chào mừng: nền navy + cảnh 3D (≥ 640px; minh họa SVG khi đang tải hoặc lỗi WebGL). Giữ một <h1> cho trang. */
function WelcomeBanner({ name, role }: { name: string; role: string }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-[radial-gradient(120%_120%_at_85%_0%,#0C4A6E_0%,#0B1220_60%)] px-6 py-6 text-white md:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div className="relative flex items-center justify-between gap-6">
        <div data-enter className="min-w-0">
          <p className="m-0 text-sm text-sky-200">{TODAY_LABEL}</p>
          <h1 className="mt-1 mb-1 text-2xl font-semibold tracking-tight md:text-[28px]">Xin chào, {name}</h1>
          <p className="m-0 text-sm text-slate-300">Bạn đang làm việc với vai trò <span className="font-medium text-white">{role}</span>.</p>
        </div>
        <div className="relative -my-6 -mr-4 hidden h-40 w-[220px] shrink-0 sm:block md:h-44 md:w-[340px]">
          <Scene3DBoundary fallback={<WorkbenchIllustration className="h-full w-auto" />}>
            <Suspense fallback={<WorkbenchIllustration className="h-full w-auto" />}>
              <RepairScene3D layout="banner" className="absolute inset-0" />
            </Suspense>
          </Scene3DBoundary>
        </div>
      </div>
    </section>
  )
}

const statGrid = 'mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'

function SectionCard({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Card title={<h2 className="m-0 text-base font-semibold">{title}</h2>} extra={extra} className="h-full">
      {children}
    </Card>
  )
}

/** Danh sách phiếu ngắn (việc cần làm / phiếu đang sửa). */
function OrderList({ orders, basePath, loading, empty }: { orders: RepairOrderSummary[] | undefined; basePath: string; loading: boolean; empty: string }) {
  return (
    <List
      loading={loading}
      dataSource={orders}
      locale={{ emptyText: <EmptyState compact title={empty} /> }}
      renderItem={(o) => (
        <List.Item extra={<StatusTag value={o.status} config={REPAIR_STATUS_CONFIG} />}>
          <List.Item.Meta
            title={
              <Link to={`${basePath}/${o.id}`} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm">{o.code}</span>
                {o.priority !== 'NORMAL' && <StatusTag value={o.priority} config={REPAIR_PRIORITY_CONFIG} />}
              </Link>
            }
            description={
              <span className="text-xs">
                {o.deviceName}
                {basePath !== '/my/repairs' && ` · ${o.customerName}`}
                {o.expectedReturnDate && ` · hẹn trả ${formatDate(o.expectedReturnDate)}`}
              </span>
            }
          />
        </List.Item>
      )}
    />
  )
}

// ---------------------------------------------------------------- ADMIN

function AdminDashboardView() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(29, 'day'), dayjs()])
  const from = range[0].format('YYYY-MM-DD')
  const to = range[1].format('YYYY-MM-DD')
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.admin({ from, to }), [from, to])

  if (error) return <ErrorState error={error} onRetry={reload} />
  const rangeLabel = `${range[0].format('DD/MM')} – ${range[1].format('DD/MM/YYYY')}`
  const status = (data?.statusDistribution ?? []).filter((s) => s.count > 0).sort((a, b) => b.count - a.count)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <span className="text-sm text-text-secondary">Khoảng thời gian</span>
        <DatePicker.RangePicker
          aria-label="Khoảng thời gian thống kê"
          value={range}
          allowClear={false}
          format="DD/MM/YYYY"
          disabledDate={(d) => d.isAfter(dayjs(), 'day')}
          presets={[
            { label: '7 ngày qua', value: [dayjs().subtract(6, 'day'), dayjs()] },
            { label: '30 ngày qua', value: [dayjs().subtract(29, 'day'), dayjs()] },
            { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
            { label: '90 ngày qua', value: [dayjs().subtract(89, 'day'), dayjs()] },
          ]}
          onChange={(v) => v?.[0] && v[1] && setRange([v[0], v[1]])}
        />
      </div>
      <div className={statGrid}>
        <StatCard label="Phiếu tiếp nhận" value={formatNumber(data?.totalOrders)} icon={<InboxOutlined />} loading={loading} hint={rangeLabel} />
        <StatCard label="Đang xử lý (hiện tại)" value={formatNumber(data?.inProgressOrders)} icon={<ToolOutlined />} tone="info" loading={loading} />
        <StatCard label="Hoàn thành" value={formatNumber(data?.completedOrders)} icon={<CheckCircleOutlined />} tone="success" loading={loading} hint={rangeLabel} />
        <StatCard label="Doanh thu" value={formatMoney(data?.revenue)} icon={<DollarOutlined />} tone="warning" loading={loading} hint="Tổng tiền các phiếu đã bàn giao" />
      </div>

      <div className="mb-6">
        <SectionCard title="Doanh thu theo ngày" extra={<Link to="/reports">Xem báo cáo</Link>}>
          {loading ? (
            <div className="h-[260px]" />
          ) : data && data.revenueSeries.some((p) => p.amount > 0) ? (
            <RevenueChart data={data.revenueSeries} ariaLabel={`Biểu đồ doanh thu theo ngày từ ${rangeLabel}, tổng ${formatMoney(data.revenue)}`} />
          ) : (
            <EmptyState compact title="Chưa có doanh thu trong khoảng này" description="Doanh thu được ghi nhận khi bàn giao phiếu và thu tiền." />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Phiếu theo trạng thái (hiện tại)">
          {status.length ? (
            <HorizontalBars
              unit="phiếu"
              ariaLabel={`Số phiếu theo trạng thái: ${status.map((s) => `${REPAIR_STATUS_CONFIG[s.status].label} ${s.count}`).join(', ')}`}
              data={status.map((s) => ({ label: REPAIR_STATUS_CONFIG[s.status].label, value: s.count }))}
            />
          ) : (
            !loading && <EmptyState compact title="Chưa có phiếu sửa chữa" />
          )}
        </SectionCard>
        <SectionCard title="Linh kiện dùng nhiều">
          {data?.topParts.length ? (
            <HorizontalBars
              unit="cái"
              ariaLabel={`Linh kiện dùng nhiều: ${data.topParts.map((p) => `${p.partName} ${p.quantity}`).join(', ')}`}
              data={data.topParts.map((p) => ({ label: p.partName, value: p.quantity }))}
            />
          ) : (
            !loading && <EmptyState compact title="Chưa xuất linh kiện trong khoảng này" />
          )}
        </SectionCard>
        <div className="lg:col-span-2">
          <SectionCard title="Linh kiện sắp hết" extra={<Link to="/inventory">Kho linh kiện</Link>}>
            <Table<LowStockPart>
              rowKey="id"
              size="small"
              loading={loading}
              pagination={false}
              dataSource={data?.lowStockParts}
              locale={{ emptyText: <EmptyState compact title="Không có linh kiện nào dưới mức tối thiểu" /> }}
              columns={[
                { title: 'SKU', dataIndex: 'sku', render: (v: string) => <span className="font-mono text-xs">{v}</span> },
                { title: 'Linh kiện', dataIndex: 'name' },
                {
                  title: 'Tồn / tối thiểu', key: 'q', align: 'right',
                  render: (_, p) => (
                    <span className="inline-flex items-center gap-1.5 font-medium text-warning tabular-nums">
                      <WarningOutlined aria-hidden="true" /> {p.quantityOnHand} / {p.minStockLevel}
                      <span className="sr-only">đã chạm hoặc dưới mức tối thiểu</span>
                    </span>
                  ),
                },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- STAFF

function StaffDashboardView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.staff(), [])
  if (error) return <ErrorState error={error} onRetry={reload} />
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Phiếu mới chờ kiểm tra" value={formatNumber(data?.newOrders)} icon={<InboxOutlined />} loading={loading} onClick={() => navigate('/repairs')} />
        <StatCard label="Yêu cầu online chờ" value={formatNumber(data?.pendingRequests)} icon={<ScheduleOutlined />} tone="info" loading={loading} onClick={() => navigate('/repair-requests')} />
        <StatCard label="Chờ khách xác nhận" value={formatNumber(data?.waitingConfirmation)} icon={<FileTextOutlined />} tone="warning" loading={loading} onClick={() => navigate('/quotations')} />
        <StatCard label="Sẵn sàng bàn giao" value={formatNumber(data?.readyForDelivery)} icon={<SendOutlined />} tone="success" loading={loading} onClick={() => navigate('/repairs')} />
        <StatCard label="Yêu cầu bảo hành chờ" value={formatNumber(data?.openWarrantyClaims)} icon={<SafetyCertificateOutlined />} tone="error" loading={loading} onClick={() => navigate('/warranties')} />
      </div>
      <SectionCard title="Việc cần xử lý" extra={<Link to="/repairs">Tất cả phiếu</Link>}>
        <OrderList orders={data?.todo} basePath="/repairs" loading={loading} empty="Không có phiếu nào cần xử lý" />
      </SectionCard>
    </>
  )
}

// ---------------------------------------------------------------- TECHNICIAN

function TechnicianDashboardView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.technician(), [])
  if (error) return <ErrorState error={error} onRetry={reload} />
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Mới được giao, chưa kiểm tra" value={formatNumber(data?.assigned)} icon={<ClockCircleOutlined />} loading={loading} onClick={() => navigate('/tasks')} />
        <StatCard label="Đang sửa" value={formatNumber(data?.inProgress)} icon={<ToolOutlined />} tone="info" loading={loading} onClick={() => navigate('/tasks')} />
        <StatCard label="Hoàn thành tháng này" value={formatNumber(data?.completedThisMonth)} icon={<CheckCircleOutlined />} tone="success" loading={loading} />
      </div>
      <SectionCard title="Việc ưu tiên" extra={<Link to="/tasks">Công việc của tôi</Link>}>
        <OrderList orders={data?.priorityTasks} basePath="/repairs" loading={loading} empty="Bạn không có việc nào đang chờ" />
      </SectionCard>
    </>
  )
}

// ---------------------------------------------------------------- CUSTOMER

function CustomerDashboardView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.customer(), [])
  if (error) return <ErrorState error={error} onRetry={reload} />
  return (
    <>
      <div className={statGrid}>
        <StatCard label="Thiết bị của tôi" value={formatNumber(data?.deviceCount)} icon={<MobileOutlined />} loading={loading} onClick={() => navigate('/my/devices')} />
        <StatCard label="Đang sửa chữa" value={formatNumber(data?.activeOrders)} icon={<ToolOutlined />} tone="info" loading={loading} onClick={() => navigate('/my/repairs')} />
        <StatCard label="Báo giá chờ tôi duyệt" value={formatNumber(data?.pendingQuotations)} icon={<FileTextOutlined />} tone="warning" loading={loading} onClick={() => navigate('/my/quotations')} />
        <StatCard label="Bảo hành còn hạn" value={formatNumber(data?.activeWarranties)} icon={<SafetyCertificateOutlined />} tone="success" loading={loading} onClick={() => navigate('/my/warranties')} />
      </div>
      <SectionCard title="Thiết bị đang sửa" extra={<Link to="/my/repairs">Tất cả</Link>}>
        <OrderList orders={data?.activeOrderList} basePath="/my/repairs" loading={loading} empty="Bạn không có thiết bị nào đang sửa" />
      </SectionCard>
    </>
  )
}
