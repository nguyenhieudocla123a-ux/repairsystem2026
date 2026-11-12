import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, AutoComplete, Form, Input, InputNumber, Modal } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form/FormField'
import { MoneyText } from '@/components/MoneyText'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { inventoryApi, type PartResponse } from '../inventoryApi'

const money = z.number({ error: 'Vui lòng nhập số tiền' }).min(0, 'Không được âm')
const partSchema = z.object({
  sku: z.string().trim().min(1, 'Vui lòng nhập SKU').max(50).regex(/^[A-Za-z0-9\-_.]+$/, 'SKU chỉ gồm chữ, số và - _ .'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên').max(200),
  category: z.string().max(100),
  unit: z.string().trim().min(1, 'Vui lòng nhập đơn vị').max(20),
  costPrice: money,
  sellingPrice: money,
  minStockLevel: z.number({ error: 'Vui lòng nhập số' }).int().min(0, 'Không được âm'),
})
type PartForm = z.infer<typeof partSchema>

const moneyInput = (props: { value?: number; onChange: (v: number | null) => void; id?: string }) => (
  <InputNumber<number>
    {...props}
    className="!w-full"
    min={0}
    step={10000}
    formatter={(v) => (v === undefined || v === null ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
    parser={(v) => Number((v ?? '').replace(/\./g, ''))}
    addonAfter="₫"
  />
)

/** Tạo / sửa linh kiện. Mount theo key mỗi lần mở (TD-40). */
export function PartFormModal({ part, categories, onClose, onSaved }: { part?: PartResponse; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, setError, formState } = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      sku: part?.sku ?? '',
      name: part?.name ?? '',
      category: part?.category ?? '',
      unit: part?.unit ?? 'cái',
      costPrice: part?.costPrice ?? 0,
      sellingPrice: part?.sellingPrice ?? 0,
      minStockLevel: part?.minStockLevel ?? 1,
    },
  })
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      const body = { ...v, category: v.category || undefined, version: part?.version }
      if (part) await inventoryApi.update(part.id, body)
      else await inventoryApi.create(body)
      message.success(part ? 'Đã cập nhật linh kiện' : 'Đã thêm linh kiện')
      onSaved()
    } catch (e) {
      if (!applyApiFieldErrors(e, setError, Object.keys(partSchema.shape))) setFormError(getErrorMessage(e))
    }
  })
  return (
    <Modal open title={part ? `Sửa linh kiện ${part.sku}` : 'Thêm linh kiện'} okText="Lưu" cancelText="Hủy" onOk={onSubmit} onCancel={onClose} confirmLoading={formState.isSubmitting} maskClosable={false}>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      {!part && <p className="mt-0 text-sm text-text-secondary">Tồn kho ban đầu = 0. Dùng "Nhập kho" để thêm số lượng (có ghi sổ kho).</p>}
      <Form layout="vertical" component="div">
        <div className="grid gap-x-4 sm:grid-cols-[1fr_2fr]">
          <FormField control={control} name="sku" label="Mã SKU" required render={(f) => <Input {...f} placeholder="LCD-IP13" />} />
          <FormField control={control} name="name" label="Tên linh kiện" required render={(f) => <Input {...f} />} />
        </div>
        <div className="grid gap-x-4 sm:grid-cols-[2fr_1fr]">
          <FormField
            control={control}
            name="category"
            label="Danh mục"
            render={(f) => <AutoComplete {...f} options={categories.map((c) => ({ value: c }))} placeholder="Màn hình, Pin, Bo mạch..." filterOption />}
          />
          <FormField control={control} name="unit" label="Đơn vị" required render={(f) => <Input {...f} />} />
        </div>
        <div className="grid gap-x-4 sm:grid-cols-3">
          {(['costPrice', 'sellingPrice'] as const).map((name) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field, fieldState }) => (
                <Form.Item label={name === 'costPrice' ? 'Giá nhập' : 'Giá bán'} required htmlFor={name} validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                  {moneyInput({ id: name, value: field.value, onChange: (v) => field.onChange(v ?? 0) })}
                </Form.Item>
              )}
            />
          ))}
          <Controller
            control={control}
            name="minStockLevel"
            render={({ field, fieldState }) => (
              <Form.Item label="Tồn tối thiểu" htmlFor="minStockLevel" extra="Cảnh báo khi tồn ≤ mức này" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                <InputNumber id="minStockLevel" className="!w-full" min={0} value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
              </Form.Item>
            )}
          />
        </div>
      </Form>
    </Modal>
  )
}

/** Nhập kho hoặc điều chỉnh kiểm kê. */
export function StockModal({ part, mode, onClose, onSaved }: { part: PartResponse; mode: 'import' | 'adjust'; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp()
  const [quantity, setQuantity] = useState<number | null>(mode === 'adjust' ? part.quantityOnHand : 1)
  const [unitCost, setUnitCost] = useState<number | null>(part.costPrice)
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const isImport = mode === 'import'

  const submit = async () => {
    if (quantity === null || quantity < (isImport ? 1 : 0)) return setError(isImport ? 'Số lượng phải lớn hơn 0' : 'Số lượng không được âm')
    if (!isImport && !note.trim()) return setError('Vui lòng nhập lý do điều chỉnh')
    setSaving(true)
    try {
      if (isImport) await inventoryApi.importStock(part.id, { quantity, unitCost: unitCost ?? undefined, supplierName: supplier || undefined, note: note || undefined })
      else await inventoryApi.adjust(part.id, { newQuantity: quantity, note })
      message.success(isImport ? `Đã nhập ${quantity} ${part.unit} ${part.sku}` : 'Đã điều chỉnh tồn kho')
      onSaved()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const delta = !isImport && quantity !== null ? quantity - part.quantityOnHand : 0
  return (
    <Modal open title={`${isImport ? 'Nhập kho' : 'Điều chỉnh kiểm kê'} – ${part.sku}`} okText={isImport ? 'Nhập kho' : 'Điều chỉnh'} cancelText="Hủy" onOk={submit} onCancel={onClose} confirmLoading={saving}>
      <p className="mt-0 text-text-secondary">
        {part.name} · Tồn hiện tại: <strong className="text-text tabular-nums">{part.quantityOnHand} {part.unit}</strong>
      </p>
      {error && <Alert type="error" showIcon title={error} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        <Form.Item label={isImport ? 'Số lượng nhập' : 'Số lượng thực tế đếm được'} required htmlFor="qty"
          extra={!isImport && delta !== 0 ? `Chênh lệch ${delta > 0 ? '+' : ''}${delta} ${part.unit} sẽ được ghi vào sổ kho` : undefined}>
          <InputNumber id="qty" className="!w-full" min={isImport ? 1 : 0} value={quantity} onChange={setQuantity} autoFocus />
        </Form.Item>
        {isImport && (
          <>
            <Form.Item label="Giá nhập / đơn vị" htmlFor="cost" extra={part.costPrice !== null ? <>Giá nhập gần nhất: <MoneyText value={part.costPrice} /></> : undefined}>
              {moneyInput({ id: 'cost', value: unitCost ?? undefined, onChange: setUnitCost })}
            </Form.Item>
            <Form.Item label="Nhà cung cấp" htmlFor="sup">
              <Input id="sup" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Form.Item>
          </>
        )}
        <Form.Item label={isImport ? 'Ghi chú' : 'Lý do điều chỉnh'} required={!isImport} htmlFor="note">
          <Input.TextArea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
