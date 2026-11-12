import { Client } from '@stomp/stompjs'
import { App } from 'antd'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { store } from '@/app/store'
import type { AppNotification } from './notificationsApi'
import { connectionChanged, loadNotifications, markNotificationRead, notificationLink, notificationReceived } from './notificationsSlice'

/** ws(s)://<host hiện tại>/ws – đi qua Vite proxy (dev) / Nginx (prod), cùng origin với trang. */
function brokerUrl() {
  const { protocol, host } = window.location
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws`
}

/**
 * Kết nối STOMP khi đã đăng nhập; nhận thông báo realtime → cập nhật Redux + hiện toast.
 * Access token đọc lại MỖI LẦN (re)connect (beforeConnect) → sau khi token được refresh vẫn kết nối được.
 * Mất mạng → thư viện tự kết nối lại sau 5s; khi kết nối lại tải lại danh sách để không sót thông báo.
 */
export function useNotificationSocket() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { notification } = App.useApp()
  const userId = useAppSelector((s) => s.auth.user?.id)
  const isCustomer = useAppSelector((s) => s.auth.user?.role === 'CUSTOMER')

  useEffect(() => {
    if (!userId) return
    dispatch(loadNotifications())

    const client = new Client({
      brokerURL: brokerUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: async () => {
        client.connectHeaders = { Authorization: `Bearer ${store.getState().auth.accessToken ?? ''}` }
      },
      onConnect: () => {
        dispatch(connectionChanged(true))
        dispatch(loadNotifications()) // bù các thông báo đến trong lúc mất kết nối
        client.subscribe('/user/queue/notifications', (frame) => {
          const n = JSON.parse(frame.body) as AppNotification
          dispatch(notificationReceived(n))
          const link = notificationLink(n, isCustomer)
          notification.info({
            title: n.title,
            description: n.message,
            placement: 'topRight',
            duration: 6,
            onClick: link
              ? () => {
                  void dispatch(markNotificationRead(n.id)) // bấm toast = đã xem, giống bấm trong chuông
                  notification.destroy(`n-${n.id}`)
                  navigate(link)
                }
              : undefined,
            key: `n-${n.id}`,
            className: link ? 'cursor-pointer' : undefined,
          })
        })
      },
      onWebSocketClose: () => dispatch(connectionChanged(false)),
      onStompError: () => dispatch(connectionChanged(false)),
    })
    client.activate()
    return () => {
      void client.deactivate()
      dispatch(connectionChanged(false))
    }
  }, [userId, isCustomer, dispatch, navigate, notification])
}
