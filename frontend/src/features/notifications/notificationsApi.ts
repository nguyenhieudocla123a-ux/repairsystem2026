import { http } from '@/services/http'
import type { PageQuery, PageResponse } from '@/types/api'
import { cleanParams } from '@/utils/params'

export type NotificationType =
  | 'REPAIR_STATUS_CHANGED'
  | 'QUOTATION_SENT'
  | 'QUOTATION_APPROVED'
  | 'QUOTATION_REJECTED'
  | 'REPAIR_ASSIGNED'
  | 'REPAIR_COMPLETED'
  | 'LOW_STOCK'
  | 'REPAIR_REQUEST_CREATED'
  | 'WARRANTY_CLAIM_CREATED'

/** NotificationResponse – cũng là payload đẩy qua STOMP /user/queue/notifications */
export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  message: string
  referenceType: 'REPAIR_ORDER' | 'REPAIR_REQUEST' | 'PART' | 'WARRANTY_CLAIM' | null
  referenceId: number | null
  read: boolean
  createdAt: string
}

export const notificationsApi = {
  list: (query: PageQuery & { unreadOnly?: boolean }) =>
    http.get<PageResponse<AppNotification>>('/notifications', { params: cleanParams(query) }).then((r) => r.data),
  unreadCount: () => http.get<{ count: number }>('/notifications/unread-count').then((r) => r.data.count),
  markRead: (id: number) => http.patch<AppNotification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => http.patch<{ updated: number }>('/notifications/read-all').then((r) => r.data),
}
