import { SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, App, Form, Input, InputNumber, Modal, Radio, Skeleton, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { MoneyText } from '@/components/MoneyText'
import { PART_GRADE_CONFIG, type PartGrade } from '@/features/inventory/inventoryApi'
import type { PaymentMethod } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { PAYMENT_METHOD_LABELS } from '../constants/status'
import { repairsApi, type RepairOrderDetail } from '../repairsApi'

const LABOR = 'Công sửa chữa'

interface WarrantyRow {
  key: string
  partId: number | null
  description: string
  quantity: number
  months: number
  categoryName: string | null
  partGrade: PartGrade | null
  exclusions: string | null
}

/**
 * Bàn giao máy. Đã sửa xong (COMPLETED): thu tiền theo báo giá đã duyệt + cấp bảo hành THEO TỪNG DÒNG
 * (linh kiện trong báo giá với số tháng đã báo khách + công sửa chữa), nhân viên chỉnh được trước khi cấp.
 * Khách từ chối báo giá (REJECTED): trả máy không sửa, có thể thu phí kiểm tra.
 */
export function DeliverModal({ order, onClose, onDelivered }: { order: RepairOrderDetail; onClose: () => void; onDelivered: (o: RepairOrderDetail) => void }) {
  const { message } = App.useApp()
  const repaired = order.status === 'COMPLETED'
  const suggested = repaired ? (order.approvedQuotationTotal ?? 0) : 0
  const [amount, setAmount] = useState<number | null>(suggested)
  const [payment, setPayment] = useState<PaymentMethod>('CASH')
  const [rows, setRows] = useState<WarrantyRow[] | null>(repaired ? null : [])
  const [terms, setTerms] = useState('Bảo hành linh kiện đã thay và lỗi đã sửa. Không bảo hành rơi vỡ, vào nước, rách tem.')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!repaired) return
    let alive = true
    const labor: WarrantyRow = { key: 'labor', partId: null, description: LABOR, quantity: 1, months: order.warrantyRepair ? 0 : 3, categoryName: null, partGrade: null, exclusions: null }
    repairsApi
      .warrantySuggestions(order.id)
      .then((list) => alive && setRows([...list.map((s) => ({ ...s, key: `p${s.partId}` })), labor]))
      .catch(() => alive && setRows([labor]))
    return () => {
      alive = false
    }
  }, [repaired, order.id, order.warrantyRepair])

  const covered = (rows ?? []).filter((r) => r.months > 0)
  const update = (key: string, months: number) => setRows((rs) => (rs ?? []).map((r) => (r.key === key ? { ...r, months } : r)))

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const delivered = await repairsApi.deliver(order.id, {
        finalAmount: amount ?? 0,
        paymentMethod: (amount ?? 0) > 0 ? payment : undefined,
        warrantyItems: repaired ? (rows ?? []).map((r) => ({ partId: r.partId, description: r.description, quantity: r.quantity, months: r.months })) : [],
        warrantyTerms: repaired && covered.length > 0 ? terms : undefined,
        note: note || undefined,
        version: order.version,
      })
      message.success(delivered.warrantyCode ? `Đã bàn giao. Phiếu bảo hành ${delivered.warrantyCode}` : 'Đã bàn giao máy cho khách')
      onDelivered(delivered)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open width={640} title={repaired ? `Bàn giao & thanh toán – ${order.code}` : `Trả máy không sửa – ${order.code}`} okText="Xác nhận bàn giao" cancelText="Hủy" onOk={submit} onCancel={onClose} confirmLoading={saving} okButtonProps={{ disabled: repaired && rows === null }} maskClosable={false}>
      {!repaired && <Alert type="info" showIcon className="mb-4" title="Khách đã từ chối báo giá. Có thể thu phí kiểm tra (nếu có), không tạo bảo hành." />}
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        <Form.Item
          label="Số tiền thu"
          htmlFor="amount"
          extra={repaired && order.approvedQuotationTotal !== null ? <>Theo báo giá đã duyệt: <MoneyText value={order.approvedQuotationTotal} /></> : undefined}
        >
          <InputNumber<number>
            id="amount"
            className="!w-full"
            min={0}
            step={10000}
            value={amount}
            onChange={setAmount}
            formatter={(v) => (v === undefined || v === null ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
            parser={(v) => Number((v ?? '').replace(/\./g, ''))}
            addonAfter="₫"
          />
        </Form.Item>
        {(amount ?? 0) > 0 && (
          <Form.Item label="Phương thức thanh toán" required>
            <Radio.Group value={payment} onChange={(e) => setPayment(e.target.value)} optionType="button" buttonStyle="solid"
              options={(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((p) => ({ value: p, label: PAYMENT_METHOD_LABELS[p] }))} />
          </Form.Item>
        )}
        {repaired && (
          <>
            <Form.Item label={<span><SafetyCertificateOutlined /> Bảo hành từng hạng mục</span>} extra="Số tháng lấy từ báo giá khách đã duyệt. 0 = không bảo hành hạng mục đó.">
              {rows === null ? (
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              ) : (
                <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-border p-0">
                  {rows.map((r) => (
                    <li key={r.key} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.description}{r.quantity > 1 && <span className="text-text-muted"> × {r.quantity}</span>}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                          {r.partId === null ? 'Tiền công / dịch vụ' : r.categoryName}
                          {r.partGrade && <Tag color={PART_GRADE_CONFIG[r.partGrade].color} className="!m-0">{PART_GRADE_CONFIG[r.partGrade].short}</Tag>}
                        </div>
                      </div>
                      <InputNumber aria-label={`Số tháng bảo hành ${r.description}`} min={0} max={120} value={r.months} onChange={(v) => update(r.key, v ?? 0)} addonAfter="tháng" className="!w-32" />
                    </li>
                  ))}
                </ul>
              )}
            </Form.Item>
            {covered.length > 0 && (
              <Form.Item label="Điều kiện bảo hành chung" htmlFor="terms" extra="Điều kiện riêng của từng nhóm linh kiện được ghi kèm từng dòng trên phiếu bảo hành.">
                <Input.TextArea id="terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
              </Form.Item>
            )}
          </>
        )}
        <Form.Item label="Ghi chú bàn giao" htmlFor="dnote">
          <Input.TextArea id="dnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Khách đã kiểm tra máy hoạt động tốt" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
