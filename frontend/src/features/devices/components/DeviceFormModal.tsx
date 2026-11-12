import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Form, Input, Modal, Select } from 'antd'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form/FormField'
import { CustomerSelect } from '@/features/customers/components/CustomerSelect'
import type { DeviceType } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { emptyToUndefined } from '@/utils/forms'
import { DEVICE_TYPE_OPTIONS, devicesApi, type DeviceResponse } from '../devicesApi'

const schema = z.object({
  customerId: z.number().optional(),
  name: z.string().trim().min(1, 'Vui lòng nhập tên thiết bị').max(150),
  deviceType: z.enum(['PHONE', 'LAPTOP', 'TABLET', 'DESKTOP', 'SMARTWATCH', 'OTHER'], { error: 'Vui lòng chọn loại' }),
  brand: z.string().max(100),
  model: z.string().max(100),
  serialNumber: z.string().max(100).regex(/^[A-Za-z0-9\-_/ ]*$/, 'Serial chỉ gồm chữ, số và - _ /'),
  color: z.string().max(50),
  note: z.string().max(2000),
})
type FormValues = z.infer<typeof schema>

export interface DeviceFormModalProps {
  device?: DeviceResponse
  /** 'staff': chọn khách hàng; 'customer': thiết bị của chính khách (POST /me/devices). */
  mode: 'staff' | 'customer'
  /** Khóa sẵn khách hàng (VD thêm thiết bị từ trang chi tiết khách). */
  fixedCustomerId?: number
  onClose: () => void
  onSaved: (device: DeviceResponse) => void
}

export function DeviceFormModal({ device, mode, fixedCustomerId, onClose, onSaved }: DeviceFormModalProps) {
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: device?.customerId ?? fixedCustomerId,
      name: device?.name ?? '',
      deviceType: device?.deviceType ?? ('PHONE' as DeviceType),
      brand: device?.brand ?? '',
      model: device?.model ?? '',
      serialNumber: device?.serialNumber ?? '',
      color: device?.color ?? '',
      note: device?.note ?? '',
    },
  })
  const needsCustomer = mode === 'staff' && !device && !fixedCustomerId

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    if (needsCustomer && !values.customerId) {
      setError('customerId', { message: 'Vui lòng chọn khách hàng' })
      return
    }
    try {
      const body = emptyToUndefined(values)
      const saved = device
        ? await devicesApi.update(device.id, body)
        : mode === 'customer'
          ? await devicesApi.addMine(body)
          : await devicesApi.create(body)
      message.success(device ? 'Đã cập nhật thiết bị' : 'Đã thêm thiết bị')
      onSaved(saved)
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, ['customerId', 'name', 'deviceType', 'brand', 'model', 'serialNumber', 'color', 'note'])) {
        setFormError(getErrorMessage(error))
      }
    }
  })

  return (
    <Modal
      open
      title={device ? `Sửa thiết bị – ${device.name}` : 'Thêm thiết bị'}
      okText={device ? 'Lưu' : 'Thêm thiết bị'}
      cancelText="Hủy"
      onOk={onSubmit}
      onCancel={onClose}
      confirmLoading={formState.isSubmitting}
      maskClosable={false}
    >
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div" className="mt-4">
        {needsCustomer && (
          <Controller
            control={control}
            name="customerId"
            render={({ field, fieldState }) => (
              <Form.Item label="Khách hàng" required htmlFor="customerId" validateStatus={fieldState.error ? 'error' : undefined} help={fieldState.error?.message}>
                <CustomerSelect id="customerId" value={field.value} onChange={(v) => field.onChange(v)} />
              </Form.Item>
            )}
          />
        )}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField control={control} name="name" label="Tên thiết bị" required render={(f) => <Input {...f} placeholder="VD: iPhone 13 của anh A" />} />
          <FormField control={control} name="deviceType" label="Loại" required render={(f) => <Select {...f} options={DEVICE_TYPE_OPTIONS} />} />
          <FormField control={control} name="brand" label="Thương hiệu" render={(f) => <Input {...f} placeholder="Apple, Samsung, Dell..." />} />
          <FormField control={control} name="model" label="Model" render={(f) => <Input {...f} />} />
          <FormField control={control} name="serialNumber" label="Serial / IMEI" extra="Dùng để tra cứu bảo hành" render={(f) => <Input {...f} />} />
          <FormField control={control} name="color" label="Màu" render={(f) => <Input {...f} />} />
        </div>
        <FormField control={control} name="note" label="Ghi chú" render={(f) => <Input.TextArea {...f} rows={2} />} />
      </Form>
    </Modal>
  )
}
