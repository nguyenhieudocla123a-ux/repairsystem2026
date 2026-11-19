import { IdcardOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Form, Input, Modal } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { PROFILE_INCOMPLETE_EVENT } from '@/services/http'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { authApi } from '../authApi'
import { userUpdated } from '../authSlice'
import { completeProfileSchema, type CompleteProfileForm } from '../schemas'
import type { AuthUser } from '../types'
import { ProfileGateContext, isProfileComplete, useProfileGate } from '../profileGate'

/**
 * Bọc khu vực đã đăng nhập: cung cấp requireProfile cho các nút dịch vụ của khách, đồng thời mở hộp hoàn tất hồ sơ
 * khi API trả PROFILE_INCOMPLETE (phòng trường hợp nút nào đó chưa kiểm tra trước).
 */
export function ProfileGateProvider({ children }: { children: ReactNode }) {
  const user = useAppSelector((s) => s.auth.user)
  const complete = isProfileComplete(user)
  const [open, setOpen] = useState(false)
  const pending = useRef<(() => void) | undefined>(undefined)

  const requireProfile = useCallback((action?: () => void) => {
    if (complete) {
      action?.()
      return
    }
    pending.current = action
    setOpen(true)
  }, [complete])

  useEffect(() => {
    const onIncomplete = () => setOpen(true)
    window.addEventListener(PROFILE_INCOMPLETE_EVENT, onIncomplete)
    return () => window.removeEventListener(PROFILE_INCOMPLETE_EVENT, onIncomplete)
  }, [])

  const value = useMemo(() => ({ complete, requireProfile }), [complete, requireProfile])

  return (
    <ProfileGateContext.Provider value={value}>
      {children}
      {open && user && (
        <CompleteProfileModal
          user={user}
          onClose={() => { pending.current = undefined; setOpen(false) }}
          onSaved={() => {
            setOpen(false)
            const action = pending.current
            pending.current = undefined
            action?.()
          }}
        />
      )}
    </ProfileGateContext.Provider>
  )
}

/** Hộp nhập họ tên + SĐT (PUT /auth/me) – backend đồng bộ sang hồ sơ khách hàng. */
function CompleteProfileModal({ user, onClose, onSaved }: { user: AuthUser; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch()
  const { message } = App.useApp()
  const [formError, setFormError] = useState<string | null>(null)
  // Họ tên tạm lấy từ email lúc đăng ký → để trống cho khách nhập tên thật
  const placeholderName = user.fullName === user.email.split('@')[0]
  const { control, handleSubmit, setError, formState } = useForm<CompleteProfileForm>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: { fullName: placeholderName ? '' : user.fullName, phone: user.phone ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      dispatch(userUpdated(await authApi.updateProfile({ fullName: values.fullName.trim(), phone: values.phone.trim() })))
      message.success('Đã hoàn tất hồ sơ')
      onSaved()
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, ['fullName', 'phone'] as const)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <Modal open onCancel={onClose} footer={null} width={440} maskClosable={false} destroyOnHidden
      title={<span className="flex items-center gap-2"><IdcardOutlined aria-hidden="true" /> Hoàn tất hồ sơ</span>}>
      <p className="mt-0 mb-5 text-sm leading-6 text-text-secondary">
        Cửa hàng cần họ tên và số điện thoại để liên hệ khi tiếp nhận, báo giá và trả máy. Bạn chỉ cần nhập một lần.
      </p>
      {formError && <Alert type="error" showIcon title={formError} className="mb-4" role="alert" />}
      <Form layout="vertical" requiredMark={false} component="form" noValidate onFinish={onSubmit}>
        <FormField control={control} name="fullName" label="Họ và tên"
          render={(f) => <Input {...f} size="large" autoComplete="name" placeholder="Nguyễn Văn A" prefix={<UserOutlined className="text-text-muted" />} autoFocus />} />
        <FormField control={control} name="phone" label="Số điện thoại"
          render={(f) => <Input {...f} size="large" type="tel" inputMode="tel" autoComplete="tel" placeholder="0901234567" prefix={<PhoneOutlined className="text-text-muted" />} />} />
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose}>Để sau</Button>
          <Button type="primary" htmlType="submit" loading={formState.isSubmitting}>Lưu và tiếp tục</Button>
        </div>
      </Form>
    </Modal>
  )
}

/** Dải nhắc trên đầu trang cho khách chưa hoàn tất hồ sơ. */
export function ProfileIncompleteBanner() {
  const { complete, requireProfile } = useProfileGate()
  if (complete) return null
  return (
    <Alert
      type="warning"
      showIcon
      className="mb-5"
      title="Hồ sơ của bạn chưa đủ thông tin"
      description="Thêm họ tên và số điện thoại để gửi yêu cầu sửa chữa, thêm thiết bị, xác nhận báo giá và yêu cầu bảo hành."
      action={<Button size="small" type="primary" onClick={() => requireProfile()}>Hoàn tất ngay</Button>}
    />
  )
}
