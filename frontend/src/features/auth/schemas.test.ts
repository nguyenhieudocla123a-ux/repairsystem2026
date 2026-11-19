import { describe, expect, it } from 'vitest'
import { completeProfileSchema, loginSchema, passwordLevel, registerSchema } from './schemas'

const validRegister = {
  email: 'a@gmail.com',
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
    expect(completeProfileSchema.safeParse({ fullName: 'Nguyễn Văn A', phone: '0123' }).success).toBe(false)
    expect(completeProfileSchema.safeParse({ fullName: 'Nguyễn Văn A', phone: '+84901234567' }).success).toBe(true)
  })

  it.each([
    ['', 0],
    ['abc', 1],
    ['abcdefgh1', 1],
    ['Abcdef12', 2],
    ['Abcdef12!xyz', 3],
    ['Abcdefgh123456', 3],
  ] as const)('độ mạnh "%s" = %i', (value, level) => {
    expect(passwordLevel(value)).toBe(level)
  })
})
