import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom không có matchMedia – AntD Grid/responsive cần nó
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

// AntD dùng getComputedStyle cho scrollbar
const originalGetComputedStyle = window.getComputedStyle
window.getComputedStyle = (elt: Element, pseudo?: string | null) => originalGetComputedStyle(elt, pseudo ?? undefined)
