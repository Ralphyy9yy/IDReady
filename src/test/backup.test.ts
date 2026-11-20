import { afterEach, describe, expect, it, vi } from 'vitest'
import { encode } from 'fast-png'
import { exportDraftBackup, importDraftBackup, BACKUP_LIMIT } from '../features/drafts/backup'
import type { StoredDraft } from '../types'
const bytes = encode({ width: 1, height: 1, channels: 4, data: new Uint8Array([0, 100, 200, 255]) })
const photo = new Blob([bytes], { type: 'image/png' })
const draft: StoredDraft = {
  id: 'original',
  createdAt: 1,
  name: 'Test',
  photo,
  processed: photo,
  size: { id: '2x2', label: '2x2', widthMm: 50.8, heightMm: 50.8 },
  transform: {
    x: 0,
    y: 0,
    zoom: 1,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    borderStyle: 'thin-black',
    nameTag: { enabled: true, name: 'TEST NAME', secondLine: '', fontSize: 5, alignment: 'center' },
  },
  asaPair: [
    {
      photo,
      transform: {
        x: 0,
        y: 0,
        zoom: 1,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        borderStyle: 'none',
      },
    },
    undefined,
  ],
  stage: 'export',
}
function bitmap(width = 1, height = 1) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width, height, close: vi.fn() })),
  )
}
afterEach(() => vi.unstubAllGlobals())
describe('editable draft backup', () => {
  it('round trips original, processed image, name tag and ASA portraits with a new ID', async () => {
    bitmap()
    const restored = await importDraftBackup(await exportDraftBackup(draft))
    expect(restored.id).not.toBe(draft.id)
    expect(restored.transform).toEqual(draft.transform)
    expect(restored.asaPair?.[1]).toBeUndefined()
    expect(new Uint8Array(await restored.photo.arrayBuffer())).toEqual(bytes)
    expect(restored.processed?.type).toBe('image/png')
  })
  it('round trips full sheets with identities, ordering and individual quantities', async () => {
    bitmap()
    const data = 'data:image/png;base64,' + btoa(String.fromCharCode(...bytes))
    const sheet = {
      activeId: 2,
      photos: [1, 2].map((id) => ({
        id,
        quantity: id + 2,
        data,
        photo,
        processed: photo,
        size: draft.size,
        transform: draft.transform,
        pair: draft.asaPair,
      })),
    }
    const result = await importDraftBackup(await exportDraftBackup({ ...draft, sheet }))
    expect(result.sheet?.photos.map((p) => [p.id, p.quantity])).toEqual([
      [1, 3],
      [2, 4],
    ])
    expect(result.sheet?.activeId).toBe(2)
  })
  it('rejects future versions, corrupt JSON, bad settings and nonfinite/out-of-range transforms', async () => {
    bitmap()
    const raw = JSON.parse(await (await exportDraftBackup(draft)).text())
    for (const value of [
      { ...raw, version: 99 },
      { ...raw, draft: { ...raw.draft, transform: { ...raw.draft.transform, zoom: 0 } } },
      { ...raw, draft: { ...raw.draft, size: { ...raw.draft.size, widthMm: 900 } } },
    ])
      await expect(importDraftBackup(new Blob([JSON.stringify(value)]))).rejects.toThrow()
    await expect(importDraftBackup(new Blob(['not JSON']))).rejects.toThrow()
  })
  it('rejects oversized files before reading and oversized decoded images', async () => {
    await expect(importDraftBackup({ size: BACKUP_LIMIT + 1 } as Blob)).rejects.toThrow('150 MB')
    bitmap(10000, 10000)
    await expect(importDraftBackup(await exportDraftBackup(draft))).rejects.toThrow()
  })
  it('rejects duplicate sheet IDs and non-raster preview URLs', async () => {
    bitmap()
    const raw = JSON.parse(await (await exportDraftBackup(draft)).text())
    const p = {
      id: 1,
      quantity: 2,
      photo: raw.draft.photo,
      size: draft.size,
      transform: draft.transform,
      data: 'data:image/png;base64,' + btoa(String.fromCharCode(...bytes)),
    }
    raw.draft.sheet = { activeId: 1, photos: [p, p] }
    await expect(importDraftBackup(new Blob([JSON.stringify(raw)]))).rejects.toThrow()
    raw.draft.sheet = { activeId: 1, photos: [{ ...p, data: 'https://example.com/photo.png' }] }
    await expect(importDraftBackup(new Blob([JSON.stringify(raw)]))).rejects.toThrow()
  })
})
