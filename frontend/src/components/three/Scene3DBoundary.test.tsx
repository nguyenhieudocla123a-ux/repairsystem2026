import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Scene3DBoundary } from './Scene3DBoundary'

function Boom(): never {
  throw new Error('Failed to fetch dynamically imported module')
}

describe('Scene3DBoundary', () => {
  it('cảnh 3D lỗi thì ẩn đi, phần còn lại của trang vẫn hiển thị', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <div>
        <Scene3DBoundary>
          <Boom />
        </Scene3DBoundary>
        <p>Form đăng nhập</p>
      </div>,
    )
    expect(screen.getByText('Form đăng nhập')).toBeInTheDocument()
  })
})
