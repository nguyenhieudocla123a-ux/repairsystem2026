import { DeleteOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons'
import { Alert, App, Button, DatePicker, Input, InputNumber, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { MoneyText } from '@/components/MoneyText'
import { PART_GRADE_CONFIG, inventoryApi } from '@/features/inventory/inventoryApi'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getErrorMessage } from '@/utils/errors'
import { quotationsApi, type Quotation, type QuotationItemType } from '../quotationsApi'
import { PartImage } from '@/features/inventory/components/PartImage'

interface Row {
  key: number
  itemType: QuotationItemType
  partId?: number
  description: string
  quantity: number
  unitPrice?: number
}

let rowSeq = 0
const newRow = (itemType: QuotationItemType): Row => ({ key: ++rowSeq, itemType, description: '', quantity: 1 })

const moneyProps = {
  min: 0,
  step: 10000,
  formatter: (v: number | string | undefined) => (v === undefined || v === '' ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')),
  parser: (v: string | undefined) => Number((v ?? '').replace(/\./g, '')),
}

/**
 * Soạn / sửa báo giá nháp. Tổng tiền ở đây chỉ là "tạm tính" để nhân viên tham khảo –
 * Backend luôn tính lại bằng BigDecimal và là nguồn số liệu chính thức (TD-09).
 */
export function QuotationEditor({ orderId, quotation, onClose, onSaved }: { orderId: number; quotation?: Quotation; onClose: () => void; onSaved: (q: Quotation) => void }) {
  const { message } = App.useApp()
  const parts = useAsyncData(() => inventoryApi.options(), [])
  const [rows, setRows] = useState<Row[]>(
    quotation
      ? quotation.items.map((i) => ({ key: ++rowSeq, itemType: i.itemType, partId: i.partId ?? undefined, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))
      : [newRow('PART'), { ...newRow('LABOR'), description: 'Tiền công sửa chữa' }],
  )
  const [discount, setDiscount] = useState<number>(quotation?.discount ?? 0)
  const [note, setNote] = useState(quotation?.note ?? '')
  const [validUntil, setValidUntil] = useState<string | undefined>(quotation?.validUntil ?? dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const priceOf = (r: Row) => r.unitPrice ?? (r.partId ? parts.data?.find((p) => p.id === r.partId)?.sellingPrice : undefined) ?? 0
  const subtotal = rows.reduce((sum, r) => sum + priceOf(r) * (r.quantity || 0), 0)

  const save = async () => {
    setError(null)
    if (!rows.length) return setError('Báo giá phải có ít nhất 1 dòng')
    const invalid = rows.find((r) => (r.itemType === 'PART' ? !r.partId : !r.description.trim() || r.unitPrice === undefined) || !r.quantity)
    if (invalid) return setError(invalid.itemType === 'PART' ? 'Dòng linh kiện phải chọn linh kiện và số lượng' : 'Dòng tiền công phải có mô tả, số lượng và đơn giá')
    if (discount > subtotal) return setError('Giảm giá không được lớn hơn tổng tiền')
    setSaving(true)
    try {
      const body = {
        items: rows.map((r) => ({ itemType: r.itemType, partId: r.partId, description: r.description.trim() || undefined, quantity: r.quantity, unitPrice: r.unitPrice })),
        discount,
        note: note.trim() || undefined,
        validUntil,
      }
      const saved = quotation ? await quotationsApi.update(quotation.id, body) : await quotationsApi.create(orderId, body)
      message.success(quotation ? 'Đã lưu báo giá nháp' : `Đã tạo báo giá nháp v${saved.versionNo}`)
      onSaved(saved)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open width={880} title={quotation ? `Sửa báo giá v${quotation.versionNo}` : 'Lập báo giá'} okText="Lưu nháp" cancelText="Hủy" onOk={save} onCancel={onClose} confirmLoading={saving} maskClosable={false}>
      <p className="mt-0 text-sm text-text-secondary">Lưu nháp trước, kiểm tra lại rồi bấm "Gửi cho khách". Dòng linh kiện để trống đơn giá sẽ lấy giá bán hiện tại.</p>
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}

      <div className="flex flex-col gap-3" role="list" aria-label="Các dòng báo giá">
        {rows.map((r, idx) => (
          <div key={r.key} role="listitem" className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[120px_minmax(0,1fr)_80px_150px_110px_32px] md:items-center">
            <Select<QuotationItemType>
              aria-label={`Loại dòng ${idx + 1}`}
              value={r.itemType}
              onChange={(t) => update(r.key, { itemType: t, partId: undefined, unitPrice: undefined })}
              options={[{ value: 'PART', label: 'Linh kiện' }, { value: 'LABOR', label: 'Tiền công' }]}
            />
            {r.itemType === 'PART' ? (
              <Select<number>
                aria-label={`Linh kiện dòng ${idx + 1}`}
                placeholder="Chọn linh kiện"
                value={r.partId}
                loading={parts.loading}
                showSearch={{ optionFilterProp: 'search' }}
                onChange={(id) => update(r.key, { partId: id, unitPrice: undefined })}
                options={(parts.data ?? []).map((p) => ({
                  value: p.id,
                  search: `${p.sku} ${p.name} ${p.categoryName ?? ''}`,
                  label: (
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <PartImage partId={p.id} categoryCode={p.categoryCode} version={p.imageUpdatedAt} size={24} className="!rounded" />
                        <span className="truncate">{p.name}</span>
                        {p.grade && <span className="shrink-0 text-xs text-text-muted">{PART_GRADE_CONFIG[p.grade].short}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-text-muted">
                        BH {p.warrantyMonths}th · <span className={p.quantityOnHand > 0 ? '' : 'text-error'}>tồn {p.quantityOnHand}</span>
                      </span>
                    </span>
                  ),
                }))}
              />
            ) : (
              <Input aria-label={`Mô tả dòng ${idx + 1}`} placeholder="VD: Công thay màn hình" value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} />
            )}
            <InputNumber aria-label={`Số lượng dòng ${idx + 1}`} min={1} max={1000} value={r.quantity} onChange={(v) => update(r.key, { quantity: v ?? 1 })} className="!w-full" />
            <InputNumber<number>
              {...moneyProps}
              aria-label={`Đơn giá dòng ${idx + 1}`}
              placeholder={r.itemType === 'PART' && r.partId ? `${priceOf(r).toLocaleString('vi-VN')} (giá bán)` : 'Đơn giá'}
              value={r.unitPrice}
              onChange={(v) => update(r.key, { unitPrice: v ?? undefined })}
              className="!w-full"
            />
            <MoneyText value={priceOf(r) * (r.quantity || 0)} className="text-right font-medium" />
            <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Xóa dòng ${idx + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button icon={<PlusOutlined />} onClick={() => setRows((rs) => [...rs, newRow('PART')])}>Thêm linh kiện</Button>
        <Button icon={<ToolOutlined />} onClick={() => setRows((rs) => [...rs, newRow('LABOR')])}>Thêm tiền công</Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Ghi chú cho khách
            <Input.TextArea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Linh kiện chính hãng, bảo hành 3 tháng" maxLength={2000} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Báo giá có hiệu lực đến
            <DatePicker format="DD/MM/YYYY" value={validUntil ? dayjs(validUntil) : null} disabledDate={(d) => d.isBefore(dayjs(), 'day')} onChange={(d) => setValidUntil(d ? d.format('YYYY-MM-DD') : undefined)} />
          </label>
        </div>
        <dl className="m-0 flex flex-col gap-2 rounded-lg bg-tone-neutral-bg p-4 text-sm">
          <div className="flex justify-between"><dt>Tạm tính</dt><dd className="m-0"><MoneyText value={subtotal} /></dd></div>
          <div className="flex items-center justify-between gap-3">
            <dt>Giảm giá</dt>
            <dd className="m-0"><InputNumber<number> {...moneyProps} aria-label="Giảm giá" value={discount} onChange={(v) => setDiscount(v ?? 0)} className="!w-40" /></dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Tổng cộng (tạm tính)</dt><dd className="m-0"><MoneyText value={Math.max(subtotal - discount, 0)} /></dd></div>
        </dl>
      </div>
    </Modal>
  )
}
