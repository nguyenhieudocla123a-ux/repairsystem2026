import { describe, expect, it } from 'vitest'
import { sessionExpired } from '@/features/auth/authSlice'
import type { AppNotification } from './notificationsApi'
import reducer, { markAllNotificationsRead, notificationLink, notificationReceived } from './notificationsSlice'

const n = (id: number, over: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'REPAIR_STATUS_CHANGED',
  title: `Thông báo ${id}`,
  message: 'm',
  referenceType: 'REPAIR_ORDER',
  referenceId: 5,
  read: false,
  createdAt: '2026-11-12T00:00:00Z',
  ...over,
})

describe('notificationsSlice', () => {
  it('thông báo WebSocket mới lên đầu, tăng số chưa đọc, bỏ trùng id', () => {
    let s = reducer(undefined, notificationReceived(n(1)))
    s = reducer(s, notificationReceived(n(2)))
    s = reducer(s, notificationReceived(n(2)))
    expect(s.latest.map((x) => x.id)).toEqual([2, 1])
    expect(s.unreadCount).toBe(2)
  })

  it('chỉ giữ 10 thông báo mới nhất', () => {
    let s = reducer(undefined, { type: 'init' })
    for (let i = 1; i <= 12; i++) s = reducer(s, notificationReceived(n(i)))
    expect(s.latest).toHaveLength(10)
    expect(s.latest[0].id).toBe(12)
    expect(s.unreadCount).toBe(12)
  })

  it('đánh dấu đã đọc tất cả → 0 chưa đọc', () => {
    let s = reducer(undefined, notificationReceived(n(1)))
    s = reducer(s, { type: markAllNotificationsRead.fulfilled.type })
    expect(s.unreadCount).toBe(0)
    expect(s.latest[0].read).toBe(true)
  })

  it('hết phiên → xóa sạch thông báo của người dùng trước', () => {
    const s = reducer(reducer(undefined, notificationReceived(n(1))), sessionExpired())
    expect(s.latest).toEqual([])
    expect(s.unreadCount).toBe(0)
  })

  it('đường dẫn theo vai trò người nhận', () => {
    expect(notificationLink(n(1), true)).toBe('/my/repairs/5')
    expect(notificationLink(n(1), false)).toBe('/repairs/5')
    expect(notificationLink(n(1, { referenceType: 'PART' }), false)).toBe('/inventory')
    expect(notificationLink(n(1, { referenceType: null }), false)).toBeNull()
  })
})
