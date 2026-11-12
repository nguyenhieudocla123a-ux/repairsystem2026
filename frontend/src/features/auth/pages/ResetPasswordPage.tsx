import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input, Result } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { FormField } from '@/components/form/FormField'
import { getErrorMessage } from '@/utils/errors'
import { authApi } from '../authApi'
import { resetPasswordSchema, type ResetPasswordForm } from '../schemas'

/** Trang mở từ link trong email: /reset-password?token=... */
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  if (!token) {
    return (
      <Result
        status="warning"
        title="Liên kết không hợp lệ"
        subTitle="Liên kết đặt lại mật khẩu thiếu mã xác thực. Vui lòng yêu cầu liên kết mới."
        extra={<Link to="/forgot-password">Yêu cầu liên kết mới</Link>}
      />
    )
  }

  if (done) {
    return (
      <Result
        status="success"
        title="Đã đặt lại mật khẩu"
        subTitle="Bạn có thể đăng nhập bằng mật khẩu mới. Các phiên đăng nhập cũ đã bị đăng xuất."
        extra={<Link to="/login">Đăng nhập</Link>}
      />
    )
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null)
    try {
      await authApi.resetPassword({ token, newPassword: password })
      setDone(true)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <>
      <h1 className="m-0 text-2xl font-bold text-text">Đặt lại mật khẩu</h1>
      <p className="mt-2 mb-8 text-text-secondary">Nhập mật khẩu mới cho tài khoản của bạn.</p>
      {formError && (
        <Alert
          type="error"
          showIcon
          title={formError}
          action={<Link to="/forgot-password">Gửi lại</Link>}
          className="mb-5"
          role="alert"
        />
      )}
      <Form layout="vertical" requiredMark={false} onFinish={onSubmit} component="form" noValidate>
        <FormField
          control={control}
          name="password"
          label="Mật khẩu mới"
          extra="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"
          render={(f) => <Input.Password {...f} size="large" autoComplete="new-password" />}
        />
        <FormField control={control} name="confirmPassword" label="Nhập lại mật khẩu" render={(f) => <Input.Password {...f} size="large" autoComplete="new-password" />} />
        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting}>
          Đặt lại mật khẩu
        </Button>
      </Form>
    </>
  )
}
