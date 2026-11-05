import { describe, it, expect } from 'vitest'
import { refinePersonMask } from '../services/ai/matte'
describe('person matte', () => {
  it('preserves certain foreground/background and keeps intermediate alpha', () => {
    const result = refinePersonMask(
      new Float32Array([0, 0.5, 1]),
      new Uint8ClampedArray(12).fill(128),
      3,
      1,
    )
    expect(result[0]).toBe(0)
    expect(result[2]).toBe(255)
    expect(result[1]).toBeGreaterThan(0)
    expect(result[1]).toBeLessThan(255)
  })
  it('does not blend strongly across contrasting edges', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const result = refinePersonMask(new Float32Array([0.2, 0.8]), rgba, 2, 1)
    expect(result[0]).toBeLessThan(30)
    expect(result[1]).toBeGreaterThan(225)
  })
  it('rejects malformed dimensions and handles nonfinite values', () => {
    expect(() => refinePersonMask(new Float32Array(1), new Uint8ClampedArray(0), 1, 1)).toThrow()
    expect(refinePersonMask(new Float32Array([NaN]), new Uint8ClampedArray(4), 1, 1)[0]).toBe(0)
  })
})
