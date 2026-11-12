import { SearchOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, Form, Input, Modal, Segmented, Select, Space, Table, Tabs, Tag, type TableProps } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { REPAIR_PRIORITY_CONFIG } from '@/features/repairs/constants/status'
import { TechnicianSelect } from '@/features/users/components/TechnicianSelect'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { RepairPriority } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import { WarrantyDetailModal } from '../components/WarrantyDetailModal'
import { WarrantyStatusBadge } from '../components/WarrantyStatusBadge'
import { CLAIM_STATUS_CONFIG, warrantiesApi, type ClaimStatus, type Warranty, type WarrantyClaim } from '../warrantiesApi'

/** STAFF/ADMIN: tra cứu bảo hành + xử lý yêu cầu bảo hành. */
export function WarrantiesPage() {
  const [tab, setTab] = useState('claims')
  return (
    <>
      <PageHeader title="Bảo hành" description="Tra cứu phiếu bảo hành theo mã, mã phiếu sửa hoặc serial; tiếp nhận và xử lý yêu cầu bảo hành." />
      <Card styles={{ body: { paddingTop: 4 } }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'claims', label: 'Yêu cầu bảo hành', children: <ClaimsTab /> },
            { key: 'warranties', label: 'Danh sách bảo hành', children: <WarrantiesTab /> },
          ]}
        />
      </Card>
    </>
  )
}

function WarrantiesTab() {
  const isAdmin = useAppSelector((s) => s.auth.user?.role) === 'ADMIN'
  const [page, setPage] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [validOnly, setValidOnly] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [voiding, setVoiding] = useState<Warranty | null>(null)
  const q = useDebouncedValue(keyword)
  const { data, loading, error, reload } = useAsyncData(() => warrantiesApi.search({ page, size: 20, q, validOnly: validOnly || undefined }), [page, q, validOnly])

  const columns: TableProps<Warranty>['columns'] = [
    { title: 'Mã BH', dataIndex: 'code', render: (v: string) => <span className="font-mono text-xs font-semibold text-primary">{v}</span> },
    { title: 'Khách hàng', dataIndex: 'customerName' },
    { title: 'Thiết bị', key: 'device', render: (_, w) => <span>{w.device.name}{w.device.serialNumber && <span className="block font-mono text-xs text-text-muted">{w.device.serialNumber}</span>}</span> },
    { title: 'Phiếu sửa', dataIndex: 'repairOrderCode', responsive: ['lg'], render: (v: string, w) => <Link to={`/repairs/${w.repairOrderId}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs">{v}</Link> },
    { title: 'Hết hạn', dataIndex: 'endDate', render: (v: string) => formatDate(v) },
    { title: 'Tình trạng', key: 'st', render: (_, w) => <WarrantyStatusBadge valid={w.valid} voided={w.status === 'VOID'} daysRemaining={w.daysRemaining} /> },
    ...(isAdmin
      ? [{
          title: '', key: 'act', align: 'right' as const,
          render: (_: unknown, w: Warranty) => w.status === 'ACTIVE' && (
            <Button size="small" danger onClick={(e) => { e.stopPropagation(); setVoiding(w) }}>Hủy BH</Button>
          ),
        }]
      : []),
  ]

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented<'valid' | 'all'> value={validOnly ? 'valid' : 'all'} onChange={(v) => { setValidOnly(v === 'valid'); setPage(0) }} options={[{ value: 'valid', label: 'Còn hạn' }, { value: 'all', label: 'Tất cả' }]} />
        <Input aria-label="Tìm bảo hành" placeholder="Mã BH, mã phiếu, serial, tên khách..." prefix={<SearchOutlined className="text-text-muted" />} allowClear value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(0) }} className="md:max-w-xs" />
      </div>
      {error && !loading ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Table<Warranty>
          rowKey="id"
          columns={columns}
          dataSource={data?.content}
          loading={loading}
          scroll={{ x: 'max-content' }}
          onRow={(r) => ({ onClick: () => setOpenId(r.id), className: 'cursor-pointer' })}
          locale={{ emptyText: loading ? ' ' : <EmptyState compact title="Không có phiếu bảo hành" description="Bảo hành được tạo tự động khi bàn giao phiếu sửa có thời hạn bảo hành." /> }}
          pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1) }}
        />
      )}
      {openId != null && <WarrantyDetailModal key={openId} warrantyId={openId} viewer="staff" onClose={() => setOpenId(null)} onChanged={reload} />}
      {voiding && <VoidModal key={voiding.id} warranty={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); reload() }} />}
    </>
  )
}

function VoidModal({ warranty, onClose, onDone }: { warranty: Warranty; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async () => {
    if (!reason.trim()) return setErr('Vui lòng nhập lý do hủy')
    setSaving(true)
    try {
      await warrantiesApi.void(warranty.id, reason)
      message.success(`Đã hủy bảo hành ${warranty.code}`)
      onDone()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open title={`Hủy bảo hành ${warranty.code}`} okText="Hủy bảo hành" okButtonProps={{ danger: true, loading: saving }} cancelText="Đóng" onOk={submit} onCancel={onClose}>
      <p className="mt-0 text-text-secondary">Thao tác được ghi nhật ký. Khách sẽ không thể gửi yêu cầu bảo hành cho phiếu này nữa.</p>
      {err && <Alert type="error" showIcon title={err} className="mb-3" role="alert" />}
      <Input.TextArea aria-label="Lý do hủy" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Khách tự ý sửa ngoài, tem bảo hành bị rách" />
    </Modal>
  )
}

type ClaimFilter = 'OPEN' | 'ALL'

function ClaimsTab() {
  const [filter, setFilter] = useState<ClaimFilter>('OPEN')
  const [page, setPage] = useState(0)
  const [accepting, setAccepting] = useState<WarrantyClaim | null>(null)
  const [rejecting, setRejecting] = useState<WarrantyClaim | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const status: ClaimStatus[] | undefined = filter === 'OPEN' ? ['SUBMITTED'] : undefined
  const { data, loading, error, reload } = useAsyncData(() => warrantiesApi.claims({ page, size: 20, status }), [page, filter])

  const columns: TableProps<WarrantyClaim>['columns'] = [
    { title: 'Mã yêu cầu', dataIndex: 'code', render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span> },
    { title: 'Bảo hành', dataIndex: 'warrantyCode', render: (v: string, c) => <a onClick={() => setOpenId(c.warrantyId)} className="font-mono text-xs">{v}</a> },
    { title: 'Khách / thiết bị', key: 'cd', render: (_, c) => <span>{c.customerName}<span className="block text-xs text-text-secondary">{c.deviceName}</span></span> },
    { title: 'Mô tả lỗi', dataIndex: 'issueDescription', render: (v: string) => <span className="line-clamp-2 max-w-xs">{v}</span> },
    { title: 'Trạng thái', dataIndex: 'status', render: (s: ClaimStatus, c) => (
      <span className="flex flex-col gap-0.5">
        <Tag color={CLAIM_STATUS_CONFIG[s].color} className="m-0 w-fit">{CLAIM_STATUS_CONFIG[s].label}</Tag>
        {c.repairOrderCode && <Link to={`/repairs/${c.repairOrderId}`} className="font-mono text-xs">{c.repairOrderCode}</Link>}
      </span>
    ) },
    { title: 'Gửi lúc', dataIndex: 'createdAt', responsive: ['md'], render: (v: string) => formatDateTime(v) },
    { title: '', key: 'act', align: 'right', render: (_, c) => c.status === 'SUBMITTED' && (
      <Space>
        <Button size="small" type="primary" onClick={() => setAccepting(c)}>Tiếp nhận</Button>
        <Button size="small" danger onClick={() => setRejecting(c)}>Từ chối</Button>
      </Space>
    ) },
  ]

  return (
    <>
      <Segmented<ClaimFilter> className="mb-3" value={filter} onChange={(v) => { setFilter(v); setPage(0) }} options={[{ value: 'OPEN', label: 'Chờ xử lý' }, { value: 'ALL', label: 'Tất cả' }]} />
      {error && !loading ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Table<WarrantyClaim>
          rowKey="id"
          columns={columns}
          dataSource={data?.content}
          loading={loading}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: loading ? ' ' : <EmptyState compact title={filter === 'OPEN' ? 'Không có yêu cầu bảo hành nào đang chờ' : 'Chưa có yêu cầu bảo hành'} /> }}
          pagination={{ current: page + 1, pageSize: 20, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1) }}
        />
      )}
      {accepting && <AcceptClaimModal key={accepting.id} claim={accepting} onClose={() => setAccepting(null)} onDone={() => { setAccepting(null); reload() }} />}
      {rejecting && <RejectClaimModal key={rejecting.id} claim={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); reload() }} />}
      {openId != null && <WarrantyDetailModal key={openId} warrantyId={openId} viewer="staff" onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  )
}

const PRIORITY_OPTIONS = (Object.keys(REPAIR_PRIORITY_CONFIG) as RepairPriority[]).map((value) => ({ value, label: REPAIR_PRIORITY_CONFIG[value].label }))

function AcceptClaimModal({ claim, onClose, onDone }: { claim: WarrantyClaim; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp()
  const [technicianId, setTechnicianId] = useState<number>()
  const [priority, setPriority] = useState<RepairPriority>('HIGH')
  const [deviceCondition, setDeviceCondition] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async () => {
    setSaving(true)
    setErr(null)
    try {
      const res = await warrantiesApi.accept(claim.id, { technicianId, priority, deviceCondition: deviceCondition || undefined, note: note || undefined })
      message.success(`Đã tạo phiếu bảo hành ${res.repairOrderCode ?? ''}`)
      onDone()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open title={`Tiếp nhận yêu cầu ${claim.code}`} okText="Tạo phiếu sửa bảo hành" okButtonProps={{ loading: saving }} cancelText="Đóng" onOk={submit} onCancel={onClose}>
      <p className="mt-0 text-text-secondary">Hệ thống mở phiếu sửa chữa mới đánh dấu <strong>bảo hành</strong> cho {claim.deviceName}; khách nhận thông báo khi phiếu đổi trạng thái.</p>
      {err && <Alert type="error" showIcon title={err} className="mb-3" role="alert" />}
      <Form layout="vertical" component="div">
        <Form.Item label="Kỹ thuật viên" htmlFor="claim-tech" extra="Có thể phân công sau">
          <TechnicianSelect id="claim-tech" value={technicianId} onChange={setTechnicianId} />
        </Form.Item>
        <Form.Item label="Mức ưu tiên" htmlFor="claim-priority">
          <Select<RepairPriority> id="claim-priority" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
        </Form.Item>
        <Form.Item label="Tình trạng máy khi nhận lại" htmlFor="claim-cond">
          <Input.TextArea id="claim-cond" rows={2} value={deviceCondition} onChange={(e) => setDeviceCondition(e.target.value)} maxLength={2000} />
        </Form.Item>
        <Form.Item label="Ghi chú" htmlFor="claim-note" className="mb-0">
          <Input.TextArea id="claim-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function RejectClaimModal({ claim, onClose, onDone }: { claim: WarrantyClaim; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async () => {
    if (!reason.trim()) return setErr('Vui lòng nhập lý do từ chối')
    setSaving(true)
    try {
      await warrantiesApi.reject(claim.id, reason)
      message.success(`Đã từ chối yêu cầu ${claim.code}`)
      onDone()
    } catch (e) {
      setErr(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open title={`Từ chối yêu cầu ${claim.code}`} okText="Từ chối" okButtonProps={{ danger: true, loading: saving }} cancelText="Đóng" onOk={submit} onCancel={onClose}>
      <p className="mt-0 text-text-secondary">Lý do được lưu vào lịch sử bảo hành và khách xem được trong mục Bảo hành của tôi.</p>
      {err && <Alert type="error" showIcon title={err} className="mb-3" role="alert" />}
      <Input.TextArea aria-label="Lý do từ chối" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Lỗi do rơi vỡ, không thuộc phạm vi bảo hành" />
    </Modal>
  )
}
