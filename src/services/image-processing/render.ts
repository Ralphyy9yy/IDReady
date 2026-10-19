import { containScale } from '../../lib/geometry'
import { mmToPx } from '../../lib/units'
import type { PhotoSize, Transform } from '../../types'

export async function decodeImage(source: Blob): Promise<ImageBitmap> {
  try { return await createImageBitmap(source, { imageOrientation: 'from-image' }) }
  catch { throw new Error('This image is corrupt or uses an unsupported format. Try JPEG, PNG, or WebP.') }
}

export function drawPhoto(ctx: CanvasRenderingContext2D, image: CanvasImageSource, sourceW: number, sourceH: number, width: number, height: number, t: Transform) {
  ctx.save()
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height)
  ctx.filter = `brightness(${t.brightness}%) contrast(${t.contrast}%)`
  ctx.translate(width / 2 + t.x * width, height / 2 + t.y * height)
  ctx.rotate(t.rotation * Math.PI / 180)
  const scale = containScale(sourceW, sourceH, width, height) * t.zoom
  ctx.drawImage(image, -sourceW * scale / 2, -sourceH * scale / 2, sourceW * scale, sourceH * scale)
  ctx.restore()
  drawBorder(ctx, width, height, t.borderStyle ?? 'none')
}

function drawBorder(ctx: CanvasRenderingContext2D, width: number, height: number, style: Transform['borderStyle']) {
  if (style === 'none') return
  const unit = Math.max(1, Math.round(Math.min(width, height) * .003))
  const white = style === 'white-inset'
  ctx.save()
  ctx.strokeStyle = white ? '#ffffff' : style === 'thin-gray' ? '#9ca3af' : '#111827'
  ctx.lineWidth = style === 'medium-black' ? unit * 2 : unit
  const inset = ctx.lineWidth / 2
  ctx.strokeRect(inset, inset, width - ctx.lineWidth, height - ctx.lineWidth)
  if (style === 'double-black') {
    const gap = unit * 2.5
    ctx.strokeRect(gap + inset, gap + inset, width - (gap + inset) * 2, height - (gap + inset) * 2)
  }
  ctx.restore()
}

export function renderPhoto(image: CanvasImageSource, sourceW: number, sourceH: number, size: PhotoSize, t: Transform, dpi = 300) {
  const canvas = document.createElement('canvas')
  canvas.width = mmToPx(size.widthMm, dpi); canvas.height = mmToPx(size.heightMm, dpi)
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Canvas rendering is unavailable in this browser.')
  drawPhoto(ctx, image, sourceW, sourceH, canvas.width, canvas.height, t)
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality = .94) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode the image.')), type, quality))
}
