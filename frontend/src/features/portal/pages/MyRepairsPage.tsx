import { PlusOutlined, SendOutlined } from '@ant-design/icons'
import { Alert, App, Button, Card, DatePicker, Form, Input, List, Modal, Select, Skeleton, Tabs } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { StatusTag } from '@/components/StatusTag'
import { devicesApi } from '@/features/devices/devicesApi'
import { RepairProgress } from '@/features/repairs/components/RepairProgress'
import { RepairStatusTag } from '@/features/repairs/components/RepairStatusTag'
import { REQUEST_STATUS_CONFIG } from '@/features/repairs/constants/status'
import { repairRequestsApi, repairsApi } from '@/features/repairs/repairsApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'

function NewRequestModal({ initialDeviceId, onClose, onCreated }: { initialDeviceId?: number; onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const devices = useAsyncData(() => devicesApi.mine(), [])
  const [deviceId, setDeviceId] = useState(initialDeviceId)
  const [issue, setIssue] = useState('')
  const [date, setDate] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open
      title="Gửi yêu cầu sửa chữa"
      okText="Gửi yêu cầu"
      okButtonProps={{ icon: <SendOutlined /> }}
      cancelText="Hủy"
      confirmLoading={saving}
      onCancel={onClose}
      onOk={async () => {
        if (!deviceId) return setError('Vui lòng chọn thiết bị')
        if (!issue.trim()) return setError('Vui lòng mô tả lỗi')
        setSaving(true)
        try {
          const r = await repairRequestsApi.createMine({ deviceId, issueDescription: issue, expectedDropOffDate: date })
          message.success(`Đã gửi yêu cầu ${r.code}. Cửa hàng sẽ tiếp nhận khi bạn mang máy tới.`)
          onCreated()
        } catch (e) {
          setError(getErrorMessage(e))
        } finally {
          setSaving(false)
        }
      }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}
      {devices.loading ? (
        <Skeleton active />
      ) : !devices.data?.length ? (
        <EmptyState compact title="Bạn chưa có thiết bị" action={<Button onClick={() => navigate('/my/devices')}>Thêm thiết bị</Button>} />
      ) : (
        <Form layout="vertical" component="div">
          <Form.Item label="Thiết bị" required htmlFor="dev">
            <Select id="dev" value={deviceId} onChange={setDeviceId} placeholder="Chọn thiết bị" options={devices.data.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item label="Mô tả lỗi" required htmlFor="issue">
            <Input.TextArea id="issue" rows={4} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="VD: Máy không lên nguồn sau khi rơi" maxLength={2000} showCount />
          </Form.Item>
          <Form.Item label="Ngày dự kiến mang máy tới" htmlFor="date">
            <DatePicker id="date" className="w-full" format="DD/MM/YYYY" disabledDate={(d) => d.isBefore(dayjs(), 'day')} onChange={(d) => setDate(d ? d.format('YYYY-MM-DD') : undefined)} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

/** Cổng khách hàng: phiếu sửa chữa (theo dõi tiến độ) + yêu cầu đã gửi. */
export function MyRepairsPage() {
  const requestDeviceId = (useLocation().state as { requestDeviceId?: number } | null)?.requestDeviceId
  const [creating, setCreating] = useState(Boolean(requestDeviceId))
  const orders = useAsyncData(() => repairsApi.mine({ size: 50 }), [])
  const requests = useAsyncData(() => repairRequestsApi.mine({ size: 50 }), [])
  const { modal, message } = App.useApp()

  const cancelRequest = (id: number, code: string) =>
    modal.confirm({
      title: `Hủy yêu cầu ${code}?`,
      okText: 'Hủy yêu cầu',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          await repairRequestsApi.cancelMine(id)
          requests.reload()
        } catch (e) {
          message.error(getErrorMessage(e))
        }
      },
    })

  return (
    <>
      <PageHeader
        title="Sửa chữa của tôi"
        description="Theo dõi tiến độ sửa chữa và các yêu cầu đã gửi."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>Gửi yêu cầu sửa chữa</Button>}
      />
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          items={[
            {
              key: 'orders',
              label: 'Phiếu sửa chữa',
              children: orders.error ? (
                <ErrorState error={orders.error} onRetry={orders.reload} />
              ) : (
                <List
                  loading={orders.loading}
                  dataSource={orders.data?.content}
                  locale={{ emptyText: <EmptyState compact title="Chưa có phiếu sửa chữa" description="Phiếu được tạo khi cửa hàng tiếp nhận máy của bạn." /> }}
                  renderItem={(o) => (
                    <List.Item>
                      <Link to={`/my/repairs/${o.id}`} className="block w-full rounded-lg p-2 text-inherit no-underline hover:bg-tone-neutral-bg">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <span>
                            <span className="font-mono text-sm font-semibold text-primary">{o.code}</span>
                            <span className="ml-2 font-medium text-text">{o.deviceName}</span>
                          </span>
                          <RepairStatusTag status={o.status} />
                        </div>
                        <RepairProgress status={o.status} size="small" />
                        <div className="mt-2 text-xs text-text-muted">
                          Tiếp nhận {formatDateTime(o.receivedAt)}{o.expectedReturnDate && ` · Hẹn trả ${formatDate(o.expectedReturnDate)}`}
                        </div>
                      </Link>
                    </List.Item>
                  )}
                />
              ),
            },
            {
              key: 'requests',
              label: 'Yêu cầu đã gửi',
              children: requests.error ? (
                <ErrorState error={requests.error} onRetry={requests.reload} />
              ) : (
                <List
                  loading={requests.loading}
                  dataSource={requests.data?.content}
                  locale={{ emptyText: <EmptyState compact title="Chưa gửi yêu cầu nào" /> }}
                  renderItem={(r) => (
                    <List.Item
                      actions={
                        r.status === 'PENDING'
                          ? [<Button key="c" size="small" danger onClick={() => cancelRequest(r.id, r.code)}>Hủy</Button>]
                          : r.repairOrderId
                            ? [<Link key="o" to={`/my/repairs/${r.repairOrderId}`}>Xem phiếu {r.repairOrderCode}</Link>]
                            : []
                      }
                    >
                      <List.Item.Meta
                        title={
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm">{r.code}</span> {r.device.name}
                            <StatusTag value={r.status} config={REQUEST_STATUS_CONFIG} />
                          </span>
                        }
                        description={
                          <>
                            <div>{r.issueDescription}</div>
                            {r.rejectReason && <div className="text-error">Lý do từ chối: {r.rejectReason}</div>}
                            <div className="text-xs text-text-muted">Gửi lúc {formatDateTime(r.createdAt)}</div>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              ),
            },
          ]}
        />
      </Card>
      {creating && (
        <NewRequestModal
          initialDeviceId={requestDeviceId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            requests.reload()
          }}
        />
      )}
    </>
  )
}
