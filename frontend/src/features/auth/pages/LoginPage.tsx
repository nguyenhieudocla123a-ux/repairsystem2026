import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { canAccessPath } from '@/routes/appRoutes'
import { FormField } from '@/components/form/FormField'
import { getErrorMessage } from '@/utils/errors'
import { login } from '../authSlice'
import { loginSchema, type LoginForm } from '../schemas'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { user } = await dispatch(login(values)).unwrap()
      // Chỉ quay lại trang định vào trước đó nếu vai trò vừa đăng nhập được phép xem (tránh vừa vào đã gặp 403)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && canAccessPath(user.role, from) ? from : '/dashboard', { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <>
      <h1 className="m-0 text-2xl font-bold text-text">Đăng nhập</h1>
      <p className="mt-2 mb-8 text-text-secondary">Chào mừng trở lại! Vui lòng nhập thông tin tài khoản.</p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark={false} onFinish={onSubmit} component="form" noValidate>
        <FormField
          control={control}
          name="email"
          label="Email"
          render={(field) => (
            <Input {...field} size="large" type="email" autoComplete="email" prefix={<MailOutlined className="text-text-muted" />} placeholder="ban@vidu.com" />
          )}
        />
        <FormField
          control={control}
          name="password"
          label="Mật khẩu"
          render={(field) => (
            <Input.Password {...field} size="large" autoComplete="current-password" prefix={<LockOutlined className="text-text-muted" />} placeholder="••••••••" />
          )}
        />

        <div className="-mt-2 mb-6 text-right">
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>

        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting}>
          Đăng nhập
        </Button>
      </Form>

      <p className="mt-6 text-center text-text-secondary">
        Chưa có tài khoản? <Link to="/register">Đăng ký khách hàng</Link>
      </p>
    </>
  )
}
