import { DeleteOutlined, EditOutlined, InboxOutlined, KeyOutlined, LaptopOutlined, PlusOutlined, ToolOutlined, WalletOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Card, Descriptions, Form, Input, Modal, Skeleton, Space, Table, Tabs } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FormField } from '@/components/form/FormField'
import { MoneyText } from '@/components/MoneyText'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { emailSchema, passwordSchema } from '@/features/auth/schemas'
import { DeviceFormModal } from '@/features/devices/components/DeviceFormModal'
import { DEVICE_TYPE_LABELS, type DeviceResponse } from '@/features/devices/devicesApi'
import { RepairStatusTag } from '@/features/repairs/components/RepairStatusTag'
import type { RepairOrderSummary } from '@/features/repairs/repairsApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getErrorMessage } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import { CustomerFormModal } from '../components/CustomerFormModal'
import { customersApi, type CustomerDetailResponse } from '../customersApi'

const accountSchema = z.object({ email: emailSchema, password: passwordSchema })

/** Kích hoạt tài khoản cổng khách hàng (nhân viên tạo tại quầy sau khi xác minh khách). */
function ActivateAccountModal({ customer, onClose, onDone }: { customer: CustomerDetailResponse; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: customer.email ?? '', password: '' },
  })
  const onSubmit = handleSubmit(async (values) => {
    try {
      await customersApi.activateAccount(customer.id, values)
      message.success('Đã tạo tài khoản cho khách hàng')
      onDone()
    } catch (e) {
      setFormError(getErrorMessage(e))
    }
  })
  return (
    <Modal open title="Tạo tài khoản cổng khách hàng" okText="Tạo tài khoản" cancelText="Hủy" onOk={onSubmit} onCancel={onClose} confirmLoading={formState.isSubmitting}>
      <p className="text-text-secondary">Khách dùng tài khoản này để theo dõi sửa chữa, xác nhận báo giá. Hướng dẫn khách đổi mật khẩu sau lần đăng nhập đầu.</p>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        <FormField control={control} name="email" label="Email đăng nhập" required render={(f) => <Input {...f} type="email" />} />
        <FormField control={control} name="password" label="Mật khẩu ban đầu" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
      </Form>
    </Modal>
  )
}

function RepairHistoryTab({ customerId }: { customerId: number }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { data, loading, error, reload } = useAsyncData(() => customersApi.repairOrders(customerId, { page, size: 10 }), [customerId, page])
  if (error) return <ErrorState error={error} onRetry={reload} />
  return (
    <Table<RepairOrderSummary>
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={data?.content}
      scroll={{ x: 'max-content' }}
      onRow={(r) => ({ onClick: () => navigate(`/repairs/${r.id}`), className: 'cursor-pointer' })}
      locale={{ emptyText: loading ? ' ' : <EmptyState compact title="Chưa có phiếu sửa chữa" /> }}
      pagination={{ current: page + 1, pageSize: 10, total: data?.totalElements ?? 0, onChange: (p) => setPage(p - 1) }}
      columns={[
        { title: 'Mã phiếu', dataIndex: 'code', render: (v: string) => <span className="font-mono text-xs">{v}</span> },
        { title: 'Thiết bị', dataIndex: 'deviceName' },
        { title: 'Trạng thái', dataIndex: 'status', render: (s) => <RepairStatusTag status={s} /> },
        { title: 'Tiếp nhận', dataIndex: 'receivedAt', render: formatDateTime },
      ]}
    />
  )
}

function DevicesTab({ customerId, onChanged }: { customerId: number; onChanged: () => void }) {
  const [editing, setEditing] = useState<DeviceResponse | 'new' | null>(null)
  const { data, loading, error, reload } = useAsyncData(() => customersApi.devices(customerId), [customerId])
  if (error) return <ErrorState error={error} onRetry={reload} />
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button icon={<PlusOutlined />} onClick={() => setEditing('new')}>Thêm thiết bị</Button>
      </div>
      <Table<DeviceResponse>
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={data}
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: loading ? ' ' : <EmptyState compact title="Khách chưa có thiết bị" /> }}
        columns={[
          { title: 'Thiết bị', dataIndex: 'name', render: (_, d) => <span className="font-medium">{d.name}</span> },
          { title: 'Loại', dataIndex: 'deviceType', render: (t: DeviceResponse['deviceType']) => DEVICE_TYPE_LABELS[t] },
          { title: 'Hãng / Model', render: (_, d) => [d.brand, d.model].filter(Boolean).join(' ') || '—' },
          { title: 'Serial / IMEI', dataIndex: 'serialNumber', render: (v: string | null) => (v ? <span className="font-mono text-xs">{v}</span> : '—') },
          {
            title: <span className="sr-only">Thao tác</span>,
            align: 'right',
            render: (_, d) => <Button type="text" icon={<EditOutlined />} aria-label={`Sửa ${d.name}`} onClick={() => setEditing(d)} />,
          },
        ]}
      />
      {editing && (
        <DeviceFormModal
          key={editing === 'new' ? 'new' : editing.id}
          mode="staff"
          device={editing === 'new' ? undefined : editing}
          fixedCustomerId={customerId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
            onChanged()
          }}
        />
      )}
    </>
  )
}

export function CustomerDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { modal, message } = App.useApp()
  const [editing, setEditing] = useState(false)
  const [activating, setActivating] = useState(false)
  const { data: customer, loading, error, reload } = useAsyncData(() => customersApi.get(id), [id])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!customer) return <Skeleton active paragraph={{ rows: 8 }} />

  const remove = () =>
    modal.confirm({
      title: `Xóa khách hàng ${customer.code}?`,
      content: 'Chỉ xóa được khách chưa có phiếu sửa chữa. Thiết bị của khách sẽ bị xóa theo. Không thể hoàn tác.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await customersApi.remove(id)
          message.success('Đã xóa khách hàng')
          navigate('/customers', { replace: true })
        } catch (e) {
          message.error(getErrorMessage(e))
        }
      },
    })

  return (
    <>
      <PageHeader
        title={customer.fullName}
        description={`${customer.code} · Khách hàng từ ${formatDate(customer.createdAt)}`}
        extra={
          <Space wrap>
            <Button type="primary" icon={<InboxOutlined />} onClick={() => navigate(`/reception?customerId=${id}`)}>Tiếp nhận thiết bị</Button>
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>Sửa</Button>
            {!customer.hasAccount && <Button icon={<KeyOutlined />} onClick={() => setActivating(true)}>Tạo tài khoản</Button>}
            <Button danger icon={<DeleteOutlined />} aria-label="Xóa khách hàng" onClick={remove} disabled={loading} />
          </Space>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Thiết bị" value={customer.deviceCount} icon={<LaptopOutlined />} tone="info" />
        <StatCard label="Phiếu sửa chữa" value={customer.repairOrderCount} icon={<ToolOutlined />} tone="primary" />
        <StatCard label="Tổng chi tiêu" value={<MoneyText value={customer.totalSpent} />} icon={<WalletOutlined />} tone="success" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card title="Thông tin liên hệ">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Số điện thoại"><span className="tabular-nums">{customer.phone}</span></Descriptions.Item>
            <Descriptions.Item label="Email">{customer.email ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{customer.address ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Tài khoản">{customer.hasAccount ? 'Đã có tài khoản cổng khách hàng' : 'Chưa có'}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{customer.note ?? '—'}</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card styles={{ body: { paddingTop: 8 } }}>
          <Tabs
            items={[
              { key: 'repairs', label: 'Lịch sử sửa chữa', children: <RepairHistoryTab customerId={id} /> },
              { key: 'devices', label: `Thiết bị (${customer.deviceCount})`, children: <DevicesTab customerId={id} onChanged={reload} /> },
            ]}
          />
        </Card>
      </div>

      {editing && (
        <CustomerFormModal
          customer={customer}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            reload()
          }}
        />
      )}
      {activating && (
        <ActivateAccountModal
          customer={customer}
          onClose={() => setActivating(false)}
          onDone={() => {
            setActivating(false)
            reload()
          }}
        />
      )}
    </>
  )
}
