import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import type { AppStore } from '@/app/store'
import authReducer, { type AuthState } from '@/features/auth/authSlice'
import notificationsReducer from '@/features/notifications/notificationsSlice'

export function makeStore(auth?: Partial<AuthState>): AppStore {
  const preloaded: AuthState = { status: 'anonymous', user: null, accessToken: null, ...auth }
  return configureStore({
    reducer: { auth: authReducer, notifications: notificationsReducer },
    preloadedState: { auth: preloaded },
  }) as AppStore
}

/** Render một element (hoặc bộ route) với Redux + AntD + Router trong bộ nhớ. */
export function renderWithProviders(
  ui: ReactElement | RouteObject[],
  { store = makeStore(), initialPath = '/' }: { store?: AppStore; initialPath?: string } = {},
) {
  const routes: RouteObject[] = Array.isArray(ui) ? ui : [{ path: '*', element: ui }]
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return {
    store,
    router,
    ...render(
      <AppProviders store={store}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  }
}
