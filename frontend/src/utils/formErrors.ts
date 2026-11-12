import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { getApiError } from './errors'

/**
 * Đưa fieldErrors từ API (400 VALIDATION_FAILED) vào đúng field của form.
 * Trả về true nếu đã gán được ít nhất một lỗi field.
 */
export function applyApiFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]): boolean {
  const apiError = getApiError(error)
  let applied = false
  for (const fe of apiError?.fieldErrors ?? []) {
    if (fields.includes(fe.field)) {
      setError(fe.field as Path<T>, { type: 'server', message: fe.message })
      applied = true
    }
  }
  return applied
}
