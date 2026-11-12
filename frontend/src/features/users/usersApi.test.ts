import { describe, expect, it } from 'vitest'
import { toSearchParams } from './usersApi'

describe('toSearchParams', () => {
  it('bỏ tham số rỗng, nối nhiều role bằng dấu phẩy như Backend nhận', () => {
    expect(toSearchParams({ page: 0, size: 20, role: ['STAFF', 'TECHNICIAN'], q: '  an  ', status: undefined })).toEqual({
      page: 0,
      size: 20,
      role: 'STAFF,TECHNICIAN',
      q: 'an',
    })
  })

  it('không gửi q khi chỉ có khoảng trắng và không gửi role rỗng', () => {
    expect(toSearchParams({ q: '   ', role: [] })).toEqual({})
  })
})
