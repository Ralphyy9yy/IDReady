import type { PhotoSize, SheetSettings } from '../../types'

export interface SheetPhoto { id: number; data: string; size: PhotoSize; quantity: number }

/** Stable shelf packing: preserve input order and physical dimensions. */
export function layoutMixedSheet(settings: SheetSettings, photos: SheetPhoto[]) {
  const landscape = settings.orientation === 'landscape'
  const pageWidth = landscape ? settings.paper.heightMm : settings.paper.widthMm
  const pageHeight = landscape ? settings.paper.widthMm : settings.paper.heightMm
  const margin = settings.marginMm, gap = settings.gapMm
  const items: { x: number; y: number; width: number; height: number; page: number; photo: SheetPhoto }[] = []
  const unfit: number[] = []
  let x = margin, y = margin, rowHeight = 0, page = 0
  for (const photo of photos) {
    const { widthMm: width, heightMm: height } = photo.size
    if (!(width > 0 && height > 0) || width > pageWidth - 2 * margin || height > pageHeight - 2 * margin) { unfit.push(photo.id); continue }
    for (let n = 0; n < Math.min(100, Math.max(0, Math.floor(photo.quantity))); n++) {
      if (x + width > pageWidth - margin + 1e-8) { x = margin; y += rowHeight + gap; rowHeight = 0 }
      if (y + height > pageHeight - margin + 1e-8) { page++; x = margin; y = margin; rowHeight = 0 }
      items.push({ x, y, width, height, page, photo })
      x += width + gap; rowHeight = Math.max(rowHeight, height)
    }
  }
  return { items, pageWidth, pageHeight, pages: items.length ? page + 1 : 0, perPage: items.filter(item => item.page === 0).length, unfit }
}
