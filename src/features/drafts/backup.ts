import type { AsaPair, PhotoSize, SheetSettings, StoredDraft, Transform } from '../../types'
import { validateImage } from '../../lib/validation/image'
import { PAPERS } from '../../lib/units/papers'

export const BACKUP_LIMIT = 150 * 1024 * 1024
const invalid = () =>
  new Error('Invalid or unsupported IDReady backup. Your saved drafts are unchanged.')
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid()
  return value as Record<string, unknown>
}
const number = (value: unknown, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw invalid()
  return value
}
const integer = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const result = number(value, min, max)
  if (!Number.isInteger(result)) throw invalid()
  return result
}
const text = (value: unknown, max: number) => {
  if (typeof value !== 'string' || value.length > max) throw invalid()
  return value
}
const boolean = (value: unknown) => {
  if (typeof value !== 'boolean') throw invalid()
  return value
}
function size(value: unknown): PhotoSize {
  const v = object(value)
  return {
    id: text(v.id, 80),
    label: text(v.label, 200),
    widthMm: number(v.widthMm, 10, 150),
    heightMm: number(v.heightMm, 10, 150),
  }
}
function transform(value: unknown): Transform {
  const v = object(value)
  const borders = ['none', 'thin-gray', 'thin-black', 'medium-black', 'double-black', 'white-inset']
  if (!borders.includes(String(v.borderStyle))) throw invalid()
  const result: Transform = {
    x: number(v.x, -2, 2),
    y: number(v.y, -2, 2),
    zoom: number(v.zoom, 0.1, 10),
    rotation: number(v.rotation, -360, 360),
    brightness: number(v.brightness, 0, 300),
    contrast: number(v.contrast, 0, 300),
    borderStyle: v.borderStyle as Transform['borderStyle'],
  }
  if (v.nameTag !== undefined) {
    const tag = object(v.nameTag)
    if (!['left', 'center', 'right'].includes(String(tag.alignment))) throw invalid()
    result.nameTag = {
      enabled: boolean(tag.enabled),
      name: text(tag.name, 80),
      secondLine: text(tag.secondLine, 80),
      fontSize: number(tag.fontSize, 1, 20),
      alignment: tag.alignment as 'left' | 'center' | 'right',
    }
  }
  return result
}
function settings(value: unknown): SheetSettings | undefined {
  if (value === undefined) return undefined
  const v = object(value),
    paper = PAPERS.find((p) => p.id === object(v.paper).id)
  if (!paper || !['portrait', 'landscape'].includes(String(v.orientation))) throw invalid()
  return {
    paper,
    orientation: v.orientation as 'portrait' | 'landscape',
    quantity: integer(v.quantity, 1, 100),
    marginMm: number(v.marginMm, 3, 30),
    gapMm: number(v.gapMm, 0, 20),
    cuttingGuides: boolean(v.cuttingGuides),
  }
}
async function encode(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384))
  return { mime: blob.type, base64: btoa(binary) }
}
async function image(value: unknown): Promise<Blob> {
  const v = object(value),
    mime = text(v.mime, 30),
    base64 = text(v.base64, 36 * 1024 * 1024)
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(mime) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) ||
    base64.length % 4 !== 0
  )
    throw invalid()
  let bytes: Uint8Array
  try {
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  } catch {
    throw invalid()
  }
  const file = new File([bytes], 'backup-image', { type: mime })
  await validateImage(file)
  // Decode before saving; a signature alone does not prove a valid, safe-sized image.
  const bitmap = await createImageBitmap(file)
  const valid = bitmap.width > 0 && bitmap.height > 0 && bitmap.width * bitmap.height <= 40_000_000
  bitmap.close()
  if (!valid) throw invalid()
  return file
}
async function encodePair(pair?: AsaPair) {
  return pair
    ? Promise.all(
        pair.map(async (p) =>
          p ? { photo: await encode(p.photo), transform: p.transform } : null,
        ),
      )
    : undefined
}
async function pair(value: unknown): Promise<AsaPair | undefined> {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > 2) throw invalid()
  return Promise.all(
    value.map(async (p) => {
      if (p === null) return undefined
      const v = object(p)
      return { photo: await image(v.photo), transform: transform(v.transform) }
    }),
  )
}
export async function exportDraftBackup(draft: StoredDraft): Promise<Blob> {
  const data = {
    ...draft,
    photo: await encode(draft.photo),
    processed: draft.processed ? await encode(draft.processed) : undefined,
    thumbnail: draft.thumbnail ? await encode(draft.thumbnail) : undefined,
    asaPair: await encodePair(draft.asaPair),
    sheet: draft.sheet
      ? {
          activeId: draft.sheet.activeId,
          photos: await Promise.all(
            draft.sheet.photos.map(async (p) => ({
              ...p,
              photo: await encode(p.photo),
              processed: p.processed ? await encode(p.processed) : undefined,
              pair: await encodePair(p.pair),
            })),
          ),
        }
      : undefined,
  }
  const blob = new Blob([JSON.stringify({ format: 'IDReady', version: 1, draft: data })], {
    type: 'application/json',
  })
  if (blob.size > BACKUP_LIMIT)
    throw new Error('This draft is too large for a backup (150 MB maximum).')
  return blob
}
export async function importDraftBackup(file: Blob): Promise<StoredDraft> {
  if (file.size > BACKUP_LIMIT) throw new Error('Backup exceeds the 150 MB limit.')
  let root: Record<string, unknown>
  try {
    root = object(JSON.parse(await file.text()))
  } catch {
    throw invalid()
  }
  if (root.format !== 'IDReady' || root.version !== 1) throw invalid()
  const v = object(root.draft)
  if (v.stage !== undefined && v.stage !== 'edit' && v.stage !== 'export') throw invalid()
  const now = Date.now()
  const draft: StoredDraft = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: v.name === undefined ? 'Imported draft' : text(v.name, 80),
    photo: await image(v.photo),
    processed: v.processed === undefined ? undefined : await image(v.processed),
    thumbnail: v.thumbnail === undefined ? undefined : await image(v.thumbnail),
    size: size(v.size),
    transform: transform(v.transform),
    sheetSettings: settings(v.sheetSettings),
    asaPair: await pair(v.asaPair),
    stage: v.stage as 'edit' | 'export' | undefined,
  }
  if (v.sheet !== undefined) {
    const sheet = object(v.sheet)
    if (!Array.isArray(sheet.photos) || !sheet.photos.length || sheet.photos.length > 20)
      throw invalid()
    const photos: NonNullable<StoredDraft['sheet']>['photos'] = []
    for (const raw of sheet.photos) {
      const p = object(raw)
      // Only raster data URLs are accepted; URLs, SVG and executable markup are rejected.
      const data = text(p.data, 36 * 1024 * 1024),
        match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data)
      if (!match) throw invalid()
      await image({ mime: match[1], base64: match[2] })
      photos.push({
        id: integer(p.id, 1),
        quantity: integer(p.quantity, 1, 100),
        data,
        photo: await image(p.photo),
        processed: p.processed === undefined ? undefined : await image(p.processed),
        size: size(p.size),
        transform: transform(p.transform),
        pair: await pair(p.pair),
      })
    }
    const activeId = integer(sheet.activeId, 1)
    if (
      new Set(photos.map((p) => p.id)).size !== photos.length ||
      !photos.some((p) => p.id === activeId)
    )
      throw invalid()
    draft.sheet = { activeId, photos }
  }
  return draft
}
