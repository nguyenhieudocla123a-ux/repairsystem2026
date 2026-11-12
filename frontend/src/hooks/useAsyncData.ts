import { useCallback, useEffect, useState, type DependencyList } from 'react'

export interface AsyncData<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  reload: () => void
}

/**
 * Gọi API khi deps thay đổi, trả về { data, loading, error, reload } – đủ cho 4 trạng thái màn hình
 * (loading / empty / error / data). Bỏ qua kết quả của request cũ nếu deps đổi trước khi nó trả về
 * (tránh race condition: gõ tìm kiếm nhanh, kết quả cũ về sau ghi đè kết quả mới).
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList): AsyncData<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let stale = false
    setLoading(true)
    setError(null)
    loader()
      .then((result) => {
        if (!stale) setData(result)
      })
      .catch((e: unknown) => {
        if (!stale) setError(e)
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps do caller quyết định
  }, [...deps, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  return { data, loading, error, reload }
}
