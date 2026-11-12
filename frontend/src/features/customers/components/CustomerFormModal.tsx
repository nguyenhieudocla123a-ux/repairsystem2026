import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Form, Input, Modal } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form/FormField'
import { fullNameSchema, phoneSchema } from '@/features/auth/schemas'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { emptyToUndefined } from '@/utils/forms'
import { customersApi, type CustomerResponse } from '../customersApi'

const schema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: z.union([z.literal(''), z.email('Email không hợp lệ')]),
  address: z.string().max(255, 'Tối đa 255 ký tự'),
  note: z.string().max(2000, 'Tối đa 2000 ký tự'),
})
type FormValues = z.infer<typeof schema>

export interface CustomerFormModalProps {
  customer?: CustomerResponse
  onClose: () => void
  onSaved: (customer: CustomerResponse) => void
}

/** Mount lại theo key mỗi lần mở (TD-40). */
export function CustomerFormModal({ customer, onClose, onSaved }: CustomerFormModalProps) {
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: customer?.fullName ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      address: customer?.address ?? '',
      note: customer?.note ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const body = emptyToUndefined(values)
      const saved = customer ? await customersApi.update(customer.id, body) : await customersApi.create(body)
      message.success(customer ? 'Đã cập nhật khách hàng' : `Đã tạo khách hàng ${saved.code}`)
      onSaved(saved)
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, ['fullName', 'phone', 'email', 'address', 'note'])) {
        setFormError(getErrorMessage(error))
      }
    }
  })

  return (
    <Modal
      open
      title={customer ? `Sửa khách hàng ${customer.code}` : 'Thêm khách hàng'}
      okText={customer ? 'Lưu' : 'Thêm khách hàng'}
      cancelText="Hủy"
      onOk={onSubmit}
      onCancel={onClose}
      confirmLoading={formState.isSubmitting}
      maskClosable={false}
    >
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div" className="mt-4">
        <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} autoFocus />} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField control={control} name="phone" label="Số điện thoại" required render={(f) => <Input {...f} type="tel" />} />
          <FormField control={control} name="email" label="Email" render={(f) => <Input {...f} type="email" placeholder="Không bắt buộc" />} />
        </div>
        <FormField control={control} name="address" label="Địa chỉ" render={(f) => <Input {...f} />} />
        <FormField control={control} name="note" label="Ghi chú" render={(f) => <Input.TextArea {...f} rows={2} />} />
      </Form>
    </Modal>
  )
}
