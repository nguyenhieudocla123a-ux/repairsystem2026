import { http } from '@/services/http'
import type { AuthResponse, AuthUser, ForgotPasswordRequest, LoginRequest, RegisterRequest } from './types'

/** Gọi API /auth thật của Backend (endpoint sẽ có ở Mốc 4). */
export const authApi = {
  login: (body: LoginRequest) =>
    http.post<AuthResponse>('/auth/login', body, { skipAuthRefresh: true }).then((r) => r.data),

  register: (body: RegisterRequest) =>
    http.post<AuthResponse>('/auth/register', body, { skipAuthRefresh: true }).then((r) => r.data),

  refresh: () =>
    http.post<Pick<AuthResponse, 'accessToken' | 'expiresIn'>>('/auth/refresh', null, { skipAuthRefresh: true })
      .then((r) => r.data),

  logout: () => http.post<void>('/auth/logout', null, { skipAuthRefresh: true }),

  me: () => http.get<AuthUser>('/auth/me').then((r) => r.data),

  forgotPassword: (body: ForgotPasswordRequest) =>
    http.post<void>('/auth/forgot-password', body, { skipAuthRefresh: true }),
}
