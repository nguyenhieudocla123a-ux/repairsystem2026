import { IdcardOutlined } from '@ant-design/icons'
import { Alert, App, Button } from 'antd'
import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { PROFILE_INCOMPLETE_EVENT } from '@/services/http'
import { PROFILE_PATH, ProfileGateContext, isProfileComplete, useProfileGate, type ProfileReturnState } from '../profileGate'

/**
 * Bọc khu vực đã đăng nhập: khách chưa hoàn tất hồ sơ (thiếu SĐT) bấm nút dịch vụ, hoặc API trả PROFILE_INCOMPLETE
 * → hộp nhắc với nút "Đi tới hồ sơ". Trang hồ sơ lưu xong sẽ đưa khách quay lại trang đang làm.
 */
export function ProfileGateProvider({ children }: { children: ReactNode }) {
  const user = useAppSelector((s) => s.auth.user)
  const complete = isProfileComplete(user)
  const navigate = useNavigate()
  const location = useLocation()
  const { modal } = App.useApp()

  const goToProfile = useCallback(() => {
    if (location.pathname === PROFILE_PATH) return
    navigate(PROFILE_PATH, { state: { returnTo: location.pathname + location.search } satisfies ProfileReturnState })
  }, [navigate, location.pathname, location.search])

  const askToComplete = useCallback(() => {
    modal.confirm({
      icon: <IdcardOutlined className="!text-primary" />,
      title: 'Cần hoàn tất hồ sơ',
      content: 'Cửa hàng cần họ tên và số điện thoại để liên hệ khi tiếp nhận, báo giá và trả máy. Bổ sung một lần là dùng được mọi dịch vụ.',
      okText: 'Đi tới hồ sơ',
      cancelText: 'Để sau',
      onOk: goToProfile,
    })
  }, [modal, goToProfile])

  const requireProfile = useCallback((action?: () => void) => {
    if (complete) action?.()
    else askToComplete()
  }, [complete, askToComplete])

  useEffect(() => {
    window.addEventListener(PROFILE_INCOMPLETE_EVENT, askToComplete)
    return () => window.removeEventListener(PROFILE_INCOMPLETE_EVENT, askToComplete)
  }, [askToComplete])

  const value = useMemo(() => ({ complete, requireProfile, goToProfile }), [complete, requireProfile, goToProfile])
  return <ProfileGateContext.Provider value={value}>{children}</ProfileGateContext.Provider>
}

/** Dải nhắc trên đầu trang cho khách chưa hoàn tất hồ sơ (ẩn ở chính trang hồ sơ). */
export function ProfileIncompleteBanner() {
  const { complete, goToProfile } = useProfileGate()
  const { pathname } = useLocation()
  if (complete || pathname === PROFILE_PATH) return null
  return (
    <Alert
      type="warning"
      showIcon
      className="mb-5"
      title="Hồ sơ của bạn chưa đủ thông tin"
      description="Thêm họ tên và số điện thoại để gửi yêu cầu sửa chữa, thêm thiết bị, xác nhận báo giá và yêu cầu bảo hành."
      action={<Button size="small" type="primary" onClick={goToProfile}>Hoàn tất ngay</Button>}
    />
  )
}
