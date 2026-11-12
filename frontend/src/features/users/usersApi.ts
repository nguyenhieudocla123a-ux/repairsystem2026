import type { AuthUser } from '@/features/auth/types'
import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import type { Role, UserStatus } from '@/types/enums'
import type { InternalRole } from './constants'

export type UserResponse = AuthUser

export interface UserSearchQuery extends PageQuery {
  role?: Role[]
  status?: UserStatus
  q?: string
}

export interface CreateUserRequest {
  email: string
  fullName: string
  phone?: string
  role: InternalRole
  password: string
}

export interface UpdateUserRequest {
  fullName: string
  phone?: string
  role: Role
}

export interface TechnicianOption {
  id: number
  fullName: string
  activeTaskCount: number
}

/** Bỏ tham số rỗng; mảng role gửi dạng "STAFF,TECHNICIAN" như Backend nhận. */
export function toSearchParams(query: UserSearchQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (query.page !== undefined) params.page = query.page
  if (query.size !== undefined) params.size = query.size
  if (query.sort) params.sort = query.sort
  if (query.role?.length) params.role = query.role.join(',')
  if (query.status) params.status = query.status
  if (query.q?.trim()) params.q = query.q.trim()
  return params
}

/** API /users (ADMIN) – docs/api-specification.md §3 */
export const usersApi = {
  search: (query: UserSearchQuery) =>
    http.get<PageResponse<UserResponse>>('/users', { params: toSearchParams(query) }).then((r) => r.data),
  create: (body: CreateUserRequest) => http.post<UserResponse>('/users', body).then((r) => r.data),
  update: (id: number, body: UpdateUserRequest) => http.put<UserResponse>(`/users/${id}`, body).then((r) => r.data),
  updateStatus: (id: number, status: UserStatus) =>
    http.patch<UserResponse>(`/users/${id}/status`, { status }).then((r) => r.data),
  resetPassword: (id: number, newPassword: string) => http.post<void>(`/users/${id}/reset-password`, { newPassword }),
  technicians: () => http.get<TechnicianOption[]>('/users/technicians').then((r) => r.data),
}
