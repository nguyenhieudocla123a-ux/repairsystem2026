/** Kiểu dữ liệu dùng chung khớp với docs/api-specification.md §1. */

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface FieldError {
  field: string
  message: string
}

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'ACCESS_DENIED'
  | 'ACCOUNT_LOCKED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DUPLICATE_RESOURCE'
  | 'INVALID_STATUS_TRANSITION'
  | 'INSUFFICIENT_STOCK'
  | 'CONCURRENT_MODIFICATION'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'

/** Định dạng lỗi chuẩn của Backend (ApiErrorResponse.java). */
export interface ApiErrorResponse {
  timestamp: string
  status: number
  code: ErrorCode
  message: string
  path: string
  fieldErrors?: FieldError[]
}

/** Tham số phân trang/sắp xếp gửi lên Backend. */
export interface PageQuery {
  page?: number
  size?: number
  sort?: string
}
