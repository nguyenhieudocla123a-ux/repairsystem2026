import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { toAppError, type AppError } from '@/utils/errors'
import { authApi } from './authApi'
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from './types'

/**
 * Trạng thái đăng nhập. Access token chỉ nằm trong RAM (Redux), không lưu localStorage (TD-02).
 * F5 → state mất → bootstrapSession gọi /auth/refresh (cookie HttpOnly) để khôi phục phiên.
 */
export type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
}

const initialState: AuthState = { status: 'bootstrapping', user: null, accessToken: null }

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  const { accessToken } = await authApi.refresh()
  const user = await authApi.me().catch(() => null)
  if (!user) throw new Error('Không lấy được thông tin người dùng')
  return { accessToken, user }
})

export const login = createAsyncThunk<AuthResponse, LoginRequest, { rejectValue: AppError }>(
  'auth/login',
  (body, { rejectWithValue }) => authApi.login(body).catch((e: unknown) => rejectWithValue(toAppError(e))),
)

export const register = createAsyncThunk<AuthResponse, RegisterRequest, { rejectValue: AppError }>(
  'auth/register',
  (body, { rejectWithValue }) => authApi.register(body).catch((e: unknown) => rejectWithValue(toAppError(e))),
)

export const logout = createAsyncThunk('auth/logout', async () => {
  // Kể cả khi API lỗi (mất mạng) vẫn xóa phiên phía client
  await authApi.logout().catch(() => undefined)
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    accessTokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload
    },
    sessionExpired(state) {
      state.status = 'anonymous'
      state.user = null
      state.accessToken = null
    },
  },
  extraReducers: (builder) => {
    const authenticated = (state: AuthState, action: PayloadAction<Pick<AuthResponse, 'accessToken' | 'user'>>) => {
      state.status = 'authenticated'
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
    }
    builder
      .addCase(bootstrapSession.fulfilled, authenticated)
      .addCase(bootstrapSession.rejected, (state) => {
        state.status = 'anonymous'
      })
      .addCase(login.fulfilled, authenticated)
      .addCase(register.fulfilled, authenticated)
      .addCase(logout.fulfilled, (state) => {
        state.status = 'anonymous'
        state.user = null
        state.accessToken = null
      })
  },
})

export const { accessTokenRefreshed, sessionExpired } = authSlice.actions
export default authSlice.reducer
