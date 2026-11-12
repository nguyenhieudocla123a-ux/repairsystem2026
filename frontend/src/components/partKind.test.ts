import { describe, expect, it } from 'vitest'
import { guessPartKind } from './partKind'

describe('guessPartKind', () => {
  it('nhận diện theo danh mục hoặc tên, có dấu tiếng Việt', () => {
    expect(guessPartKind('Màn hình', 'Màn hình OLED iPhone 13')).toBe('screen')
    expect(guessPartKind(null, 'Pin iPhone 12 2815mAh')).toBe('battery')
    expect(guessPartKind('Cổng sạc', null)).toBe('port')
    expect(guessPartKind(undefined, 'Bàn phím Dell XPS')).toBe('keyboard')
    expect(guessPartKind(null, 'SSD NVMe 512GB')).toBe('storage')
  })

  it('không khớp → hình chung', () => {
    expect(guessPartKind(null, 'Ốc vít bộ 10 cái')).toBe('generic')
  })
})
