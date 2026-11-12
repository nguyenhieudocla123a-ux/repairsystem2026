import {
  ArrowRightOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  InboxOutlined,
  MobileOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SendOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Card, DatePicker, Progress, Table, type TableProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatCard } from '@/components/StatCard'
import { StatusTag } from '@/components/StatusTag'
import { REPAIR_PRIORITY_CONFIG, REPAIR_STATUS_CONFIG, repairProgressPercent } from '@/features/repairs/constants/status'
import type { RepairOrderSummary } from '@/features/repairs/repairsApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { ROLE_LABELS } from '@/routes/appRoutes'
import { formatDate, formatMoney, formatNumber } from '@/utils/format'
import { HorizontalBars, RevenueChart } from '../components/Charts'
import { dashboardApi, type LowStockPart } from '../dashboardApi'

/** Trang Tổng quan theo vai trò – mỗi vai trò gọi đúng một API /dashboard/{role} (Backend tự giới hạn dữ liệu). */
export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!
  return (
    <>
      {user.role === 'ADMIN' && <AdminDashboardView />}
      {user.role === 'STAFF' && <StaffDashboardView />}
      {user.role === 'TECHNICIAN' && <TechnicianDashboardView />}
      {user.role === 'CUSTOMER' && <CustomerDashboardView />}
    </>
  )
}

// ---------------------------------------------------------------- Khung chung

function greeting() {
  const h = dayjs().hour()
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
}

/** Đầu trang: một <h1> "Tổng quan", lời chào + ngày, hành động chính của vai trò ở bên phải. */
function DashboardHeader({ actions }: { actions?: ReactNode }) {
  const user = useAppSelector((s) => s.auth.user)!
  const firstName = user.fullName.trim().split(/\s+/).pop()
  const today = dayjs().format('dddd, DD/MM/YYYY')
  return (
    <div data-enter className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="m-0 text-sm text-text-secondary">
          {today.charAt(0).toUpperCase() + today.slice(1)} · {ROLE_LABELS[user.role]}
        </p>
        <h1 className="mt-1 mb-0 text-2xl leading-8 font-semibold tracking-tight text-text">
          {greeting()}, {firstName}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

function SectionCard({ title, extra, children, className = '' }: { title: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card title={<h2 className="m-0 text-base font-semibold">{title}</h2>} extra={extra} className={`h-full ${className}`}>
      {children}
    </Card>
  )
}

function ViewAll({ to, children = 'Xem tất cả' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium">
      {children} <ArrowRightOutlined className="text-xs" aria-hidden="true" />
    </Link>
  )
}

/** Bảng phiếu gọn (việc cần làm / việc ưu tiên) – bấm dòng để mở phiếu. */
function OrderTable({ orders, loading, empty, showCustomer = true }: { orders: RepairOrderSummary[] | undefined; loading: boolean; empty: string; showCustomer?: boolean }) {
  const navigate = useNavigate()
  const columns: TableProps<RepairOrderSummary>['columns'] = [
    {
      title: 'Phiếu',
      dataIndex: 'code',
      render: (v: string, o) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-primary">{v}</span>
          <span className="text-xs text-text-muted">{formatDate(o.receivedAt)}</span>
        </span>
      ),
    },
    {
      title: 'Thiết bị',
      key: 'device',
      render: (_, o) => (
        <span className="flex flex-col">
          <span className="font-medium text-text">{o.deviceName}</span>
          {showCustomer && <span className="text-xs text-text-secondary">{o.customerName}</span>}
        </span>
      ),
    },
    { title: 'Trạng thái', dataIndex: 'status', render: (s: RepairOrderSummary['status']) => <StatusTag value={s} config={REPAIR_STATUS_CONFIG} /> },
    { title: 'Ưu tiên', dataIndex: 'priority', responsive: ['md'], render: (p: RepairOrderSummary['priority']) => <StatusTag value={p} config={REPAIR_PRIORITY_CONFIG} /> },
    { title: 'Hẹn trả', dataIndex: 'expectedReturnDate', responsive: ['lg'], render: (d: string | null) => (d ? formatDate(d) : '—') },
  ]
  return (
    <Table<RepairOrderSummary>
      rowKey="id"
      size="middle"
      columns={columns}
      dataSource={orders}
      loading={loading}
      pagination={false}
      scroll={{ x: 'max-content' }}
      onRow={(o) => ({ onClick: () => navigate(`/repairs/${o.id}`), className: 'cursor-pointer' })}
      locale={{ emptyText: loading ? ' ' : <EmptyState compact title={empty} /> }}
    />
  )
}

/** Danh sách lối tắt: biểu tượng + tên + mô tả ngắn, mỗi dòng là một liên kết. */
function Shortcuts({ items }: { items: { to: string; icon: ReactNode; title: string; text: string }[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {items.map((i) => (
        <li key={i.to}>
          <Link to={i.to} className="no-underline group flex items-center gap-3 rounded-lg p-2.5 text-text hover:bg-tone-neutral-bg">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-primary-bg text-tone-primary-fg">{i.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{i.title}</span>
              <span className="block truncate text-xs text-text-secondary">{i.text}</span>
            </span>
            <ArrowRightOutlined aria-hidden="true" className="text-xs text-text-muted group-hover:text-primary" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------- ADMIN

function AdminDashboardView() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(29, 'day'), dayjs()])
  const from = range[0].format('YYYY-MM-DD')
  const to = range[1].format('YYYY-MM-DD')
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.admin({ from, to }), [from, to])
  const rangeLabel = `${range[0].format('DD/MM')} – ${range[1].format('DD/MM/YYYY')}`
  const status = (data?.statusDistribution ?? []).filter((s) => s.count > 0).sort((a, b) => b.count - a.count)

  const header = (
    <DashboardHeader
      actions={
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
      }
    />
  )
  if (error) return (<>{header}<ErrorState error={error} onRetry={reload} /></>)

  return (
    <>
      {header}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh thu" value={formatMoney(data?.revenue)} icon={<DollarOutlined />} tone="success" loading={loading} hint={rangeLabel} />
        <StatCard label="Phiếu tiếp nhận" value={formatNumber(data?.totalOrders)} icon={<InboxOutlined />} loading={loading} hint={rangeLabel} />
        <StatCard label="Hoàn thành" value={formatNumber(data?.completedOrders)} icon={<CheckCircleOutlined />} tone="info" loading={loading} hint={rangeLabel} />
        <StatCard label="Đang xử lý" value={formatNumber(data?.inProgressOrders)} icon={<ToolOutlined />} tone="warning" loading={loading} hint="Tại thời điểm hiện tại" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <SectionCard title="Doanh thu theo ngày" extra={<ViewAll to="/reports">Báo cáo</ViewAll>} className="xl:col-span-2">
          {loading ? (
            <div className="h-[260px]" />
          ) : data && data.revenueSeries.some((p) => p.amount > 0) ? (
            <RevenueChart data={data.revenueSeries} ariaLabel={`Biểu đồ doanh thu theo ngày từ ${rangeLabel}, tổng ${formatMoney(data.revenue)}`} />
          ) : (
            <EmptyState compact title="Chưa có doanh thu trong khoảng này" description="Doanh thu được ghi nhận khi bàn giao phiếu." />
          )}
        </SectionCard>
        <SectionCard title="Phiếu theo trạng thái" extra={<ViewAll to="/repairs" />}>
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
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Linh kiện dùng nhiều" extra={<ViewAll to="/reports">Báo cáo</ViewAll>}>
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
        <SectionCard title="Linh kiện sắp hết" extra={<ViewAll to="/inventory">Kho linh kiện</ViewAll>}>
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
    </>
  )
}

// ---------------------------------------------------------------- STAFF

function StaffDashboardView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.staff(), [])
  const header = (
    <DashboardHeader
      actions={
        <>
          <Button icon={<ScheduleOutlined />} onClick={() => navigate('/repair-requests')}>Yêu cầu online</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/reception')}>Tiếp nhận thiết bị</Button>
        </>
      }
    />
  )
  if (error) return (<>{header}<ErrorState error={error} onRetry={reload} /></>)
  return (
    <>
      {header}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Chờ kiểm tra" value={formatNumber(data?.newOrders)} icon={<InboxOutlined />} loading={loading} hint="Phiếu mới tiếp nhận" onClick={() => navigate('/repairs')} />
        <StatCard label="Yêu cầu online" value={formatNumber(data?.pendingRequests)} icon={<ScheduleOutlined />} tone="info" loading={loading} hint="Chờ khách mang máy tới" onClick={() => navigate('/repair-requests')} />
        <StatCard label="Chờ khách duyệt" value={formatNumber(data?.waitingConfirmation)} icon={<FileTextOutlined />} tone="warning" loading={loading} hint="Báo giá đã gửi" onClick={() => navigate('/quotations')} />
        <StatCard label="Sẵn sàng bàn giao" value={formatNumber(data?.readyForDelivery)} icon={<SendOutlined />} tone="success" loading={loading} hint="Đã sửa xong" onClick={() => navigate('/repairs')} />
        {/* Thẻ thứ 5: trải 2 cột khi lưới 2 cột để không có hàng trống một nửa */}
        <div className="flex sm:col-span-2 xl:col-span-1">
          <StatCard label="Yêu cầu bảo hành" value={formatNumber(data?.openWarrantyClaims)} icon={<SafetyCertificateOutlined />} tone="error" loading={loading} hint="Chờ tiếp nhận" onClick={() => navigate('/warranties')} />
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Việc cần xử lý" extra={<ViewAll to="/repairs" />} className="xl:col-span-2 [&_.ant-card-body]:p-0">
          <OrderTable orders={data?.todo} loading={loading} empty="Không có phiếu nào cần xử lý" />
        </SectionCard>
        <SectionCard title="Lối tắt">
          <Shortcuts
            items={[
              { to: '/reception', icon: <InboxOutlined />, title: 'Tiếp nhận thiết bị', text: 'Lập phiếu cho khách mang máy tới' },
              { to: '/quotations', icon: <FileTextOutlined />, title: 'Báo giá', text: 'Theo dõi báo giá chờ khách duyệt' },
              { to: '/warranties', icon: <SafetyCertificateOutlined />, title: 'Bảo hành', text: 'Tra cứu và xử lý yêu cầu bảo hành' },
              { to: '/inventory', icon: <AuditOutlined />, title: 'Kho linh kiện', text: 'Tồn kho, nhập kho, sổ kho' },
              { to: '/customers', icon: <MobileOutlined />, title: 'Khách hàng & thiết bị', text: 'Hồ sơ khách và máy đã đăng ký' },
            ]}
          />
        </SectionCard>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- TECHNICIAN

function TechnicianDashboardView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.technician(), [])
  const header = <DashboardHeader actions={<Button type="primary" icon={<ToolOutlined />} onClick={() => navigate('/tasks')}>Công việc của tôi</Button>} />
  if (error) return (<>{header}<ErrorState error={error} onRetry={reload} /></>)
  return (
    <>
      {header}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Mới được giao" value={formatNumber(data?.assigned)} icon={<ClockCircleOutlined />} loading={loading} hint="Chưa kiểm tra" onClick={() => navigate('/tasks')} />
        <StatCard label="Đang xử lý" value={formatNumber(data?.inProgress)} icon={<ToolOutlined />} tone="info" loading={loading} hint="Kiểm tra, chờ linh kiện, đang sửa" onClick={() => navigate('/tasks')} />
        <StatCard label="Hoàn thành tháng này" value={formatNumber(data?.completedThisMonth)} icon={<CheckCircleOutlined />} tone="success" loading={loading} hint={dayjs().format('[Tháng] MM/YYYY')} />
      </div>
      <SectionCard title="Việc ưu tiên" extra={<ViewAll to="/tasks" />} className="[&_.ant-card-body]:p-0">
        <OrderTable orders={data?.priorityTasks} loading={loading} empty="Bạn không có việc nào đang chờ" />
      </SectionCard>
    </>
  )
}

// ---------------------------------------------------------------- CUSTOMER

function CustomerDashboardView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.customer(), [])
  const header = (
    <DashboardHeader
      actions={
        <>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => navigate('/my/warranties')}>Bảo hành của tôi</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/my/devices')}>Gửi yêu cầu sửa</Button>
        </>
      }
    />
  )
  if (error) return (<>{header}<ErrorState error={error} onRetry={reload} /></>)
  return (
    <>
      {header}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Đang sửa chữa" value={formatNumber(data?.activeOrders)} icon={<ToolOutlined />} tone="info" loading={loading} onClick={() => navigate('/my/repairs')} />
        <StatCard label="Báo giá chờ tôi duyệt" value={formatNumber(data?.pendingQuotations)} icon={<FileTextOutlined />} tone="warning" loading={loading} onClick={() => navigate('/my/quotations')} />
        <StatCard label="Bảo hành còn hạn" value={formatNumber(data?.activeWarranties)} icon={<SafetyCertificateOutlined />} tone="success" loading={loading} onClick={() => navigate('/my/warranties')} />
        <StatCard label="Thiết bị của tôi" value={formatNumber(data?.deviceCount)} icon={<MobileOutlined />} loading={loading} onClick={() => navigate('/my/devices')} />
      </div>
      <SectionCard title="Thiết bị đang sửa" extra={<ViewAll to="/my/repairs" />}>
        {!loading && !data?.activeOrderList.length ? (
          <EmptyState compact title="Bạn không có thiết bị nào đang sửa" description="Gửi yêu cầu sửa từ mục Thiết bị của tôi, cửa hàng sẽ liên hệ hẹn lịch." />
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
            {data?.activeOrderList.map((o) => (
              <li key={o.id}>
                <Link to={`/my/repairs/${o.id}`} className="no-underline rf-card-link block rounded-card border border-border p-4 text-text">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{o.deviceName}</span>
                      <span className="block font-mono text-xs text-text-muted">{o.code}</span>
                    </span>
                    <StatusTag value={o.status} config={REPAIR_STATUS_CONFIG} />
                  </span>
                  <Progress percent={repairProgressPercent(o.status)} showInfo={false} size="small" className="mt-3 mb-1" aria-label={`Tiến độ ${repairProgressPercent(o.status)}%`} />
                  <span className="flex justify-between text-xs text-text-secondary">
                    <span>Tiếp nhận {formatDate(o.receivedAt)}</span>
                    {o.expectedReturnDate && <span>Hẹn trả {formatDate(o.expectedReturnDate)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  )
}
