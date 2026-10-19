import type { SheetLayout, SheetSettings, PhotoSize } from '../../types'

export function containScale(sourceW: number, sourceH: number, targetW: number, targetH: number) {
  return Math.max(targetW / sourceW, targetH / sourceH)
}

export function layoutSheet(settings: SheetSettings, photo: PhotoSize): SheetLayout {
  const landscape = settings.orientation === 'landscape'
  const pageWidth = landscape ? settings.paper.heightMm : settings.paper.widthMm
  const pageHeight = landscape ? settings.paper.widthMm : settings.paper.heightMm
  const usableW = Math.max(0, pageWidth - settings.marginMm * 2)
  const usableH = Math.max(0, pageHeight - settings.marginMm * 2)
  const cols = Math.max(0, Math.floor((usableW + settings.gapMm) / (photo.widthMm + settings.gapMm)))
  const rows = Math.max(0, Math.floor((usableH + settings.gapMm) / (photo.heightMm + settings.gapMm)))
  const perPage = cols * rows
  const count = Math.max(0, Math.floor(settings.quantity))
  const items = perPage === 0 ? [] : Array.from({ length: count }, (_, index) => {
    const onPage = index % perPage
    const col = onPage % cols
    const row = Math.floor(onPage / cols)
    return { x: settings.marginMm + col * (photo.widthMm + settings.gapMm), y: settings.marginMm + row * (photo.heightMm + settings.gapMm), width: photo.widthMm, height: photo.heightMm, page: Math.floor(index / perPage) }
  })
  return { items, perPage, pages: perPage ? Math.ceil(count / perPage) : 0, pageWidth, pageHeight, cols, rows }
}
