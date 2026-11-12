import { configureStore } from '@reduxjs/toolkit'
import authReducer, { accessTokenRefreshed, sessionExpired } from '@/features/auth/authSlice'
import { authApi } from '@/features/auth/authApi'
import { configureHttpAuth } from '@/services/http'

export function createStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  })
}

export const store = createStore()

// Cầu nối Axios ↔ Redux: http.ts không import store, tránh phụ thuộc vòng.
configureHttpAuth({
  getAccessToken: () => store.getState().auth.accessToken,
  refreshAccessToken: async () => {
    const { accessToken } = await authApi.refresh()
    store.dispatch(accessTokenRefreshed(accessToken))
    return accessToken
  },
  onAuthFailure: () => store.dispatch(sessionExpired()),
})

export type AppStore = ReturnType<typeof createStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
