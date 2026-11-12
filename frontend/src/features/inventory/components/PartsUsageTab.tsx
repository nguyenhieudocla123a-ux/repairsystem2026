import { ExportOutlined, RollbackOutlined } from '@ant-design/icons'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Select, Table } from 'antd'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import type { RepairOrderDetail } from '@/features/repairs/repairsApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getErrorCode, getErrorMessage } from '@/utils/errors'
import { inventoryApi, type PartUsage } from '../inventoryApi'

function MovementModal({ order, mode, usage, onClose, onDone }: {
  order: RepairOrderDetail
  mode: 'export' | 'return'
  usage?: PartUsage
  onClose: () => void
  onDone: (usage: PartUsage[]) => void
}) {
  const options = useAsyncData(() => (mode === 'export' ? inventoryApi.options() : Promise.resolve([])), [mode])
  const [partId, setPartId] = useState<number | undefined>(usage?.partId)
  const [quantity, setQuantity] = useState<number | null>(1)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const selected = options.data?.find((p) => p.id === partId)
  const max = mode === 'return' ? usage?.quantityUsed : selected?.quantityOnHand

  const submit = async () => {
    if (!partId || !quantity) return setError('Vui lòng chọn linh kiện và số lượng')
    setSaving(true)
    setError(null)
    try {
      const body = { partId, quantity, note: note || undefined }
      onDone(mode === 'export' ? await inventoryApi.exportToOrder(order.id, body) : await inventoryApi.returnFromOrder(order.id, body))
    } catch (e) {
      // Kho có thể vừa bị người khác xuất hết → thông điệp rõ ràng để KTV biết cần chờ nhập hàng
      setError(getErrorCode(e) === 'INSUFFICIENT_STOCK' ? `${getErrorMessage(e)}. Có thể chuyển phiếu sang "Chờ linh kiện".` : getErrorMessage(e))
      options.reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={mode === 'export' ? 'Xuất linh kiện cho phiếu' : `Hoàn kho – ${usage?.partName}`} okText={mode === 'export' ? 'Xuất kho' : 'Hoàn kho'} cancelText="Hủy" onOk={submit} onCancel={onClose} confirmLoading={saving}>
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        {mode === 'export' && (
          <Form.Item label="Linh kiện" required htmlFor="part">
            <Select<number>
              id="part"
              placeholder="Tìm theo tên hoặc SKU"
              loading={options.loading}
              value={partId}
              onChange={setPartId}
              showSearch={{ optionFilterProp: 'search' }}
              options={(options.data ?? []).map((p) => ({
                value: p.id,
                search: `${p.sku} ${p.name}`,
                disabled: p.quantityOnHand === 0,
                label: (
                  <span className="flex justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className={`shrink-0 text-xs ${p.quantityOnHand ? 'text-text-muted' : 'text-error'}`}>
                      {p.quantityOnHand ? `còn ${p.quantityOnHand} ${p.unit}` : 'hết hàng'}
                    </span>
                  </span>
                ),
              }))}
            />
          </Form.Item>
        )}
        <Form.Item label="Số lượng" required htmlFor="qty" extra={max !== undefined ? `Tối đa ${max}` : undefined}>
          <InputNumber id="qty" min={1} max={max || undefined} value={quantity} onChange={setQuantity} className="!w-full" />
        </Form.Item>
        <Form.Item label="Ghi chú" htmlFor="note">
          <Input.TextArea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/** Linh kiện đã dùng cho phiếu (Σ xuất − Σ hoàn). KTV được giao / ADMIN xuất & hoàn khi phiếu đang sửa. */
export function PartsUsageTab({ order }: { order: RepairOrderDetail }) {
  const { message } = App.useApp()
  const [dialog, setDialog] = useState<{ mode: 'export' | 'return'; usage?: PartUsage } | null>(null)
  const { data, loading, error, reload } = useAsyncData(() => inventoryApi.usage(order.id), [order.id])

  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="flex flex-col gap-3">
      {order.canUseParts && (
        <div className="flex justify-end">
          <Button type="primary" icon={<ExportOutlined />} onClick={() => setDialog({ mode: 'export' })}>Xuất linh kiện</Button>
        </div>
      )}
      <Table<PartUsage>
        rowKey="partId"
        size="middle"
        loading={loading}
        dataSource={data}
        pagination={false}
        locale={{
          emptyText: loading ? ' ' : (
            <EmptyState compact title="Chưa dùng linh kiện nào" description={order.canUseParts ? undefined : 'Xuất linh kiện được khi khách đã duyệt báo giá và phiếu đang sửa.'} />
          ),
        }}
        columns={[
          { title: 'Linh kiện', render: (_, u) => <span><span className="font-mono text-xs">{u.partSku}</span> {u.partName}</span> },
          { title: 'Đang dùng', dataIndex: 'quantityUsed', align: 'right', render: (v: number, u) => <span className="tabular-nums">{v} {u.unit}</span> },
          ...(order.canUseParts
            ? [{
                title: <span className="sr-only">Thao tác</span>,
                key: 'a',
                align: 'right' as const,
                render: (_: unknown, u: PartUsage) => (
                  <Button size="small" icon={<RollbackOutlined />} onClick={() => setDialog({ mode: 'return', usage: u })}>Hoàn kho</Button>
                ),
              }]
            : []),
        ]}
      />
      {dialog && (
        <MovementModal
          key={`${dialog.mode}-${dialog.usage?.partId ?? 'new'}`}
          order={order}
          mode={dialog.mode}
          usage={dialog.usage}
          onClose={() => setDialog(null)}
          onDone={() => {
            message.success(dialog.mode === 'export' ? 'Đã xuất kho' : 'Đã hoàn kho')
            setDialog(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
