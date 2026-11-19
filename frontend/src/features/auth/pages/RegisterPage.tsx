import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { getApiError, getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { register } from '../authSlice'
import { CodeVerifyStep } from '../components/CodeVerifyStep'
import { PasswordStrength } from '../components/PasswordStrength'
import { SocialButtons } from '../components/SocialButtons'
import { registerSchema, type RegisterForm } from '../schemas'
import { useVerificationCode } from '../useVerificationCode'

/**
 * Đăng ký khách hàng 2 bước:
 * 1. Email + mật khẩu + nhập lại mật khẩu → "Đăng ký" gửi mã 6 số tới email (Redis 10 phút, 60 giây mới gửi lại).
 * 2. Nhập mã → đúng thì tạo tài khoản, đăng nhập và chuyển vào hệ thống.
 * Họ tên, SĐT bổ sung sau ở trang hồ sơ – hệ thống nhắc khi khách dùng dịch vụ.
 */
export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [step, setStep] = useState<'account' | 'verify'>('account')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const verification = useVerificationCode()

  const { control, handleSubmit, setError, getValues, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    // Cảnh báo khi rời ô lần đầu, sau đó kiểm tra lại ngay khi gõ (VD "Cần ít nhất 1 chữ hoa")
    mode: 'onTouched',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })
  const password = useWatch({ control, name: 'password' })

  /** Bước 1: kiểm tra form rồi gửi mã. Email đã có tài khoản → báo ngay ở ô email. */
  const onSubmitAccount = handleSubmit(async ({ email }) => {
    setFormError(null)
    // Vừa gửi mã cho chính email này (quay lại sửa mật khẩu) → dùng tiếp mã cũ, không gửi lại trước 60 giây
    if (verification.isSentTo(email) && verification.resendIn > 0) {
      setStep('verify')
      return
    }
    try {
      await verification.send(email)
      setStep('verify')
    } catch (error) {
      const api = getApiError(error)
      if (api?.code === 'DUPLICATE_RESOURCE' || api?.code === 'VALIDATION_FAILED') setError('email', { type: 'server', message: api.message })
      else setFormError(getErrorMessage(error))
    }
  })

  const resend = async () => {
    try {
      await verification.send(getValues('email'))
      message.success('Đã gửi lại mã xác nhận')
    } catch (error) {
      verification.setError(getErrorMessage(error))
    }
  }

  /** Bước 2: gửi mã + thông tin tài khoản → backend kiểm tra mã, tạo tài khoản và mở phiên đăng nhập. */
  const complete = async (code: string) => {
    const { email, password: pwd } = getValues()
    setSubmitting(true)
    try {
      await dispatch(register({ email, password: pwd, verificationCode: code })).unwrap()
      message.success('Đăng ký thành công – chào mừng bạn đến với RepairFlow!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const api = getApiError(error)
      // 400 BAD_REQUEST ở bước này là lỗi mã (sai / hết hạn / quá số lần thử)
      if (api?.code === 'BAD_REQUEST') {
        verification.setError(getErrorMessage(error))
        verification.setCode('')
      } else {
        // Lỗi thuộc thông tin tài khoản (email vừa bị dùng, mật khẩu không hợp lệ…) → quay lại bước 1
        setStep('account')
        if (!applyApiFieldErrors(error, setError, ['email', 'password'] as const)) setFormError(getErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'verify') {
    return (
      <CodeVerifyStep
        email={getValues('email')}
        verification={verification}
        submitting={submitting}
        backLabel="Đổi email hoặc mật khẩu"
        onBack={() => { verification.setError(null); setStep('account') }}
        onComplete={(code) => void complete(code)}
        onResend={resend}
      />
    )
  }

  return (
    <>
      <img src="/favicon.svg" alt="" className="mb-5 size-11" />
      <h1 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-text">Tạo tài khoản khách hàng</h1>
      <p className="mt-2 mb-7 text-sm leading-6 text-text-secondary">
        Theo dõi tiến độ sửa chữa và bảo hành thiết bị của bạn.
      </p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark={false} onFinish={onSubmitAccount} component="form" noValidate>
        <FormField
          control={control}
          name="email"
          label="Email"
          render={(f) => <Input {...f} size="large" type="email" autoComplete="email" placeholder="ban@vidu.com" prefix={<MailOutlined className="text-text-muted" />} />}
        />
        <FormField
          control={control}
          name="password"
          label="Mật khẩu"
          render={(f) => <Input.Password {...f} size="large" autoComplete="new-password" placeholder="••••••••" prefix={<LockOutlined className="text-text-muted" />} />}
        />
        <PasswordStrength value={password} />
        <FormField
          control={control}
          name="confirmPassword"
          label="Nhập lại mật khẩu"
          render={(f) => <Input.Password {...f} size="large" autoComplete="new-password" placeholder="••••••••" prefix={<LockOutlined className="text-text-muted" />} />}
        />

        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting || verification.sending} className="rf-glow-btn mt-1">
          Đăng ký
        </Button>
      </Form>

      <SocialButtons dividerText="hoặc đăng ký bằng" />

      <p className="mt-6 mb-0 text-center text-sm text-text-secondary">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </>
  )
}
