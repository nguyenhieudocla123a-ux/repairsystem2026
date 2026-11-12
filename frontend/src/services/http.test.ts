import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureHttpAuth, http } from './http'

/** Adapter giả: token "new" hợp lệ, token khác → 401 TOKEN_EXPIRED. Không gọi mạng thật. */
const fakeAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const auth = AxiosHeaders.from(config.headers).get('Authorization')
  if (auth === 'Bearer new') {
    return { data: { url: config.url }, status: 200, statusText: 'OK', headers: {}, config }
  }
  const response = {
    data: { code: 'TOKEN_EXPIRED', status: 401, message: 'expired', path: config.url, timestamp: '' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  }
  throw new AxiosError('401', 'ERR_BAD_REQUEST', config, undefined, response)
}

describe('http interceptor – refresh token', () => {
  const originalAdapter = http.defaults.adapter
  let token: string
  const refresh = vi.fn()
  const onAuthFailure = vi.fn()

  beforeEach(() => {
    token = 'old'
    refresh.mockReset()
    onAuthFailure.mockReset()
    http.defaults.adapter = fakeAdapter
    configureHttpAuth({ getAccessToken: () => token, refreshAccessToken: refresh, onAuthFailure })
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it('gắn Bearer token vào request', async () => {
    token = 'new'
    const res = await http.get('/ping')
    expect(res.status).toBe(200)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('nhiều request cùng hết hạn chỉ gọi refresh MỘT lần rồi gửi lại tất cả', async () => {
    refresh.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10))
      token = 'new'
      return 'new'
    })

    const results = await Promise.all([http.get('/a'), http.get('/b'), http.get('/c')])

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.data.url)).toEqual(['/a', '/b', '/c'])
    expect(onAuthFailure).not.toHaveBeenCalled()
  })

  it('refresh thất bại → báo đăng xuất và trả lỗi cho caller', async () => {
    refresh.mockRejectedValue(new Error('refresh expired'))

    await expect(http.get('/a')).rejects.toThrow('refresh expired')
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
  })

  it('không refresh khi request đánh dấu skipAuthRefresh (VD chính /auth/login)', async () => {
    await expect(http.post('/auth/login', {}, { skipAuthRefresh: true })).rejects.toBeInstanceOf(AxiosError)
    expect(refresh).not.toHaveBeenCalled()
  })
})
