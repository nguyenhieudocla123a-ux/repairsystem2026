import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { canAccessPath } from '@/routes/appRoutes'
import { FormField } from '@/components/form/FormField'
import { getErrorMessage } from '@/utils/errors'
import { login } from '../authSlice'
import { SocialButtons } from '../components/SocialButtons'
import { loginSchema, type LoginForm } from '../schemas'

/** Mã lỗi backend gửi về qua ?oauthError= sau khi đăng nhập Google/Facebook không thành. */
const OAUTH_ERRORS: Record<string, string> = {
  CANCELLED: 'Bạn đã huỷ đăng nhập bằng Google/Facebook.',
  STAFF_ACCOUNT: 'Tài khoản nhân viên chỉ đăng nhập bằng email và mật khẩu.',
  EMAIL_EXISTS: 'Email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu (hoặc dùng Quên mật khẩu).',
  EMAIL_REQUIRED: 'Tài khoản mạng xã hội không cung cấp email. Vui lòng đăng ký bằng email.',
  ACCOUNT_LOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  OAUTH_FAILED: 'Đăng nhập bằng Google/Facebook không thành công, vui lòng thử lại.',
}

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const oauthError = searchParams.get('oauthError')
  const [formError, setFormError] = useState<string | null>(oauthError ? (OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.OAUTH_FAILED) : null)

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
      <img src="/favicon.svg" alt="" className="mb-5 size-11" />
      <h1 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-text">Đăng nhập vào RepairFlow</h1>
      <p className="mt-2 mb-7 text-sm leading-6 text-text-secondary">
        Nhân viên dùng tài khoản do cửa hàng cấp. Khách hàng dùng email đã đăng ký để theo dõi máy đang sửa.
      </p>

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

        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting} className="rf-glow-btn">
          Đăng nhập
        </Button>
      </Form>

      <SocialButtons />

      <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" />
        Chưa có tài khoản?
        <span className="h-px flex-1 bg-border" />
      </div>
      <Link to="/register" className="no-underline">
        <Button size="large" block>
          Đăng ký tài khoản khách hàng
        </Button>
      </Link>
      <p className="mt-5 mb-0 text-center text-sm lg:hidden">
        <Link to="/warranty-check">Tra cứu bảo hành không cần đăng nhập</Link>
      </p>
    </>
  )
}
