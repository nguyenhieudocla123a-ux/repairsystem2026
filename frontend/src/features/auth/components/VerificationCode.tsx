import { CheckCircleFilled, SendOutlined } from '@ant-design/icons'
import { Button, Form, Input } from 'antd'
import { CODE_LENGTH, type VerificationCodeState } from '../useVerificationCode'

/** Nút "Gửi mã" cạnh ô email: đếm ngược 60 giây trước khi cho gửi lại. */
export function SendCodeButton({ state, email, onClick }: { state: VerificationCodeState; email: string; onClick: () => void }) {
  const label = state.resendIn > 0 ? `Gửi lại (${state.resendIn}s)` : state.isSentTo(email) ? 'Gửi lại mã' : 'Gửi mã'
  return (
    <Button icon={<SendOutlined />} loading={state.sending} disabled={state.resendIn > 0} onClick={onClick} className="shrink-0 tabular-nums">
      {label}
    </Button>
  )
}

/** Ô nhập mã 6 số – chỉ mở khi đã gửi mã tới đúng email đang nhập. */
export function VerificationCodeField({ state, email }: { state: VerificationCodeState; email: string }) {
  const sent = state.isSentTo(email)
  return (
    <Form.Item
      label="Mã xác nhận"
      htmlFor="verificationCode"
      required
      validateStatus={state.error ? 'error' : undefined}
      help={
        state.error ??
        (sent ? (
          <span className="text-emerald-400">
            <CheckCircleFilled /> Đã gửi mã tới {state.sentTo}
          </span>
        ) : undefined)
      }
    >
      <Input.OTP
        id="verificationCode"
        length={CODE_LENGTH}
        value={state.code}
        disabled={!sent}
        onChange={(value) => {
          state.setCode(value)
          state.setError(null)
        }}
        formatter={(v) => v.replace(/\D/g, '')}
        aria-label="Mã xác nhận gồm 6 chữ số"
      />
    </Form.Item>
  )
}
