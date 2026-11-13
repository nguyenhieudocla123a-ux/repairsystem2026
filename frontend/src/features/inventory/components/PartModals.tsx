import { CameraOutlined, DeleteOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Select } from 'antd'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form/FormField'
import { MoneyText } from '@/components/MoneyText'
import { DEVICE_TYPE_LABELS } from '@/features/devices/devicesApi'
import type { DeviceType } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { AVATAR_ACCEPT, prepareAvatar } from '@/utils/image'
import { PART_GRADE_OPTIONS, inventoryApi, type PartCategory, type PartGrade, type PartResponse } from '../inventoryApi'
import { PartImage } from './PartImage'

const money = z.number({ error: 'Vui lòng nhập số tiền' }).min(0, 'Không được âm')
const partSchema = z.object({
  sku: z.string().trim().min(1, 'Vui lòng nhập SKU').max(50).regex(/^[A-Za-z0-9\-_.]+$/, 'SKU chỉ gồm chữ, số và - _ .'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên').max(200),
  categoryId: z.number({ error: 'Vui lòng chọn nhóm linh kiện' }),
  deviceType: z.string().nullable(),
  grade: z.string({ error: 'Vui lòng chọn loại linh kiện' }).min(1, 'Vui lòng chọn loại linh kiện'),
  brand: z.string().trim().max(100),
  compatibleModels: z.string().trim().max(500),
  warrantyMonths: z.number().int().min(0).max(120).nullable(),
  unit: z.string().trim().min(1, 'Vui lòng nhập đơn vị').max(20),
  costPrice: money,
  sellingPrice: money,
  minStockLevel: z.number({ error: 'Vui lòng nhập số' }).int().min(0, 'Không được âm'),
  initialQuantity: z.number().int().min(0, 'Không được âm').max(100000),
  supplierName: z.string().trim().max(150),
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

const DEVICE_TYPES = Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]

/** Tạo / sửa linh kiện: nhóm, loại thiết bị, loại linh kiện, bảo hành, ảnh. Mount theo key mỗi lần mở (TD-40). */
export function PartFormModal({ part, preset, categories, onClose, onSaved }: {
  part?: PartResponse
  /** Thêm từ thẻ loại linh kiện: điền sẵn nhóm (+ loại thiết bị đang lọc) */
  preset?: { categoryId: number; deviceType?: DeviceType | null }
  categories: PartCategory[]
  onClose: () => void
  onSaved: () => void
}) {
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  /** Ảnh mới chọn (đã nén ở trình duyệt) – tải lên sau khi lưu linh kiện */
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { control, handleSubmit, setError, formState } = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      sku: part?.sku ?? '',
      name: part?.name ?? '',
      categoryId: part?.categoryId ?? preset?.categoryId ?? (undefined as unknown as number),
      deviceType: part?.deviceType ?? preset?.deviceType ?? null,
      grade: part?.grade ?? '',
      brand: part?.brand ?? '',
      compatibleModels: part?.compatibleModels ?? '',
      warrantyMonths: part?.warrantyMonths ?? null,
      unit: part?.unit ?? 'cái',
      costPrice: part?.costPrice ?? 0,
      sellingPrice: part?.sellingPrice ?? 0,
      minStockLevel: part?.minStockLevel ?? 1,
      initialQuantity: 0,
      supplierName: '',
    },
  })
  const deviceType = useWatch({ control, name: 'deviceType' }) as DeviceType | null
  const categoryId = useWatch({ control, name: 'categoryId' })
  const category = categories.find((c) => c.id === categoryId)
  const usable = categories.filter((c) => (c.active || c.id === part?.categoryId) && (!deviceType || c.deviceTypes.includes(deviceType)))

  const pickImage = async (file: File | undefined) => {
    if (!file) return
    try {
      const blob = await prepareAvatar(file, 640)
      if (image) URL.revokeObjectURL(image.url)
      setImage({ blob, url: URL.createObjectURL(blob) })
      setRemoveImage(false)
    } catch (e) {
      message.error(getErrorMessage(e))
    }
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      const body = {
        ...v,
        grade: v.grade as PartGrade,
        deviceType: v.deviceType as DeviceType | null,
        brand: v.brand || undefined,
        compatibleModels: v.compatibleModels || undefined,
        // Số lượng ban đầu chỉ khi tạo mới – sửa tồn kho sau này đi qua Nhập kho / Kiểm kê (có sổ kho)
        initialQuantity: part ? undefined : v.initialQuantity,
        supplierName: part || !v.supplierName ? undefined : v.supplierName,
        version: part?.version,
      }
      const saved = part ? await inventoryApi.update(part.id, body) : await inventoryApi.create(body)
      if (image) await inventoryApi.uploadImage(saved.id, image.blob)
      else if (removeImage && part?.imageUpdatedAt) await inventoryApi.deleteImage(saved.id)
      message.success(part ? 'Đã cập nhật linh kiện' : 'Đã thêm linh kiện')
      onSaved()
    } catch (e) {
      if (!applyApiFieldErrors(e, setError, Object.keys(partSchema.shape))) setFormError(getErrorMessage(e))
    }
  })

  const hasOwnImage = !!image || (!!part?.imageUpdatedAt && !removeImage)
  return (
    <Modal open width={720} title={part ? `Sửa linh kiện ${part.sku}` : 'Thêm linh kiện'} okText="Lưu" cancelText="Hủy" onOk={onSubmit} onCancel={onClose} confirmLoading={formState.isSubmitting} maskClosable={false}>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      {part && <p className="mt-0 text-sm text-text-secondary">Tồn kho hiện tại: <strong className="text-text">{part.quantityOnHand} {part.unit}</strong> – thay đổi bằng "Nhập kho" hoặc "Điều chỉnh kiểm kê" (có ghi sổ kho).</p>}
      <Form layout="vertical" component="div">
        <div className="grid gap-x-5 sm:grid-cols-[160px_1fr]">
          {/* Ảnh linh kiện */}
          <div className="mb-4 flex flex-col items-center gap-2">
            {image ? (
              <img src={image.url} alt="Ảnh linh kiện mới chọn" className="size-36 rounded-xl object-cover ring-1 ring-black/10" />
            ) : (
              <PartImage partId={part?.id} categoryCode={category?.code ?? part?.categoryCode} version={removeImage ? null : part?.imageUpdatedAt} size={144} className="rounded-xl" alt="Ảnh linh kiện" />
            )}
            <span className="text-center text-xs text-text-muted">{hasOwnImage ? 'Ảnh của linh kiện' : 'Ảnh mặc định theo nhóm'}</span>
            <input ref={fileRef} type="file" accept={AVATAR_ACCEPT} className="hidden" aria-hidden="true" tabIndex={-1} onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = '' }} />
            <div className="flex gap-1">
              <Button size="small" icon={<CameraOutlined />} onClick={() => fileRef.current?.click()}>{hasOwnImage ? 'Đổi ảnh' : 'Tải ảnh'}</Button>
              {hasOwnImage && (
                <Button size="small" danger icon={<DeleteOutlined />} aria-label="Bỏ ảnh"
                  onClick={() => { if (image) { URL.revokeObjectURL(image.url); setImage(null) } else setRemoveImage(true) }} />
              )}
            </div>
          </div>

          <div>
            <div className="grid gap-x-4 sm:grid-cols-[1fr_2fr]">
              <FormField control={control} name="sku" label="Mã SKU" required render={(f) => <Input {...f} value={String(f.value ?? "")} placeholder="LCD-IP13" />} />
              <FormField control={control} name="name" label="Tên linh kiện" required render={(f) => <Input {...f} value={String(f.value ?? "")} placeholder="Màn hình iPhone 13" />} />
            </div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="deviceType"
                render={({ field }) => (
                  <Form.Item label="Dùng cho thiết bị" htmlFor="deviceType">
                    <Select id="deviceType" value={field.value ?? '__ALL__'} onChange={(v) => field.onChange(v === '__ALL__' ? null : v)}
                      options={[{ value: '__ALL__', label: 'Dùng chung' }, ...DEVICE_TYPES.map((t) => ({ value: t, label: DEVICE_TYPE_LABELS[t] }))]} />
                  </Form.Item>
                )}
              />
              <Controller
                control={control}
                name="categoryId"
                render={({ field, fieldState }) => (
                  <Form.Item label="Nhóm linh kiện" required htmlFor="categoryId" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                    <Select id="categoryId" showSearch optionFilterProp="label" placeholder="Chọn nhóm" value={field.value} onChange={field.onChange}
                      options={usable.map((c) => ({ value: c.id, label: c.name }))} />
                  </Form.Item>
                )}
              />
            </div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="grade"
                render={({ field, fieldState }) => (
                  <Form.Item label="Loại linh kiện" required htmlFor="grade" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                    <Select id="grade" placeholder="Chính hãng / zin / thay thế" value={field.value || undefined} onChange={field.onChange} options={PART_GRADE_OPTIONS} />
                  </Form.Item>
                )}
              />
              <FormField control={control} name="brand" label="Thương hiệu" render={(f) => <Input {...f} value={String(f.value ?? "")} placeholder="Apple, GENA, Pisen…" />} />
            </div>
            <FormField control={control} name="compatibleModels" label="Model tương thích" render={(f) => <Input {...f} value={String(f.value ?? "")} placeholder="iPhone 13, iPhone 13 Pro" />} />
            <Controller
              control={control}
              name="warrantyMonths"
              render={({ field }) => (
                <Form.Item label="Bảo hành (tháng)" htmlFor="warrantyMonths"
                  extra={category ? `Để trống = theo nhóm "${category.name}": ${category.defaultWarrantyMonths === 0 ? 'không bảo hành' : `${category.defaultWarrantyMonths} tháng`}` : 'Để trống = theo nhóm'}>
                  <InputNumber id="warrantyMonths" className="!w-full" min={0} max={120} value={field.value} onChange={(v) => field.onChange(v ?? null)}
                    placeholder={category ? String(category.defaultWarrantyMonths) : 'Theo nhóm'} addonAfter="tháng" />
                </Form.Item>
              )}
            />
          </div>
        </div>

        {!part && (
          <div className="mb-1 rounded-lg bg-tone-success-bg/60 px-4 pt-3">
            <div className="mb-2 text-sm font-medium text-tone-success-fg">Nhập kho ban đầu (ghi vào sổ kho là "Tồn đầu kỳ", giá = giá nhập)</div>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="initialQuantity"
                render={({ field, fieldState }) => (
                  <Form.Item label="Số lượng ban đầu" htmlFor="initialQuantity" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                    <InputNumber id="initialQuantity" className="!w-full" min={0} max={100000} value={field.value} onChange={(v) => field.onChange(v ?? 0)} />
                  </Form.Item>
                )}
              />
              <FormField control={control} name="supplierName" label="Nhà cung cấp" render={(f) => <Input {...f} value={String(f.value ?? '')} placeholder="Không bắt buộc" />} />
            </div>
          </div>
        )}
        <div className="grid gap-x-4 sm:grid-cols-4">
          <FormField control={control} name="unit" label="Đơn vị" required render={(f) => <Input {...f} value={String(f.value ?? "")} />} />
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
              <Form.Item label="Tồn tối thiểu" htmlFor="minStockLevel" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
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
