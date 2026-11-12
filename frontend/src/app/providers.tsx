import { StyleProvider } from '@ant-design/cssinjs'
import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { useMemo, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { antdTheme } from '@/theme/antdTheme'
import { ThemeCssVariables } from '@/theme/ThemeCssVariables'
import { useReducedMotion } from '@/theme/useReducedMotion'
import type { AppStore } from './store'

/**
 * StyleProvider layer: đặt CSS của AntD vào @layer "antd" (khai báo thứ tự trong index.css)
 * để utility Tailwind có thể ghi đè khi cần mà không phải dùng !important.
 */
export function AppProviders({ store, children }: { store: AppStore; children: ReactNode }) {
  // Tôn trọng "giảm chuyển động" của hệ điều hành bằng cơ chế chính thức của AntD (tắt animation một cách an toàn)
  const reducedMotion = useReducedMotion()
  const theme = useMemo(
    () => (reducedMotion ? { ...antdTheme, token: { ...antdTheme.token, motion: false } } : antdTheme),
    [reducedMotion],
  )
  return (
    <Provider store={store}>
      <StyleProvider layer>
        <ConfigProvider theme={theme} locale={viVN}>
          <ThemeCssVariables />
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </StyleProvider>
    </Provider>
  )
}
