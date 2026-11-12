import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Form, Input, Modal, Select } from 'antd'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/form/FormField'
import { emailSchema, fullNameSchema, optionalPhoneSchema, passwordSchema } from '@/features/auth/schemas'
import type { Role } from '@/types/enums'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { INTERNAL_ROLES, ROLE_TAG_CONFIG } from '../constants'
import { usersApi, type UserResponse } from '../usersApi'

const createSchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  phone: optionalPhoneSchema,
  role: z.enum(INTERNAL_ROLES, { error: 'Vui lòng chọn vai trò' }),
  password: passwordSchema,
})
const editSchema = z.object({
  fullName: fullNameSchema,
  phone: optionalPhoneSchema,
  role: z.enum(['ADMIN', 'STAFF', 'TECHNICIAN', 'CUSTOMER']),
})

type CreateForm = z.infer<typeof createSchema>

/** Kiểu chung cho cả 2 chế độ; schema Zod tương ứng quyết định field nào bắt buộc. */
interface FormValues {
  email?: string
  fullName: string
  phone: string
  role: Role
  password?: string
}

export interface UserFormModalProps {
  open: boolean
  /** Có user → chế độ sửa; không có → tạo mới. */
  user?: UserResponse
  /** Không cho đổi vai trò của chính mình (Backend cũng chặn). */
  currentUserId: number
  onClose: () => void
  onSaved: (user: UserResponse) => void
}

export function UserFormModal({ open, user, currentUserId, onClose, onSaved }: UserFormModalProps) {
  const isEdit = Boolean(user)
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)

  // Modal được mount mới mỗi lần mở (key ở UsersPage) → defaultValues luôn đúng, không cần reset trong effect
  const { control, handleSubmit, setError, formState } = useForm<FormValues>({
    // Hai schema khác nhau cho tạo / sửa → ép về Resolver của kiểu form chung
    resolver: zodResolver(isEdit ? editSchema : createSchema) as unknown as Resolver<FormValues>,
    defaultValues: user
      ? { fullName: user.fullName, phone: user.phone ?? '', role: user.role }
      : { email: '', fullName: '', phone: '', role: 'STAFF', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const phone = values.phone || undefined
    try {
      const saved = user
        ? await usersApi.update(user.id, { fullName: values.fullName, phone, role: values.role })
        : await usersApi.create({ email: values.email!, fullName: values.fullName, password: values.password!, phone, role: values.role as CreateForm['role'] })
      message.success(isEdit ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản')
      onSaved(saved)
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, ['email', 'fullName', 'phone', 'role', 'password'])) {
        setFormError(getErrorMessage(error))
      }
    }
  })

  const roleLocked = isEdit && (user!.id === currentUserId || user!.role === 'CUSTOMER')
  const roleOptions = (isEdit && user!.role === 'CUSTOMER' ? (['CUSTOMER'] as const) : INTERNAL_ROLES).map((r) => ({
    value: r,
    label: ROLE_TAG_CONFIG[r].label,
  }))

  return (
    <Modal
      open={open}
      title={isEdit ? `Sửa tài khoản – ${user!.email}` : 'Tạo tài khoản nội bộ'}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
      cancelText="Hủy"
      onOk={onSubmit}
      onCancel={onClose}
      confirmLoading={formState.isSubmitting}
      destroyOnHidden
      maskClosable={false}
    >
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" requiredMark component="div" className="mt-4">
        {!isEdit && (
          <FormField control={control} name="email" label="Email" required render={(f) => <Input {...f} value={f.value ?? ''} type="email" autoComplete="off" />} />
        )}
        <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} value={f.value ?? ''} />} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField control={control} name="phone" label="Số điện thoại" render={(f) => <Input {...f} value={f.value ?? ''} type="tel" placeholder="Không bắt buộc" />} />
          <FormField
            control={control}
            name="role"
            label="Vai trò"
            required
            extra={roleLocked ? (user!.id === currentUserId ? 'Không thể tự đổi vai trò của mình' : 'Tài khoản khách hàng giữ nguyên vai trò') : undefined}
            render={(f) => <Select {...f} options={roleOptions} disabled={roleLocked} />}
          />
        </div>
        {!isEdit && (
          <FormField
            control={control}
            name="password"
            label="Mật khẩu ban đầu"
            required
            extra="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số. Gửi cho nhân viên qua kênh an toàn."
            render={(f) => <Input.Password {...f} value={f.value ?? ''} autoComplete="new-password" />}
          />
        )}
      </Form>
    </Modal>
  )
}
