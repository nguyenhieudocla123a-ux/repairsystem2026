import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeStore } from '@/test/render'
import { authApi } from './authApi'
import { bootstrapSession } from './authSlice'
import type { AuthUser } from './types'

const user: AuthUser = {
  id: 7,
  email: 'staff@repairflow.local',
  fullName: 'Lê Thu Ngân',
  phone: null,
  role: 'STAFF',
  status: 'ACTIVE',
  customerId: null,
  lastLoginAt: null,
  createdAt: '2026-11-12T00:00:00Z',
}

describe('bootstrapSession (khôi phục phiên khi F5)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lưu access token mới vào store TRƯỚC khi gọi /auth/me', async () => {
    const store = makeStore({ status: 'bootstrapping' })
    vi.spyOn(authApi, 'refresh').mockResolvedValue({ accessToken: 'fresh-token', expiresIn: 900 })
    let tokenSeenByMe: string | null = null
    vi.spyOn(authApi, 'me').mockImplementation(async () => {
      tokenSeenByMe = store.getState().auth.accessToken // interceptor đọc token từ đây
      return user
    })

    await store.dispatch(bootstrapSession())

    expect(tokenSeenByMe).toBe('fresh-token')
    expect(store.getState().auth).toMatchObject({ status: 'authenticated', accessToken: 'fresh-token', user })
  })

  it('không có cookie refresh hợp lệ → anonymous', async () => {
    const store = makeStore({ status: 'bootstrapping' })
    vi.spyOn(authApi, 'refresh').mockRejectedValue(new Error('401'))

    await store.dispatch(bootstrapSession())

    expect(store.getState().auth).toMatchObject({ status: 'anonymous', user: null, accessToken: null })
  })
})
