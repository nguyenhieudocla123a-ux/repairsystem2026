import { useEffect, useState } from 'react'
import { authApi } from './authApi'

export const CODE_LENGTH = 6
const secondsFromNow = (seconds: number) => Date.now() + seconds * 1000

/** Đếm ngược theo giây tới một mốc thời gian (nút "Gửi lại (Ns)"). */
function useSecondsUntil(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline === null) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [deadline])
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))
}

/**
 * Trạng thái mã xác nhận 6 số gửi qua email (dùng chung cho đăng ký thường và đăng ký Google/Facebook).
 * Backend lưu mã trong Redis 10 phút, chỉ cho gửi lại sau 60 giây – nút gửi đếm ngược theo resendAfter backend trả về.
 */
export function useVerificationCode() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  /** Email đã được gửi mã (đã chuẩn hoá chữ thường) */
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const resendIn = useSecondsUntil(resendAt)

  /** Gửi mã; lỗi được ném lại để trang quyết định hiển thị ở đâu (ô email hay ô mã). */
  const send = async (email: string) => {
    const target = email.trim().toLowerCase()
    setSending(true)
    setError(null)
    try {
      const sent = await authApi.sendRegistrationCode(target)
      setSentTo(target)
      setCode('')
      setResendAt(secondsFromNow(sent.resendAfter))
    } finally {
      setSending(false)
    }
  }

  const isSentTo = (email: string) => sentTo !== null && sentTo === email.trim().toLowerCase()

  /** Kiểm tra trước khi gửi form; trả về false (và đặt lỗi) nếu chưa gửi mã hoặc nhập thiếu số. */
  const validate = (email: string) => {
    if (!isSentTo(email)) {
      setError('Vui lòng bấm "Gửi mã" để nhận mã xác nhận qua email')
      return false
    }
    if (code.length !== CODE_LENGTH) {
      setError(`Vui lòng nhập đủ ${CODE_LENGTH} chữ số`)
      return false
    }
    return true
  }

  return { code, setCode, error, setError, sentTo, sending, resendIn, send, isSentTo, validate }
}

export type VerificationCodeState = ReturnType<typeof useVerificationCode>
