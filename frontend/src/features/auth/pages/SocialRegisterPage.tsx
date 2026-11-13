import { FacebookFilled, GoogleOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input, Result, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAppDispatch } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { getApiError, getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { authApi } from '../authApi'
import { completeSocialSignup } from '../authSlice'
import { SendCodeButton, VerificationCodeField } from '../components/VerificationCode'
import { fullNameSchema, phoneSchema } from '../schemas'
import type { PendingSocialSignup } from '../types'
import { useVerificationCode } from '../useVerificationCode'

const schema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  address: z.string().trim().max(255, 'Địa chỉ quá dài').optional(),
})
type SocialRegisterForm = z.infer<typeof schema>
const FIELDS = ['fullName', 'phone', 'address'] as const

const PROVIDER_LABEL = { google: 'Google', facebook: 'Facebook' } as const

/**
 * Hoàn tất đăng ký sau khi chọn Google/Facebook lần đầu: email lấy từ tài khoản mạng xã hội (không sửa được),
 * người dùng gửi mã 6 số về email đó, nhập mã + số điện thoại → tạo tài khoản khách hàng và đăng nhập.
 */
export function SocialRegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingSocialSignup | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const verification = useVerificationCode()

  const { control, handleSubmit, setError, reset, formState } = useForm<SocialRegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', phone: '', address: '' },
  })

  useEffect(() => {
    let alive = true
    authApi
      .oauthPending()
      .then((p) => {
        if (!alive) return
        setPending(p)
        reset({ fullName: p.fullName, phone: '', address: '' })
      })
      .catch((e: unknown) => alive && setLoadError(getErrorMessage(e)))
    return () => {
      alive = false
    }
  }, [reset])

  const sendCode = async () => {
    if (!pending) return
    try {
      await verification.send(pending.email)
    } catch (error) {
      verification.setError(getErrorMessage(error))
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!pending) return
    setFormError(null)
    if (!verification.validate(pending.email)) return
    try {
      await dispatch(completeSocialSignup({ ...values, address: values.address || undefined, verificationCode: verification.code })).unwrap()
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (applyApiFieldErrors(error, setError, FIELDS)) return
      const api = getApiError(error)
      if (api?.code === 'BAD_REQUEST' && !api.message.includes('hết hạn, vui lòng chọn lại')) verification.setError(getErrorMessage(error))
      else setFormError(getErrorMessage(error))
    }
  })

  if (loadError) {
    return (
      <Result
        status="warning"
        title="Phiên đăng ký đã hết hạn"
        subTitle={loadError}
        extra={
          <Link to="/register">
            <Button type="primary">Quay lại đăng ký</Button>
          </Link>
        }
      />
    )
  }
  if (!pending) return <Skeleton active paragraph={{ rows: 6 }} />

  const ProviderIcon = pending.provider === 'google' ? GoogleOutlined : FacebookFilled
  return (
    <>
      <h1 className="m-0 text-2xl font-bold text-text">Hoàn tất đăng ký</h1>
      <p className="mt-2 mb-8 text-text-secondary">
        <ProviderIcon /> Tài khoản {PROVIDER_LABEL[pending.provider]} · xác nhận email và bổ sung số điện thoại.
      </p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark onFinish={onSubmit} component="form" noValidate>
        <Form.Item label="Email" htmlFor="socialEmail">
          <div className="flex gap-2">
            <Input id="socialEmail" value={pending.email} readOnly className="flex-1" />
            <SendCodeButton state={verification} email={pending.email} onClick={sendCode} />
          </div>
        </Form.Item>
        <VerificationCodeField state={verification} email={pending.email} />

        <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} autoComplete="name" />} />
        <FormField control={control} name="phone" label="Số điện thoại" required render={(f) => <Input {...f} type="tel" autoComplete="tel" placeholder="0901234567" />} />
        <FormField control={control} name="address" label="Địa chỉ" render={(f) => <Input {...f} value={f.value ?? ''} autoComplete="street-address" placeholder="Không bắt buộc" />} />

        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting} className="rf-glow-btn mt-2">
          Tạo tài khoản
        </Button>
      </Form>

      <p className="mt-6 text-center text-text-secondary">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </>
  )
}
