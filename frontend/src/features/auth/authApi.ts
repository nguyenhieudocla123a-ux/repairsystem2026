import { http } from '@/services/http'
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from './types'

/** API /auth thật của Backend – docs/api-specification.md §2. */
export const authApi = {
  login: (body: LoginRequest) =>
    http.post<AuthResponse>('/auth/login', body, { skipAuthRefresh: true }).then((r) => r.data),

  register: (body: RegisterRequest) =>
    http.post<AuthResponse>('/auth/register', body, { skipAuthRefresh: true }).then((r) => r.data),

  refresh: () =>
    http
      .post<Pick<AuthResponse, 'accessToken' | 'expiresIn'>>('/auth/refresh', null, { skipAuthRefresh: true })
      .then((r) => r.data),

  logout: () => http.post<void>('/auth/logout', null, { skipAuthRefresh: true }),

  me: () => http.get<AuthUser>('/auth/me').then((r) => r.data),

  updateProfile: (body: UpdateProfileRequest) => http.put<AuthUser>('/auth/me', body).then((r) => r.data),
  /** Ảnh đã được thu nhỏ ở client (utils/image.ts) → multipart field `file` */
  uploadAvatar: (image: Blob) => {
    const form = new FormData()
    form.append('file', image, image.type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg')
    return http.put<AuthUser>('/auth/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },
  deleteAvatar: () => http.delete<AuthUser>('/auth/me/avatar').then((r) => r.data),

  /** Backend thu hồi mọi phiên khác và trả phiên mới cho thiết bị hiện tại. */
  changePassword: (body: ChangePasswordRequest) =>
    http.put<AuthResponse>('/auth/me/password', body).then((r) => r.data),

  forgotPassword: (body: ForgotPasswordRequest) =>
    http.post<void>('/auth/forgot-password', body, { skipAuthRefresh: true }),

  resetPassword: (body: ResetPasswordRequest) =>
    http.post<void>('/auth/reset-password', body, { skipAuthRefresh: true }),
}
