import { StyleProvider } from '@ant-design/cssinjs'
import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { antdTheme } from '@/theme/antdTheme'
import { ThemeCssVariables } from '@/theme/ThemeCssVariables'
import type { AppStore } from './store'

/**
 * StyleProvider layer: đặt CSS của AntD vào @layer "antd" (khai báo thứ tự trong index.css)
 * để utility Tailwind có thể ghi đè khi cần mà không phải dùng !important.
 */
export function AppProviders({ store, children }: { store: AppStore; children: ReactNode }) {
  return (
    <Provider store={store}>
      <StyleProvider layer>
        <ConfigProvider theme={antdTheme} locale={viVN}>
          <ThemeCssVariables />
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </StyleProvider>
    </Provider>
  )
}
