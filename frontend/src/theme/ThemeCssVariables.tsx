import { colors } from './tokens'

/** "primaryHover" → "primary-hover" */
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/**
 * Xuất token màu ra CSS variables ở :root (--rf-*), để Tailwind (@theme trong index.css) dùng chung
 * đúng giá trị với AntD. AntD v6 chỉ gắn biến --ant-* trên từng component nên không dùng được cho Tailwind.
 */
export const themeCssText = `:root{${Object.entries(colors)
  .map(([name, value]) => `--rf-${kebab(name)}:${value};`)
  .join('')}}`

export function ThemeCssVariables() {
  return <style data-rf-theme>{themeCssText}</style>
}
