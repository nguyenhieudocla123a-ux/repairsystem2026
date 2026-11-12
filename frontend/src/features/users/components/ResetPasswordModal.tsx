import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Form, Input, Modal } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormField } from '@/components/form/FormField'
import { resetPasswordSchema, type ResetPasswordForm } from '@/features/auth/schemas'
import { getErrorMessage } from '@/utils/errors'
import { usersApi, type UserResponse } from '../usersApi'

export function ResetPasswordModal({ user, onClose }: { user: UserResponse | null; onClose: () => void }) {
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await usersApi.resetPassword(user!.id, password)
      message.success(`Đã đặt lại mật khẩu cho ${user!.email}`)
      onClose()
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <Modal
      open={Boolean(user)}
      title="Đặt lại mật khẩu"
      okText="Đặt lại"
      cancelText="Hủy"
      onOk={onSubmit}
      onCancel={onClose}
      confirmLoading={formState.isSubmitting}
      destroyOnHidden
    >
      <p className="text-text-secondary">
        Đặt mật khẩu mới cho <strong className="text-text">{user?.email}</strong>. Người dùng sẽ bị đăng xuất khỏi mọi thiết bị.
      </p>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" component="div">
        <FormField control={control} name="password" label="Mật khẩu mới" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
        <FormField control={control} name="confirmPassword" label="Nhập lại mật khẩu" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
      </Form>
    </Modal>
  )
}
