import { ArrowLeftOutlined, CheckCircleFilled, KeyOutlined, MailOutlined } from '@ant-design/icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, App, Button, Form, Input } from 'antd'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { FormField } from '@/components/form/FormField'
import { getErrorMessage } from '@/utils/errors'
import { authApi } from '../authApi'
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas'

const RESEND_SECONDS = 60

/** Webmail phổ biến → nút "Mở hộp thư" đi thẳng tới đó. */
function webmailUrl(email: string): { label: string; url: string } | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (domain === 'gmail.com' || domain === 'googlemail.com') return { label: 'Mở Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' }
  if (domain && /^(outlook|hotmail|live|msn)\./.test(domain)) return { label: 'Mở Outlook', url: 'https://outlook.live.com/mail/' }
  if (domain?.startsWith('yahoo.')) return { label: 'Mở Yahoo Mail', url: 'https://mail.yahoo.com/' }
  return null
}

function useCountdown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])
  return [left, () => setLeft(RESEND_SECONDS)] as const
}

/**
 * Quên mật khẩu: gửi liên kết đặt lại (hiệu lực 30 phút) qua email.
 * Backend luôn trả 204 dù email có tài khoản hay không → màn xác nhận dùng câu chữ trung tính (không lộ tài khoản).
 */
export function ForgotPasswordPage() {
  const { message } = App.useApp()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resendIn, startCountdown] = useCountdown()
  const { control, handleSubmit, formState } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await authApi.forgotPassword(values)
      setSentTo(values.email.trim())
      startCountdown()
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  const resend = async () => {
    if (!sentTo) return
    setResending(true)
    try {
      await authApi.forgotPassword({ email: sentTo })
      startCountdown()
      message.success('Đã gửi lại email đặt lại mật khẩu')
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setResending(false)
    }
  }

  if (sentTo) {
    const webmail = webmailUrl(sentTo)
    return (
      <div role="status" aria-live="polite">
        <span aria-hidden="true" className="mb-5 flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 text-xl text-emerald-500">
          <CheckCircleFilled />
        </span>
        <h1 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-text">Đã gửi email đặt lại mật khẩu</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-text-secondary">
          Nếu <strong className="text-text">{sentTo}</strong> là email đã đăng ký, bạn sẽ nhận được thư <em>“[RepairFlow] Đặt lại mật khẩu”</em> trong
          vài phút. Mở liên kết trong thư để đặt mật khẩu mới – liên kết có hiệu lực 30 phút và chỉ dùng được một lần.
        </p>

        <ol className="m-0 mb-6 flex list-none flex-col gap-2 rounded-xl border border-border bg-bg/40 p-4 text-sm text-text-secondary">
          <li className="flex gap-2"><span className="font-semibold text-primary tabular-nums">1</span> Mở hộp thư của email trên.</li>
          <li className="flex gap-2"><span className="font-semibold text-primary tabular-nums">2</span> Không thấy thư? Xem mục Spam / Quảng cáo.</li>
          <li className="flex gap-2"><span className="font-semibold text-primary tabular-nums">3</span> Bấm liên kết trong thư và đặt mật khẩu mới.</li>
        </ol>

        {webmail && (
          <Button type="primary" size="large" block icon={<MailOutlined />} href={webmail.url} target="_blank" rel="noopener noreferrer" className="rf-glow-btn mb-3">
            {webmail.label}
          </Button>
        )}
        <Button size="large" block disabled={resendIn > 0} loading={resending} onClick={resend} className="tabular-nums">
          {resendIn > 0 ? `Gửi lại email sau ${resendIn}s` : 'Gửi lại email'}
        </Button>

        <p className="mt-6 mb-0 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          <button type="button" onClick={() => setSentTo(null)} className="focus-ring cursor-pointer rounded border-0 bg-transparent p-0 text-primary hover:underline">
            Dùng email khác
          </button>
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary">
        <ArrowLeftOutlined aria-hidden="true" /> Quay lại đăng nhập
      </Link>
      <span aria-hidden="true" className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-xl text-primary">
        <KeyOutlined />
      </span>
      <h1 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-text">Quên mật khẩu</h1>
      <p className="mt-2 mb-7 text-sm leading-6 text-text-secondary">
        Nhập email tài khoản, chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới.
      </p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark={false} onFinish={onSubmit} component="form" noValidate>
        <FormField
          control={control}
          name="email"
          label="Email"
          render={(f) => <Input {...f} size="large" type="email" autoComplete="email" placeholder="ban@vidu.com" prefix={<MailOutlined className="text-text-muted" />} />}
        />
        <Button type="primary" htmlType="submit" size="large" block loading={formState.isSubmitting} className="rf-glow-btn">
          Gửi liên kết đặt lại
        </Button>
      </Form>
    </>
  )
}
