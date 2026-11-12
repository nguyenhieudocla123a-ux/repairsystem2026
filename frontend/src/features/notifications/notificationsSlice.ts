import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { logout, sessionExpired } from '@/features/auth/authSlice'
import { notificationsApi, type AppNotification } from './notificationsApi'

/**
 * State dùng chung giữa chuông thông báo (header) và trang Thông báo: số chưa đọc + 10 thông báo mới nhất.
 * WebSocket đẩy thông báo mới vào đây (notificationReceived) → mọi nơi cập nhật cùng lúc, không cần gọi lại API.
 */
export interface NotificationsState {
  unreadCount: number
  latest: AppNotification[]
  connected: boolean
}

const initialState: NotificationsState = { unreadCount: 0, latest: [], connected: false }
const LATEST_SIZE = 10

export const loadNotifications = createAsyncThunk('notifications/load', async () => {
  const [page, count] = await Promise.all([notificationsApi.list({ size: LATEST_SIZE }), notificationsApi.unreadCount()])
  return { latest: page.content, unreadCount: count }
})

export const markNotificationRead = createAsyncThunk('notifications/markRead', (id: number) => notificationsApi.markRead(id))

export const markAllNotificationsRead = createAsyncThunk('notifications/markAllRead', () => notificationsApi.markAllRead())

const slice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationReceived(state, action: PayloadAction<AppNotification>) {
      if (state.latest.some((n) => n.id === action.payload.id)) return
      state.latest = [action.payload, ...state.latest].slice(0, LATEST_SIZE)
      if (!action.payload.read) state.unreadCount += 1
    },
    connectionChanged(state, action: PayloadAction<boolean>) {
      state.connected = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.latest = action.payload.latest
        state.unreadCount = action.payload.unreadCount
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const n = state.latest.find((x) => x.id === action.payload.id)
        if (n && !n.read) {
          n.read = true
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.latest.forEach((n) => (n.read = true))
        state.unreadCount = 0
      })
      // Đăng xuất / hết phiên → xóa thông báo của người dùng trước
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export const { notificationReceived, connectionChanged } = slice.actions
export default slice.reducer

/** Đường dẫn mở khi bấm vào thông báo – theo vai trò người nhận. */
export function notificationLink(n: AppNotification, isCustomer: boolean): string | null {
  switch (n.referenceType) {
    case 'REPAIR_ORDER':
      return n.referenceId ? (isCustomer ? `/my/repairs/${n.referenceId}` : `/repairs/${n.referenceId}`) : null
    case 'REPAIR_REQUEST':
      return '/repair-requests'
    case 'PART':
      return '/inventory'
    case 'WARRANTY_CLAIM':
      return '/warranties'
    default:
      return null
  }
}
