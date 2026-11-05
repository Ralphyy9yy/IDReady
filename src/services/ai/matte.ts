/** Edge-aware smoothing at model resolution; avoid blurring across color boundaries. */
export function refinePersonMask(
  confidence: Float32Array,
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (confidence.length !== width * height || rgba.length !== width * height * 4)
    throw new Error('Invalid mask dimensions.')
  const alpha = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = y * width + x,
        center = confidence[index]
      if (!Number.isFinite(center)) {
        alpha[index] = 0
        continue
      }
      if (center <= 0.05) {
        alpha[index] = 0
        continue
      }
      if (center >= 0.95) {
        alpha[index] = 255
        continue
      }
      let sum = 0,
        weights = 0
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx,
            ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const n = ny * width + nx,
            value = confidence[n]
          if (!Number.isFinite(value)) continue
          const color =
            (rgba[index * 4] - rgba[n * 4]) ** 2 +
            (rgba[index * 4 + 1] - rgba[n * 4 + 1]) ** 2 +
            (rgba[index * 4 + 2] - rgba[n * 4 + 2]) ** 2
          const weight = Math.exp(-(dx * dx + dy * dy) / 4 - color / 2400)
          sum += value * weight
          weights += weight
        }
      const value = weights ? sum / weights : center
      const t = Math.min(1, Math.max(0, (value - 0.12) / 0.76))
      alpha[index] = Math.round(255 * t * t * (3 - 2 * t))
    }
  return alpha
}
