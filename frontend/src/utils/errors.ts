import { isAxiosError } from 'axios'
import type { ApiErrorResponse, ErrorCode, FieldError } from '@/types/api'

const FALLBACK = 'Đã có lỗi xảy ra, vui lòng thử lại'

/**
 * Lỗi đã chuẩn hóa, có thể serialize (đưa vào Redux qua rejectWithValue).
 * Lưu ý: createAsyncThunk tự serialize lỗi thành object thường → mất thông tin AxiosError,
 * vì vậy thunk phải chuyển lỗi về dạng này trước khi reject.
 */
export interface AppError {
  status?: number
  code?: ErrorCode
  message: string
  fieldErrors?: FieldError[]
}

function isApiErrorBody(value: unknown): value is ApiErrorResponse {
  return typeof value === 'object' && value !== null && typeof (value as ApiErrorResponse).code === 'string'
}

/** Lấy body lỗi chuẩn của Backend (từ AxiosError hoặc AppError đã chuẩn hóa). */
export function getApiError(error: unknown): Pick<ApiErrorResponse, 'code' | 'message' | 'fieldErrors'> | undefined {
  if (isAxiosError(error)) {
    return isApiErrorBody(error.response?.data) ? error.response.data : undefined
  }
  return isApiErrorBody(error) ? error : undefined
}

export function getErrorCode(error: unknown): ErrorCode | undefined {
  return getApiError(error)?.code
}

/** Thông điệp hiển thị cho người dùng – ưu tiên message từ API, sau đó lỗi mạng / máy chủ. */
export function getErrorMessage(error: unknown): string {
  const apiError = getApiError(error)
  if (apiError?.message) return apiError.message
  if (isAxiosError(error)) {
    if (!error.response) return 'Không kết nối được máy chủ. Kiểm tra mạng hoặc thử lại sau.'
    if (error.response.status >= 500) return 'Máy chủ tạm thời không phản hồi, vui lòng thử lại sau.'
    if (error.response.status === 404) return 'Chức năng chưa sẵn sàng trên máy chủ.'
  }
  if (typeof error === 'object' && error !== null && typeof (error as AppError).message === 'string') {
    return (error as AppError).message || FALLBACK
  }
  return FALLBACK
}

/** Chuyển mọi lỗi về AppError (serialize được). */
export function toAppError(error: unknown): AppError {
  const apiError = getApiError(error)
  return {
    status: isAxiosError(error) ? error.response?.status : undefined,
    code: apiError?.code,
    message: getErrorMessage(error),
    fieldErrors: apiError?.fieldErrors,
  }
}
