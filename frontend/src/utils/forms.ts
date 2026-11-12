/** Chuỗi rỗng → undefined để Backend nhận là "không nhập" (tránh validation @Pattern/@Email trên chuỗi rỗng). */
export function emptyToUndefined<T extends Record<string, unknown>>(values: T): T {
  const result = { ...values }
  for (const key of Object.keys(result)) {
    const v = result[key]
    if (typeof v === 'string' && v.trim() === '') {
      ;(result as Record<string, unknown>)[key] = undefined
    }
  }
  return result
}
