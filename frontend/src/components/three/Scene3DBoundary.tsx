import { Component, type ReactNode } from 'react'

/**
 * Cảnh 3D chỉ để trang trí: nếu chunk three.js tải lỗi (mạng chập chờn, vừa deploy bản mới)
 * hoặc WebGL lỗi khi dựng cảnh → ẩn đi, KHÔNG làm sập trang đăng nhập.
 */
export class Scene3DBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('Bỏ qua cảnh 3D:', error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
