type ParamValue = string | number | boolean | undefined | null | readonly (string | number)[]

/**
 * Bỏ tham số rỗng (undefined, null, '', mảng rỗng) và nối mảng bằng dấu phẩy ("RECEIVED,INSPECTING")
 * – đúng định dạng Spring nhận cho List<Enum>.
 */
export function cleanParams<T extends object>(input: T): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(input) as [string, ParamValue][]) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length) result[key] = value.join(',')
      continue
    }
    if (typeof value === 'string') {
      if (value.trim()) result[key] = value.trim()
      continue
    }
    result[key] = value as number | boolean
  }
  return result
}

/** Ghép tham số sort của AntD Table thành "field,asc|desc" cho Spring. */
export function toSortParam(field: unknown, order: 'ascend' | 'descend' | null | undefined, allowed: ReadonlySet<string>) {
  return typeof field === 'string' && allowed.has(field) && order ? `${field},${order === 'ascend' ? 'asc' : 'desc'}` : undefined
}
