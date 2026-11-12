import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './schemas'

const validRegister = {
  fullName: 'Nguyễn Văn A',
  email: 'a@gmail.com',
  phone: '0901234567',
  password: 'Abc12345',
  confirmPassword: 'Abc12345',
}

describe('auth schemas', () => {
  it('login yêu cầu email hợp lệ', () => {
    const result = loginSchema.safeParse({ email: 'abc', password: 'x' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Email không hợp lệ')
  })

  it('register hợp lệ', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true)
  })

  it.each([
    ['abcdefgh1', 'Cần ít nhất 1 chữ hoa'],
    ['ABCDEFGH1', 'Cần ít nhất 1 chữ thường'],
    ['Abcdefghi', 'Cần ít nhất 1 chữ số'],
    ['Ab1', 'Mật khẩu tối thiểu 8 ký tự'],
  ])('mật khẩu "%s" bị từ chối: %s', (password, message) => {
    const result = registerSchema.safeParse({ ...validRegister, password, confirmPassword: password })
    expect(result.error?.issues.map((i) => i.message)).toContain(message)
  })

  it('mật khẩu nhập lại phải khớp', () => {
    const result = registerSchema.safeParse({ ...validRegister, confirmPassword: 'Other1234' })
    expect(result.error?.issues[0].path).toEqual(['confirmPassword'])
  })

  it('số điện thoại Việt Nam', () => {
    expect(registerSchema.safeParse({ ...validRegister, phone: '0123' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...validRegister, phone: '+84901234567' }).success).toBe(true)
  })
})
