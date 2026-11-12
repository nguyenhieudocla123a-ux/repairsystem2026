import { CameraOutlined, DeleteOutlined, LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Card, Form, Input, Popconfirm } from 'antd'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { PageHeader } from '@/components/PageHeader'
import { StatusTag } from '@/components/StatusTag'
import { UserAvatar } from '@/components/UserAvatar'
import { ROLE_TAG_CONFIG } from '@/features/users/constants'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { formatDate, formatDateTime } from '@/utils/format'
import { AVATAR_ACCEPT, prepareAvatar } from '@/utils/image'
import { authApi } from '../authApi'
import { credentialsReceived, userUpdated } from '../authSlice'
import { changePasswordSchema, profileSchema, type ChangePasswordForm, type ProfileForm } from '../schemas'

/** Đầu trang hồ sơ: ảnh đại diện lớn + đổi/xóa ảnh, tên, vai trò, thông tin liên hệ. */
function ProfileHero() {
  const user = useAppSelector((s) => s.auth.user)!
  const dispatch = useAppDispatch()
  const { message } = App.useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // chọn lại cùng một file vẫn kích hoạt onChange
    if (!file) return
    setBusy(true)
    try {
      const image = await prepareAvatar(file)
      dispatch(userUpdated(await authApi.uploadAvatar(image)))
      message.success('Đã cập nhật ảnh đại diện')
    } catch (error) {
      message.error(error instanceof Error && !('isAxiosError' in error) ? error.message : getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    setBusy(true)
    try {
      dispatch(userUpdated(await authApi.deleteAvatar()))
      message.success('Đã xóa ảnh đại diện')
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const meta: { icon: ReactNode; text: string }[] = [
    { icon: <MailOutlined />, text: user.email },
    ...(user.phone ? [{ icon: <PhoneOutlined />, text: user.phone }] : []),
  ]

  return (
    <Card className="mb-6 overflow-hidden" styles={{ body: { padding: 0 } }}>
      <div aria-hidden="true" className="h-28 bg-[radial-gradient(120%_140%_at_85%_0%,#0C4A6E_0%,#0B1220_65%)] md:h-32" />
      <div className="flex flex-col gap-5 px-6 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="relative -mt-14 w-fit">
            <span className="block rounded-full bg-surface p-1 shadow-card">
              <UserAvatar userId={user.id} name={user.fullName} version={user.avatarUpdatedAt} size={112} />
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Đổi ảnh đại diện"
              className="focus-ring absolute right-1 bottom-1 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-surface bg-primary text-white shadow-card hover:bg-[var(--rf-primary-hover)] disabled:cursor-wait disabled:opacity-70"
            >
              <CameraOutlined />
            </button>
          </div>
          <div className="min-w-0 pb-1">
            <h2 className="m-0 flex flex-wrap items-center gap-2 text-2xl font-semibold text-text">
              {user.fullName}
              <StatusTag value={user.role} config={ROLE_TAG_CONFIG} size="md" />
            </h2>
            <ul className="mt-2 mb-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm text-text-secondary">
              {meta.map((m) => (
                <li key={m.text} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-text-muted">{m.icon}</span>
                  {m.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <Button icon={<CameraOutlined />} loading={busy} onClick={() => fileRef.current?.click()}>
            {user.avatarUpdatedAt ? 'Đổi ảnh' : 'Tải ảnh lên'}
          </Button>
          {user.avatarUpdatedAt && (
            <Popconfirm title="Xóa ảnh đại diện?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={onRemove}>
              <Button icon={<DeleteOutlined />} danger disabled={busy}>Xóa ảnh</Button>
            </Popconfirm>
          )}
        </div>
      </div>
      <dl className="m-0 grid grid-cols-1 border-t border-border sm:grid-cols-3">
        {[
          ['Thành viên từ', formatDate(user.createdAt)],
          ['Đăng nhập gần nhất', user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'],
          ['Ảnh đại diện', 'JPEG, PNG hoặc WebP · tự cắt vuông 512px'],
        ].map(([k, v], i) => (
          <div key={k} className={`px-6 py-4 ${i > 0 ? 'border-t border-border sm:border-t-0 sm:border-l' : ''}`}>
            <dt className="text-xs font-medium text-text-muted">{k}</dt>
            <dd className="m-0 mt-1 text-sm font-medium text-text">{v}</dd>
          </div>
        ))}
      </dl>
      <input ref={fileRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={onPick} aria-label="Chọn ảnh đại diện" />
    </Card>
  )
}

function SectionTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-primary-bg text-tone-primary-fg">{icon}</span>
      <span>
        <span className="block text-base font-semibold text-text">{title}</span>
        <span className="block text-sm font-normal text-text-secondary">{description}</span>
      </span>
    </div>
  )
}

function ProfileInfoCard() {
  const user = useAppSelector((s) => s.auth.user)!
  const dispatch = useAppDispatch()
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, setError, reset, formState } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user.fullName, phone: user.phone ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const updated = await authApi.updateProfile({ fullName: values.fullName, phone: values.phone || undefined })
      dispatch(userUpdated(updated))
      reset({ fullName: updated.fullName, phone: updated.phone ?? '' })
      message.success('Đã cập nhật hồ sơ')
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, ['fullName', 'phone'])) setFormError(getErrorMessage(error))
    }
  })

  return (
    <Card title={<SectionTitle icon={<UserOutlined />} title="Thông tin cá nhân" description="Tên và số điện thoại hiển thị trên phiếu sửa chữa." />}>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" onFinish={onSubmit} component="form" noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} autoComplete="name" />} />
          <FormField
            control={control}
            name="phone"
            label="Số điện thoại"
            required={user.role === 'CUSTOMER'}
            render={(f) => <Input {...f} type="tel" autoComplete="tel" />}
          />
        </div>
        <Form.Item label="Email đăng nhập" extra="Email dùng để đăng nhập, không tự đổi được. Liên hệ quản trị viên nếu cần thay đổi.">
          <Input value={user.email} disabled aria-label="Email đăng nhập" />
        </Form.Item>
        <div className="flex justify-end gap-2">
          <Button disabled={!formState.isDirty || formState.isSubmitting} onClick={() => reset()}>Hoàn tác</Button>
          <Button type="primary" htmlType="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>
            Lưu thay đổi
          </Button>
        </div>
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
    <Card title={<SectionTitle icon={<LockOutlined />} title="Bảo mật" description="Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác." />}>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" onFinish={onSubmit} component="form" noValidate>
        <FormField control={control} name="currentPassword" label="Mật khẩu hiện tại" required render={(f) => <Input.Password {...f} autoComplete="current-password" />} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="password"
            label="Mật khẩu mới"
            required
            extra="Tối thiểu 8 ký tự, có chữ hoa, chữ thường và số"
            render={(f) => <Input.Password {...f} autoComplete="new-password" />}
          />
          <FormField control={control} name="confirmPassword" label="Nhập lại mật khẩu mới" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
        </div>
        <div className="flex justify-end">
          <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>
            Đổi mật khẩu
          </Button>
        </div>
      </Form>
    </Card>
  )
}

export function ProfilePage() {
  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" description="Ảnh đại diện, thông tin liên hệ và mật khẩu của tài khoản." />
      <ProfileHero />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ProfileInfoCard />
        <ChangePasswordCard />
      </div>
    </>
  )
}
