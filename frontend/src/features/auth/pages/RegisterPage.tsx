import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { getApiError, getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { register } from '../authSlice'
import { SendCodeButton, VerificationCodeField } from '../components/VerificationCode'
import { SocialButtons } from '../components/SocialButtons'
import { registerSchema, type RegisterForm } from '../schemas'
import { useVerificationCode } from '../useVerificationCode'

const FIELDS = ['fullName', 'email', 'phone', 'password', 'address'] as const

/**
 * Đăng ký trên MỘT form: nhập email → bấm "Gửi mã" (backend lưu mã vào Redis 10 phút, 60 giây mới gửi lại được)
 * → nhập mã 6 số nhận qua email → điền các trường còn lại → Đăng ký. Hoặc đăng ký nhanh bằng Google/Facebook.
 */
export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const verification = useVerificationCode()

  const { control, handleSubmit, setError, trigger, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '', address: '' },
  })
  const email = useWatch({ control, name: 'email' })

  const sendCode = async () => {
    if (!(await trigger('email'))) return
    setFormError(null)
    try {
      await verification.send(email)
    } catch (error) {
      const api = getApiError(error)
      if (api?.code === 'DUPLICATE_RESOURCE' || api?.code === 'VALIDATION_FAILED') {
        setError('email', { type: 'server', message: api.message })
      } else {
        verification.setError(getErrorMessage(error))
      }
    }
  }

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirm, ...body }) => {
    setFormError(null)
    if (!verification.validate(body.email)) return
    try {
      await dispatch(register({ ...body, address: body.address || undefined, verificationCode: verification.code })).unwrap()
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (applyApiFieldErrors(error, setError, FIELDS)) return
      // 400 BAD_REQUEST ở bước này là lỗi mã (sai / hết hạn / quá số lần thử)
      if (getApiError(error)?.code === 'BAD_REQUEST') verification.setError(getErrorMessage(error))
      else setFormError(getErrorMessage(error))
    }
  })

  return (
    <>
      <h1 className="m-0 text-2xl font-bold text-text">Tạo tài khoản khách hàng</h1>
      <p className="mt-2 mb-8 text-text-secondary">Theo dõi tiến độ sửa chữa và bảo hành thiết bị của bạn.</p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark onFinish={onSubmit} component="form" noValidate>
        <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} autoComplete="name" placeholder="Nguyễn Văn A" />} />

        <FormField
          control={control}
          name="email"
          label="Email"
          required
          render={(f) => (
            <div className="flex gap-2">
              <Input {...f} type="email" autoComplete="email" placeholder="ban@vidu.com" className="flex-1" />
              <SendCodeButton state={verification} email={email} onClick={sendCode} />
            </div>
          )}
        />
        <VerificationCodeField state={verification} email={email} />

        <FormField control={control} name="phone" label="Số điện thoại" required render={(f) => <Input {...f} type="tel" autoComplete="tel" placeholder="0901234567" />} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField control={control} name="password" label="Mật khẩu" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
          <FormField control={control} name="confirmPassword" label="Nhập lại mật khẩu" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
        </div>
        <FormField control={control} name="address" label="Địa chỉ" render={(f) => <Input {...f} value={f.value ?? ''} autoComplete="street-address" placeholder="Không bắt buộc" />} />

        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting} className="rf-glow-btn mt-2">
          Đăng ký
        </Button>
      </Form>

      <SocialButtons dividerText="hoặc đăng ký bằng" />

      <p className="mt-6 text-center text-text-secondary">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </>
  )
}
