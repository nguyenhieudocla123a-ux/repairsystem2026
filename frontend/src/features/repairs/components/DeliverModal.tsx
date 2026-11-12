import { Alert, App, Form, Input, InputNumber, Modal, Radio, Select } from 'antd'
import { useState } from 'react'
import { MoneyText } from '@/components/MoneyText'
import type { PaymentMethod } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { PAYMENT_METHOD_LABELS } from '../constants/status'
import { repairsApi, type RepairOrderDetail } from '../repairsApi'

const WARRANTY_OPTIONS = [0, 1, 3, 6, 12].map((m) => ({ value: m, label: m === 0 ? 'Không bảo hành' : `${m} tháng` }))

/**
 * Bàn giao máy. Đã sửa xong (COMPLETED): thu tiền theo báo giá đã duyệt + tạo bảo hành.
 * Khách từ chối báo giá (REJECTED): trả máy không sửa, có thể thu phí kiểm tra.
 */
export function DeliverModal({ order, onClose, onDelivered }: { order: RepairOrderDetail; onClose: () => void; onDelivered: (o: RepairOrderDetail) => void }) {
  const { message } = App.useApp()
  const repaired = order.status === 'COMPLETED'
  const suggested = repaired ? (order.approvedQuotationTotal ?? 0) : 0
  const [amount, setAmount] = useState<number | null>(suggested)
  const [payment, setPayment] = useState<PaymentMethod>('CASH')
  const [months, setMonths] = useState(repaired && !order.warrantyRepair ? 3 : 0)
  const [terms, setTerms] = useState('Bảo hành linh kiện đã thay và lỗi đã sửa. Không bảo hành rơi vỡ, vào nước.')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      const delivered = await repairsApi.deliver(order.id, {
        finalAmount: amount ?? 0,
        paymentMethod: (amount ?? 0) > 0 ? payment : undefined,
        warrantyMonths: repaired ? months : 0,
        warrantyTerms: repaired && months > 0 ? terms : undefined,
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
    <Modal open title={repaired ? `Bàn giao & thanh toán – ${order.code}` : `Trả máy không sửa – ${order.code}`} okText="Xác nhận bàn giao" cancelText="Hủy" onOk={submit} onCancel={onClose} confirmLoading={saving} maskClosable={false}>
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
            <Form.Item label="Thời hạn bảo hành" htmlFor="months">
              <Select id="months" value={months} onChange={setMonths} options={WARRANTY_OPTIONS} />
            </Form.Item>
            {months > 0 && (
              <Form.Item label="Điều kiện bảo hành" htmlFor="terms">
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
