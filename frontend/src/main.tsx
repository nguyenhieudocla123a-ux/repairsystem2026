import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AppProviders } from './app/providers'
import { router } from './app/router'
import { store } from './app/store'
import { bootstrapSession } from './features/auth/authSlice'

// Khôi phục phiên từ refresh token cookie (nếu có) trước khi vào khu vực cần đăng nhập
void store.dispatch(bootstrapSession())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders store={store}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
