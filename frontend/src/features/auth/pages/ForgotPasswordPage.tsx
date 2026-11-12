import { ArrowLeftOutlined, MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Form, Input, Result } from 'antd'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/form/FormField'
import { getErrorMessage } from '@/utils/errors'
import { authApi } from '../authApi'
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas'

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await authApi.forgotPassword(values)
      setSentTo(values.email)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  if (sentTo) {
    // Backend luôn trả 204 dù email có tồn tại hay không → không tiết lộ tài khoản nào tồn tại
    return (
      <Result
        status="success"
        title="Kiểm tra hộp thư của bạn"
        subTitle={`Nếu ${sentTo} đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu (hiệu lực 30 phút).`}
        extra={<Link to="/login">Quay lại đăng nhập</Link>}
      />
    )
  }

  return (
    <>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-text-secondary">
        <ArrowLeftOutlined /> Quay lại đăng nhập
      </Link>
      <h1 className="m-0 text-2xl font-bold text-text">Quên mật khẩu</h1>
      <p className="mt-2 mb-8 text-text-secondary">Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark={false} onFinish={onSubmit} component="form" noValidate>
        <FormField
          control={control}
          name="email"
          label="Email"
          render={(f) => <Input {...f} size="large" type="email" autoComplete="email" prefix={<MailOutlined className="text-text-muted" />} />}
        />
        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting}>
          Gửi liên kết
        </Button>
      </Form>
    </>
  )
}
