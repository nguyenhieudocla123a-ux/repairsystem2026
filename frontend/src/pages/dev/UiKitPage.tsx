import { CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, InboxOutlined, PlusOutlined, ToolOutlined, WarningOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Segmented, Space } from 'antd'
import { AxiosError, AxiosHeaders } from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { MoneyText } from '@/components/MoneyText'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { RepairPriorityTag, RepairStatusTag } from '@/features/repairs/components/RepairStatusTag'
import { AppShell } from '@/layouts/AppShell'
import { ROLE_LABELS } from '@/routes/appRoutes'
import { colors, toneClasses, type Tone } from '@/theme/tokens'
import { REPAIR_STATUSES, ROLES, type Role } from '@/types/enums'

/**
 * UI KIT – CHỈ CÓ Ở MÔI TRƯỜNG DEV (route không được đăng ký trong bản build production).
 * Các con số ở đây là giá trị minh họa cho component, không phải dữ liệu nghiệp vụ.
 */
const SAMPLE_API_ERROR = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
  status: 500,
  statusText: 'Internal Server Error',
  headers: {},
  config: { headers: new AxiosHeaders() },
  data: { code: 'INTERNAL_ERROR', status: 500, message: 'Đã có lỗi xảy ra, vui lòng thử lại sau', path: '/api/v1/x', timestamp: '' },
})

const TONES: Tone[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title} className="mb-4">
      {children}
    </Card>
  )
}

export function UiKitPage() {
  const [role, setRole] = useState<Role>('ADMIN')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  return (
    <AppShell
      role={role}
      userId={0}
      userName="Nguyễn Văn Minh"
      breadcrumbs={[{ title: 'Dev' }, { title: 'UI Kit' }]}
      selectedPath="/dashboard"
      unreadCount={3}
      onNavigate={() => undefined}
      onQuickSearch={() => undefined}
      onLogout={() => navigate('/login')}
    >
      <PageHeader
        title="RepairFlow UI Kit"
        description="Xem trước design system (docs/design-system.md). Giá trị trong trang là minh họa."
        extra={
          <Segmented<Role>
            value={role}
            onChange={setRole}
            options={ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r }))}
          />
        }
      />
      <Alert type="info" showIcon className="mb-4" title="Đổi vai trò ở góc phải để xem sidebar theo từng role. Trang này không có trong bản production." />

      <Section title="Màu (tokens.ts)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.entries(colors).map(([name, hex]) => (
            <div key={name} className="overflow-hidden rounded-lg border border-border">
              <div className="h-12" style={{ background: hex }} />
              <div className="px-2 py-1.5">
                <div className="truncate text-xs font-medium">{name}</div>
                <div className="text-xs text-text-muted">{hex}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TONES.map((t) => (
            <span key={t} className={`rounded-md px-3 py-1 text-sm font-medium ${toneClasses[t]}`}>
              tone: {t}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <span className="text-[28px] leading-9 font-bold tabular-nums">1.248 · display</span>
          <span className="text-xl leading-7 font-semibold">Tiêu đề trang · h1</span>
          <span className="text-base font-semibold">Tiêu đề card · h2</span>
          <span className="text-sm">Nội dung thường · body 14px</span>
          <span className="text-xs font-medium text-text-secondary">Nhãn KPI · caption</span>
        </div>
      </Section>

      <Section title="StatCard">
        <Space className="mb-4">
          <Button onClick={() => setLoading((v) => !v)}>{loading ? 'Tắt' : 'Bật'} trạng thái loading</Button>
        </Space>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tổng phiếu" value="1.248" icon={<InboxOutlined />} tone="primary" hint="Minh họa" loading={loading} />
          <StatCard label="Đang sửa" value="37" icon={<ToolOutlined />} tone="info" loading={loading} onClick={() => undefined} />
          <StatCard label="Hoàn thành" value="1.102" icon={<CheckCircleOutlined />} tone="success" loading={loading} />
          <StatCard label="Doanh thu" value={<MoneyText value={482500000} />} icon={<DollarOutlined />} tone="warning" loading={loading} />
          <StatCard label="Chờ khách xác nhận" value="4" icon={<ClockCircleOutlined />} tone="neutral" loading={loading} />
          <StatCard label="Tồn kho thấp" value="2" icon={<WarningOutlined />} tone="error" loading={loading} onClick={() => undefined} />
        </div>
      </Section>

      <Section title="StatusTag – trạng thái phiếu & độ ưu tiên">
        <div className="flex flex-wrap gap-2">
          {REPAIR_STATUSES.map((s) => (
            <RepairStatusTag key={s} status={s} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
            <RepairPriorityTag key={p} priority={p} />
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="EmptyState">
          <EmptyState
            title="Chưa có khách hàng"
            description="Thêm khách hàng đầu tiên để bắt đầu tiếp nhận thiết bị."
            action={<Button type="primary" icon={<PlusOutlined />}>Thêm khách hàng</Button>}
          />
        </Section>
        <Section title="ErrorState">
          <ErrorState error={SAMPLE_API_ERROR} onRetry={() => undefined} />
        </Section>
      </div>

      <Section title="Buttons">
        <Space wrap>
          <Button type="primary">Primary</Button>
          <Button>Default</Button>
          <Button type="dashed">Dashed</Button>
          <Button type="text">Text</Button>
          <Button type="primary" danger>Hủy phiếu</Button>
          <Button type="primary" loading>Đang lưu</Button>
          <Button disabled>Disabled</Button>
        </Space>
      </Section>
    </AppShell>
  )
}
