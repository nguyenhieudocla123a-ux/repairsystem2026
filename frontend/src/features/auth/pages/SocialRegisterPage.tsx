import { FacebookFilled, GoogleOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, App, Button, Result, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/app/hooks'
import { getApiError, getErrorMessage } from '@/utils/errors'
import { authApi } from '../authApi'
import { completeSocialSignup } from '../authSlice'
import { CodeVerifyStep } from '../components/CodeVerifyStep'
import type { PendingSocialSignup } from '../types'
import { useVerificationCode } from '../useVerificationCode'

const PROVIDER = {
  google: { label: 'Google', icon: <GoogleOutlined /> },
  facebook: { label: 'Facebook', icon: <FacebookFilled className="text-[#1877F2]" /> },
} as const

/**
 * Hoàn tất đăng ký sau khi chọn Google/Facebook lần đầu – giống đăng ký bằng email:
 * gửi mã 6 số về email của tài khoản mạng xã hội → nhập mã → tạo tài khoản khách hàng và đăng nhập.
 * Họ tên lấy từ Google/Facebook; SĐT bổ sung sau ở trang hồ sơ (nhắc khi khách dùng dịch vụ).
 */
export function SocialRegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [pending, setPending] = useState<PendingSocialSignup | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [step, setStep] = useState<'intro' | 'verify'>('intro')
  const [submitting, setSubmitting] = useState(false)
  const verification = useVerificationCode()

  useEffect(() => {
    let alive = true
    authApi
      .oauthPending()
      .then((p) => alive && setPending(p))
      .catch((e: unknown) => alive && setLoadError(getErrorMessage(e)))
    return () => {
      alive = false
    }
  }, [])

  const sendCode = async () => {
    if (!pending) return
    setFormError(null)
    // Vừa gửi mã (quay lại rồi bấm tiếp) → dùng tiếp mã cũ, không gửi lại trước 60 giây
    if (verification.isSentTo(pending.email) && verification.resendIn > 0) {
      setStep('verify')
      return
    }
    try {
      await verification.send(pending.email)
      setStep('verify')
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  }

  const resend = async () => {
    if (!pending) return
    try {
      await verification.send(pending.email)
      message.success('Đã gửi lại mã xác nhận')
    } catch (error) {
      verification.setError(getErrorMessage(error))
    }
  }

  const complete = async (code: string) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await dispatch(completeSocialSignup({ verificationCode: code })).unwrap()
      message.success('Đăng ký thành công – chào mừng bạn đến với RepairFlow!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const api = getApiError(error)
      // 400 là lỗi mã (sai / hết hạn / quá số lần thử); riêng phiên đăng ký hết hạn thì báo chung
      if (api?.code === 'BAD_REQUEST' && !api.message.includes('hết hạn, vui lòng chọn lại')) {
        verification.setError(getErrorMessage(error))
        verification.setCode('')
      } else {
        setFormError(getErrorMessage(error))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <Result
        status="warning"
        title="Phiên đăng ký đã hết hạn"
        subTitle={loadError}
        extra={<Link to="/register"><Button type="primary">Quay lại đăng ký</Button></Link>}
      />
    )
  }
  if (!pending) return <Skeleton active paragraph={{ rows: 5 }} />

  const provider = PROVIDER[pending.provider]

  if (step === 'verify') {
    return (
      <CodeVerifyStep
        email={pending.email}
        verification={verification}
        submitting={submitting}
        formError={formError}
        backLabel="Quay lại"
        onBack={() => { verification.setError(null); setStep('intro') }}
        onComplete={(code) => void complete(code)}
        onResend={resend}
      />
    )
  }

  return (
    <>
      <span aria-hidden="true" className="mb-5 flex size-12 items-center justify-center rounded-xl bg-white text-2xl shadow-card">
        {provider.icon}
      </span>
      <h1 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-text">Hoàn tất đăng ký bằng {provider.label}</h1>
      <p className="mt-2 mb-7 text-sm leading-6 text-text-secondary">
        Xin chào{pending.fullName ? <> <strong className="text-text">{pending.fullName}</strong></> : null}! Xác nhận email để tạo tài khoản.
      </p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3">
        <MailOutlined aria-hidden="true" className="text-lg text-text-muted" />
        <div className="min-w-0">
          <div className="text-xs text-text-muted">Email đăng ký</div>
          <div className="truncate font-medium text-text">{pending.email}</div>
        </div>
      </div>

      <Button type="primary" size="large" block loading={verification.sending} onClick={sendCode} className="rf-glow-btn">
        Gửi mã xác nhận
      </Button>

      <p className="mt-6 mb-0 text-center text-sm">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </>
  )
}
