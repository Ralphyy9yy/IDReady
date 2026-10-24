import { containScale } from './index'
import type { PhotoSize } from '../../types'

// Source pixels per printed inch, not the dimensions of an upscaled export.
export function effectivePpi(width: number, height: number, size: PhotoSize, zoom: number) {
  return 25.4 / (containScale(width, height, size.widthMm, size.heightMm) * zoom)
}
