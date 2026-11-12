import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage, toAppError } from './errors'

function axiosError(status: number | undefined, data?: unknown) {
  const config = { headers: new AxiosHeaders() }
  const response = status ? { status, statusText: '', headers: {}, config, data } : undefined
  return new AxiosError('Request failed', 'ERR', config, undefined, response)
}

describe('errors', () => {
  it('ưu tiên message từ body lỗi chuẩn của Backend', () => {
    const e = axiosError(401, { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' })
    expect(getErrorMessage(e)).toBe('Email hoặc mật khẩu không đúng')
  })

  it('mất kết nối / máy chủ lỗi có thông điệp tiếng Việt', () => {
    expect(getErrorMessage(axiosError(undefined))).toMatch(/Không kết nối được máy chủ/)
    expect(getErrorMessage(axiosError(502, ''))).toMatch(/Máy chủ tạm thời không phản hồi/)
  })

  it('toAppError giữ code + fieldErrors và vẫn đọc được sau khi serialize (Redux)', () => {
    const e = axiosError(400, { code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', fieldErrors: [{ field: 'phone', message: 'Sai' }] })
    const serialized = JSON.parse(JSON.stringify(toAppError(e)))

    expect(serialized).toEqual({ status: 400, code: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ', fieldErrors: [{ field: 'phone', message: 'Sai' }] })
    expect(getErrorMessage(serialized)).toBe('Dữ liệu không hợp lệ')
  })
})
