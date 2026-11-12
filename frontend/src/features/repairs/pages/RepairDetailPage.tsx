import { CarryOutOutlined, EditOutlined, SafetyCertificateOutlined, UserSwitchOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, DatePicker, Descriptions, Form, Input, Modal, Select, Skeleton, Space, Tabs, Tag } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { ErrorState } from '@/components/ErrorState'
import { DeviceArt, InitialAvatar } from '@/components/DeviceArt'
import { PageHeader } from '@/components/PageHeader'
import { DEVICE_TYPE_LABELS } from '@/features/devices/devicesApi'
import { TechnicianSelect } from '@/features/users/components/TechnicianSelect'
import { useAsyncData } from '@/hooks/useAsyncData'
import type { RepairPriority } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import { RepairProgress } from '../components/RepairProgress'
import { RepairPriorityTag, RepairStatusTag } from '../components/RepairStatusTag'
import { RepairTimeline } from '../components/RepairTimeline'
import { TransitionActions } from '../components/TransitionActions'
import { DeliverModal } from '../components/DeliverModal'
import { QuotationsTab } from '@/features/quotations/components/QuotationsTab'
import { PartsUsageTab } from '@/features/inventory/components/PartsUsageTab'
import { MoneyText } from '@/components/MoneyText'
import { PAYMENT_METHOD_LABELS } from '../constants/status'
import { REPAIR_PRIORITY_CONFIG } from '../constants/status'
import { repairsApi, type RepairOrderDetail } from '../repairsApi'

/** Gợi ý bước tiếp theo – giúp người dùng biết phiếu đang chờ ai. */
function nextStepHint(o: RepairOrderDetail): string | null {
  switch (o.status) {
    case 'RECEIVED':
      return o.technician ? `Chờ ${o.technician.fullName} bắt đầu kiểm tra.` : 'Phiếu chưa được phân công kỹ thuật viên.'
    case 'INSPECTING':
      return 'Sau khi KTV chẩn đoán, nhân viên lập báo giá ở tab "Báo giá" và gửi cho khách.'
    case 'WAITING_CONFIRMATION':
      return 'Đang chờ khách xác nhận báo giá (khách bấm trên web, hoặc nhân viên xác nhận thay khi khách gọi điện).'
    case 'APPROVED':
      return 'Khách đã đồng ý – KTV xuất linh kiện ở tab "Linh kiện" và bắt đầu sửa.'
    case 'REJECTED':
      return 'Khách từ chối báo giá – lập báo giá mới hoặc bàn giao trả máy không sửa.'
    case 'COMPLETED':
      return 'Đã sửa xong – nhân viên bàn giao máy và thu tiền.'
    default:
      return null
  }
}

function DiagnosisCard({ order, onSaved }: { order: RepairOrderDetail; onSaved: (o: RepairOrderDetail) => void }) {
  const { message } = App.useApp()
  const [diagnosis, setDiagnosis] = useState(order.diagnosis ?? '')
  const [solution, setSolution] = useState(order.solution ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = diagnosis !== (order.diagnosis ?? '') || solution !== (order.solution ?? '')

  if (!order.canDiagnose) {
    return (
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Chẩn đoán">{order.diagnosis ?? <span className="text-text-muted">Chưa có</span>}</Descriptions.Item>
        <Descriptions.Item label="Phương án khắc phục">{order.solution ?? <span className="text-text-muted">Chưa có</span>}</Descriptions.Item>
      </Descriptions>
    )
  }
  return (
    <Form layout="vertical" component="div">
      <Form.Item label="Chẩn đoán của kỹ thuật viên" htmlFor="diagnosis">
        <Input.TextArea id="diagnosis" rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Nguyên nhân hỏng hóc" maxLength={4000} />
      </Form.Item>
      <Form.Item label="Phương án khắc phục" htmlFor="solution" extra="Bắt buộc trước khi hoàn thành sửa chữa">
        <Input.TextArea id="solution" rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Đã/sẽ làm gì để khắc phục" maxLength={4000} />
      </Form.Item>
      <Button
        type="primary"
        disabled={!dirty}
        loading={saving}
        onClick={async () => {
          setSaving(true)
          try {
            onSaved(await repairsApi.diagnosis(order.id, { diagnosis, solution }))
            message.success('Đã lưu chẩn đoán')
          } catch (e) {
            message.error(getErrorMessage(e))
          } finally {
            setSaving(false)
          }
        }}
      >
        Lưu chẩn đoán
      </Button>
    </Form>
  )
}

function EditReceptionModal({ order, onClose, onSaved }: { order: RepairOrderDetail; onClose: () => void; onSaved: (o: RepairOrderDetail) => void }) {
  const [values, setValues] = useState({
    reportedIssue: order.reportedIssue,
    deviceCondition: order.deviceCondition ?? '',
    accessories: order.accessories ?? '',
    priority: order.priority,
    expectedReturnDate: order.expectedReturnDate ?? undefined,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  return (
    <Modal
      open
      title={`Sửa thông tin tiếp nhận – ${order.code}`}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={saving}
      onCancel={onClose}
      onOk={async () => {
        if (!values.reportedIssue.trim()) return setError('Vui lòng mô tả lỗi khách báo')
        setSaving(true)
        try {
          onSaved(await repairsApi.update(order.id, { ...values, deviceCondition: values.deviceCondition || undefined, accessories: values.accessories || undefined, version: order.version }))
        } catch (e) {
          setError(getErrorMessage(e))
        } finally {
          setSaving(false)
        }
      }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        <Form.Item label="Lỗi khách báo" required htmlFor="ri">
          <Input.TextArea id="ri" rows={3} value={values.reportedIssue} onChange={(e) => setValues({ ...values, reportedIssue: e.target.value })} />
        </Form.Item>
        <Form.Item label="Tình trạng khi nhận" htmlFor="dc">
          <Input.TextArea id="dc" rows={2} value={values.deviceCondition} onChange={(e) => setValues({ ...values, deviceCondition: e.target.value })} />
        </Form.Item>
        <Form.Item label="Phụ kiện" htmlFor="ac">
          <Input id="ac" value={values.accessories} onChange={(e) => setValues({ ...values, accessories: e.target.value })} />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item label="Độ ưu tiên" htmlFor="pr">
            <Select
              id="pr"
              value={values.priority}
              onChange={(p) => setValues({ ...values, priority: p })}
              options={(Object.keys(REPAIR_PRIORITY_CONFIG) as RepairPriority[]).map((p) => ({ value: p, label: REPAIR_PRIORITY_CONFIG[p].label }))}
            />
          </Form.Item>
          <Form.Item label="Hẹn trả" htmlFor="rd">
            <DatePicker
              id="rd"
              className="w-full"
              format="DD/MM/YYYY"
              value={values.expectedReturnDate ? dayjs(values.expectedReturnDate) : null}
              onChange={(d) => setValues({ ...values, expectedReturnDate: d ? d.format('YYYY-MM-DD') : undefined })}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  )
}

function AssignModal({ order, onClose, onSaved }: { order: RepairOrderDetail; onClose: () => void; onSaved: (o: RepairOrderDetail) => void }) {
  const { message } = App.useApp()
  const [technicianId, setTechnicianId] = useState(order.technician?.id)
  const [saving, setSaving] = useState(false)
  return (
    <Modal
      open
      title={order.technician ? 'Đổi kỹ thuật viên' : 'Phân công kỹ thuật viên'}
      okText="Phân công"
      cancelText="Hủy"
      okButtonProps={{ disabled: !technicianId || technicianId === order.technician?.id }}
      confirmLoading={saving}
      onCancel={onClose}
      onOk={async () => {
        setSaving(true)
        try {
          onSaved(await repairsApi.assign(order.id, technicianId!))
          message.success('Đã phân công kỹ thuật viên')
        } catch (e) {
          message.error(getErrorMessage(e))
        } finally {
          setSaving(false)
        }
      }}
    >
      <TechnicianSelect value={technicianId} onChange={setTechnicianId} allowClear={false} />
    </Modal>
  )
}

/** Chi tiết phiếu – dùng cho mọi vai trò; Backend quyết định quyền qua các cờ can* và allowedTransitions. */
export function RepairDetailPage() {
  const id = Number(useParams().id)
  const role = useAppSelector((s) => s.auth.user!.role)
  const isCustomer = role === 'CUSTOMER'
  const [order, setOrder] = useState<RepairOrderDetail>()
  const [modal, setModal] = useState<'edit' | 'assign' | 'deliver' | null>(null)
  const loaded = useAsyncData(() => repairsApi.get(id).then((o) => (setOrder(o), o)), [id])

  if (loaded.error) return <ErrorState error={loaded.error} onRetry={loaded.reload} />
  if (!order) return <Skeleton active paragraph={{ rows: 10 }} />

  const updated = (o: RepairOrderDetail) => {
    setOrder(o)
    setModal(null)
  }
  const hint = !isCustomer ? nextStepHint(order) : null

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{order.code}</span>
            <RepairStatusTag status={order.status} size="md" />
            {!isCustomer && <RepairPriorityTag priority={order.priority} size="md" />}
            {order.warrantyRepair && (
              <Tag color="cyan" icon={<SafetyCertificateOutlined />} className="m-0 px-2.5 py-0.5 text-sm font-medium">
                Sửa bảo hành
              </Tag>
            )}
          </span>
        }
        description={`${order.device.name} · Tiếp nhận ${formatDateTime(order.receivedAt)}`}
        extra={
          <Space wrap>
            <TransitionActions order={order} asCustomer={isCustomer} onChanged={setOrder} />
            {order.canDeliver && (
              <Button type="primary" icon={<CarryOutOutlined />} onClick={() => setModal('deliver')}>
                {order.status === 'COMPLETED' ? 'Bàn giao & thu tiền' : 'Trả máy cho khách'}
              </Button>
            )}
          </Space>
        }
      />

      <Card className="mb-4">
        <RepairProgress status={order.status} />
        {hint && <Alert type="info" showIcon title={hint} className="mt-5" />}
        {order.status === 'CANCELLED' && <Alert type="error" showIcon title={`Phiếu đã hủy: ${order.cancelReason}`} className="mt-5" />}
        {order.status === 'DELIVERED' && (
          <Alert
            type="success"
            showIcon
            className="mt-5"
            title={
              <span>
                Đã bàn giao {formatDateTime(order.deliveredAt)} · Thu <MoneyText value={order.finalAmount} className="font-semibold" />
                {order.paymentMethod && ` (${PAYMENT_METHOD_LABELS[order.paymentMethod]})`}
                {order.warrantyCode && ` · Bảo hành ${order.warrantyCode}`}
              </span>
            }
          />
        )}
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card styles={{ body: { paddingTop: 8 } }}>
          <Tabs
            items={[
              {
                key: 'overview',
                label: 'Tổng quan',
                children: (
                  <div className="flex flex-col gap-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="m-0 text-base font-semibold">Thông tin tiếp nhận</h2>
                        {order.canEditReception && <Button size="small" icon={<EditOutlined />} onClick={() => setModal('edit')}>Sửa</Button>}
                      </div>
                      <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="Lỗi khách báo">{order.reportedIssue}</Descriptions.Item>
                        <Descriptions.Item label="Tình trạng khi nhận">{order.deviceCondition ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Phụ kiện kèm theo">{order.accessories ?? 'Không'}</Descriptions.Item>
                        <Descriptions.Item label="Hẹn trả">{formatDate(order.expectedReturnDate)}</Descriptions.Item>
                      </Descriptions>
                    </div>
                    <div>
                      <h2 className="mt-0 mb-2 text-base font-semibold">Chẩn đoán & khắc phục</h2>
                      <DiagnosisCard key={order.version} order={order} onSaved={setOrder} />
                    </div>
                  </div>
                ),
              },
              {
                key: 'quotations',
                label: 'Báo giá',
                children: (
                  <QuotationsTab
                    order={order}
                    viewer={isCustomer ? 'customer' : role === 'TECHNICIAN' ? 'readonly' : 'staff'}
                    onOrderChanged={() => repairsApi.get(order.id).then(setOrder)}
                  />
                ),
              },
              ...(!isCustomer ? [{ key: 'parts', label: 'Linh kiện', children: <PartsUsageTab key={order.version} order={order} /> }] : []),
              { key: 'history', label: 'Lịch sử', children: <RepairTimeline repairId={order.id} reloadKey={order.version} showActor={!isCustomer} /> },
            ]}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Khách hàng" size="small">
            <div className="flex items-start gap-3">
              <InitialAvatar name={order.customer.fullName} size={44} />
              <div className="min-w-0">
                <div className="font-medium">
                  {isCustomer ? order.customer.fullName : <Link to={`/customers/${order.customer.id}`}>{order.customer.fullName}</Link>}
                </div>
                <div className="text-sm text-text-secondary tabular-nums">{order.customer.phone}</div>
                {order.customer.email && <div className="truncate text-sm text-text-secondary">{order.customer.email}</div>}
              </div>
            </div>
          </Card>
          <Card title="Thiết bị" size="small">
            <div className="flex items-start gap-3">
              <DeviceArt type={order.device.deviceType} size={56} />
              <div className="min-w-0">
                <div className="font-medium">{order.device.name}</div>
                <div className="text-sm text-text-secondary">
                  {DEVICE_TYPE_LABELS[order.device.deviceType]} · {[order.device.brand, order.device.model].filter(Boolean).join(' ') || '—'}
                </div>
                {order.device.serialNumber && <div className="font-mono text-xs text-text-muted">{order.device.serialNumber}</div>}
              </div>
            </div>
          </Card>
          <Card
            title="Kỹ thuật viên"
            size="small"
            extra={order.canAssign && <Button size="small" type="link" icon={<UserSwitchOutlined />} onClick={() => setModal('assign')}>{order.technician ? 'Đổi' : 'Phân công'}</Button>}
          >
            {order.technician ? <span className="font-medium">{order.technician.fullName}</span> : <span className="text-warning">Chưa phân công</span>}
            {!isCustomer && <div className="mt-1 text-xs text-text-muted">Tiếp nhận bởi {order.createdBy.fullName}</div>}
          </Card>
        </div>
      </div>

      {modal === 'edit' && <EditReceptionModal order={order} onClose={() => setModal(null)} onSaved={updated} />}
      {modal === 'assign' && <AssignModal order={order} onClose={() => setModal(null)} onSaved={updated} />}
      {modal === 'deliver' && <DeliverModal order={order} onClose={() => setModal(null)} onDelivered={updated} />}
    </>
  )
}
