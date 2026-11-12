import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorResponse } from '@/types/api'

/**
 * Axios instance dùng chung cho toàn bộ ứng dụng.
 *
 * - Request interceptor: gắn access token (lấy từ Redux qua callback – http không import store để tránh vòng phụ thuộc).
 * - Response interceptor: khi nhận 401 TOKEN_EXPIRED → gọi /auth/refresh MỘT lần (các request khác chờ chung
 *   promise đó), rồi gửi lại request ban đầu. Refresh thất bại → báo cho app đăng xuất.
 * - Refresh token nằm trong cookie HttpOnly nên JS không đọc được; chỉ cần withCredentials.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

export interface HttpAuthBridge {
  getAccessToken: () => string | null
  /** Gọi /auth/refresh, trả về access token mới. Ném lỗi nếu refresh thất bại. */
  refreshAccessToken: () => Promise<string>
  onAuthFailure: () => void
}

let bridge: HttpAuthBridge | null = null
let refreshPromise: Promise<string> | null = null

/** Đăng ký cầu nối với tầng auth (gọi một lần khi khởi động app). */
export function configureHttpAuth(authBridge: HttpAuthBridge): void {
  bridge = authBridge
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; skipAuthRefresh?: boolean }

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Không tự refresh khi 401 (dùng cho chính các API /auth/*). */
    skipAuthRefresh?: boolean
  }
}

http.interceptors.request.use((config) => {
  const token = bridge?.getAccessToken()
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as RetriableConfig | undefined
    const isExpired = error.response?.status === 401 && error.response.data?.code === 'TOKEN_EXPIRED'

    if (!bridge || !original || !isExpired || original._retried || original.skipAuthRefresh) {
      return Promise.reject(error)
    }

    original._retried = true
    try {
      refreshPromise ??= bridge.refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newToken = await refreshPromise
      original.headers.Authorization = `Bearer ${newToken}`
      return http(original)
    } catch (refreshError) {
      bridge.onAuthFailure()
      return Promise.reject(refreshError)
    }
  },
)
