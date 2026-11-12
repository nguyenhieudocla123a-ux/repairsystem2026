import { describe, expect, it } from 'vitest'
import { canAccessPath } from './appRoutes'

describe('canAccessPath', () => {
  it('khớp theo vai trò, kể cả trang con và query string', () => {
    expect(canAccessPath('ADMIN', '/users')).toBe(true)
    expect(canAccessPath('CUSTOMER', '/users')).toBe(false)
    expect(canAccessPath('TECHNICIAN', '/repairs/15?tab=parts')).toBe(true)
    expect(canAccessPath('CUSTOMER', '/my/repairs/15')).toBe(true)
  })

  it('đường dẫn không tồn tại → không cho quay lại', () => {
    expect(canAccessPath('ADMIN', '/khong-ton-tai')).toBe(false)
  })
})
