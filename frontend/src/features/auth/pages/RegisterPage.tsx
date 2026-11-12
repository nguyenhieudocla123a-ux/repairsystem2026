import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { FormField } from '@/components/form/FormField'
import { getErrorMessage } from '@/utils/errors'
import { applyApiFieldErrors } from '@/utils/formErrors'
import { register } from '../authSlice'
import { registerSchema, type RegisterForm } from '../schemas'

const FIELDS = ['fullName', 'email', 'phone', 'password', 'address'] as const

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const { control, handleSubmit, setError, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '', address: '' },
  })

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirm, ...body }) => {
    setFormError(null)
    try {
      await dispatch(register({ ...body, address: body.address || undefined })).unwrap()
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (!applyApiFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <>
      <h1 className="m-0 text-2xl font-bold text-text">Tạo tài khoản khách hàng</h1>
      <p className="mt-2 mb-8 text-text-secondary">Theo dõi tiến độ sửa chữa và bảo hành thiết bị của bạn.</p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark onFinish={onSubmit} component="form" noValidate>
        <FormField control={control} name="fullName" label="Họ và tên" required render={(f) => <Input {...f} autoComplete="name" placeholder="Nguyễn Văn A" />} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField control={control} name="email" label="Email" required render={(f) => <Input {...f} type="email" autoComplete="email" placeholder="ban@vidu.com" />} />
          <FormField control={control} name="phone" label="Số điện thoại" required render={(f) => <Input {...f} type="tel" autoComplete="tel" placeholder="0901234567" />} />
        </div>
        <FormField
          control={control}
          name="password"
          label="Mật khẩu"
          required
          extra="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"
          render={(f) => <Input.Password {...f} autoComplete="new-password" />}
        />
        <FormField control={control} name="confirmPassword" label="Nhập lại mật khẩu" required render={(f) => <Input.Password {...f} autoComplete="new-password" />} />
        <FormField control={control} name="address" label="Địa chỉ" render={(f) => <Input {...f} value={f.value ?? ''} autoComplete="street-address" placeholder="Không bắt buộc" />} />

        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting} className="mt-2">
          Đăng ký
        </Button>
      </Form>

      <p className="mt-6 text-center text-text-secondary">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </>
  )
}
