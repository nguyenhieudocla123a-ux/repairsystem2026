import { ArrowLeftOutlined, SafetyOutlined } from '@ant-design/icons'
import { Alert, Button, Form, Input } from 'antd'
import { useEffect, useRef } from 'react'
import { CODE_LENGTH, type VerificationCodeState } from '../useVerificationCode'

/** Ẩn bớt email khi hiển thị: nguyenvana@gmail.com → ng•••••a@gmail.com */
function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain || name.length <= 3) return email
  return `${name.slice(0, 2)}${'•'.repeat(Math.min(6, name.length - 3))}${name.slice(-1)}@${domain}`
}

/**
 * Bước nhập mã 6 số đã gửi về email (dùng chung cho đăng ký email và đăng ký Google/Facebook):
 * nhập/dán đủ 6 số là tự gửi, "Gửi lại mã" sau 60 giây.
 */
export function CodeVerifyStep({ email, verification, submitting, formError, backLabel, onBack, onComplete, onResend }: {
  email: string
  verification: VerificationCodeState
  submitting: boolean
  formError?: string | null
  backLabel: string
  onBack: () => void
  onComplete: (code: string) => void
  onResend: () => void
}) {
  const otpRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    otpRef.current?.querySelector('input')?.focus()
  }, [])

  const submit = (code: string) => {
    if (code.length !== CODE_LENGTH) {
      verification.setError(`Vui lòng nhập đủ ${CODE_LENGTH} chữ số`)
      return
    }
    onComplete(code)
  }

  return (
    <>
      <button type="button" onClick={onBack}
        className="focus-ring mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded border-0 bg-transparent p-0 text-sm text-text-secondary hover:text-text">
        <ArrowLeftOutlined aria-hidden="true" /> {backLabel}
      </button>
      <span aria-hidden="true" className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-xl text-primary">
        <SafetyOutlined />
      </span>
      <h1 className="m-0 text-2xl leading-8 font-semibold tracking-tight text-text">Xác nhận email</h1>
      <p className="mt-2 mb-7 text-sm leading-6 text-text-secondary">
        Nhập mã {CODE_LENGTH} chữ số vừa gửi tới <strong className="text-text" title={email}>{maskEmail(email)}</strong>.
      </p>

      {formError && <Alert type="error" showIcon title={formError} className="mb-5" role="alert" />}

      <Form layout="vertical" requiredMark={false} component="form" noValidate onFinish={() => submit(verification.code)}>
        <Form.Item
          label="Mã xác nhận"
          htmlFor="verificationCode"
          validateStatus={verification.error ? 'error' : undefined}
          help={verification.error ? <span role="alert">{verification.error}</span> : undefined}
        >
          <div ref={otpRef}>
            <Input.OTP
              id="verificationCode"
              size="large"
              length={CODE_LENGTH}
              value={verification.code}
              disabled={submitting}
              formatter={(v) => v.replace(/\D/g, '')}
              aria-label={`Mã xác nhận gồm ${CODE_LENGTH} chữ số`}
              onChange={(value) => {
                verification.setCode(value)
                verification.setError(null)
                // Nhập đủ 6 số (gõ hoặc dán) → tự hoàn tất, không cần bấm nút
                if (value.length === CODE_LENGTH) submit(value)
              }}
            />
          </div>
        </Form.Item>

        <Button type="primary" htmlType="submit" size="large" block loading={submitting} className="rf-glow-btn">
          Xác nhận và hoàn tất đăng ký
        </Button>
      </Form>

      <p className="mt-5 mb-0 text-center text-sm text-text-secondary" aria-live="polite">
        Chưa nhận được mã?{' '}
        {verification.resendIn > 0 ? (
          <span className="tabular-nums text-text-muted">Gửi lại sau {verification.resendIn}s</span>
        ) : (
          <Button type="link" size="small" className="!p-0" loading={verification.sending} onClick={onResend}>Gửi lại mã</Button>
        )}
      </p>
    </>
  )
}
