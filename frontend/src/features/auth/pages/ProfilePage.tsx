import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Card, Descriptions, Form, Input } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { PageHeader } from '@/components/PageHeader'
import { StatusTag } from '@/components/StatusTag'
import { ROLE_TAG_CONFIG } from '@/features/users/constants'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { formatDateTime } from '@/utils/format'
import { authApi } from '../authApi'
import { credentialsReceived, userUpdated } from '../authSlice'
import { changePasswordSchema, profileSchema, type ChangePasswordForm, type ProfileForm } from '../schemas'

function ProfileInfoCard() {
  const user = useAppSelector((s) => s.auth.user)!
  const dispatch = useAppDispatch()
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, setError, formState } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, phone: user.phone ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const updated = await authApi.updateProfile({ fullName: values.fullName, phone: values.phone || undefined })
      dispatch(userUpdated(updated))
      message.success('Đã cập nhật hồ sơ')
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, ['fullName', 'phone'])) setFormError(getErrorMessage(error))
    }
  })

  return (
    <Card title="Thông tin cá nhân">
      <Descriptions column={1} size="small" className="mb-5">
        <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        <Descriptions.Item label="Vai trò">
          <StatusTag value={user.role} config={ROLE_TAG_CONFIG} />
        </Descriptions.Item>
        <Descriptions.Item label="Tạo lúc">{formatDateTime(user.createdAt)}</Descriptions.Item>
      </Descriptions>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" onFinish={onSubmit} component="form" noValidate>
        <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} autoComplete="name" />} />
        <FormField
          control={control}
          name="phone"
          label="Số điện thoại"
          required={user.role === 'CUSTOMER'}
          render={(f) => <Input {...f} type="tel" autoComplete="tel" />}
        />
        <Button type="primary" htmlType="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>
          Lưu thay đổi
        </Button>
      </Form>
    </Card>
  )
}

function ChangePasswordCard() {
  const dispatch = useAppDispatch()
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, reset, formState } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async ({ currentPassword, password }) => {
    setFormError(null)
    try {
      // Backend thu hồi mọi phiên khác và trả phiên mới cho thiết bị này → cập nhật token trong store
      const session = await authApi.changePassword({ currentPassword, newPassword: password })
      dispatch(credentialsReceived(session))
      reset()
      message.success('Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.')
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <Card title="Đổi mật khẩu">
      <p className="mt-0 mb-5 text-sm text-text-secondary">Sau khi đổi, bạn sẽ được đăng xuất khỏi mọi thiết bị khác.</p>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" onFinish={onSubmit} component="form" noValidate>
        <FormField control={control} name="currentPassword" label="Mật khẩu hiện tại" required render={(f) => <Input.Password {...f} autoComplete="current-password" />} />
        <FormField
          control={control}
          name="password"
          label="Mật khẩu mới"
          required
          extra="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"
          render={(f) => <Input.Password {...f} autoComplete="new-password" />}
        />
        <FormField control={control} name="confirmPassword" label="Nhập lại mật khẩu mới" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
        <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>
          Đổi mật khẩu
        </Button>
      </Form>
    </Card>
  )
}

export function ProfilePage() {
  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" description="Quản lý thông tin tài khoản và mật khẩu của bạn." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileInfoCard />
        <ChangePasswordCard />
      </div>
    </>
  )
}
