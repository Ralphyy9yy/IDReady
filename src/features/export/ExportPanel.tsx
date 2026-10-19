import { Download, FileImage, FileText, Printer, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo, useState } from 'react'
import { layoutSheet } from '../../lib/geometry'
import { mmToPx } from '../../lib/units'
import { PAPERS } from '../../lib/units/papers'
import { canvasToBlob, renderPhoto } from '../../services/image-processing/render'
import type { BorderStyle, PhotoSize, SheetSettings, Transform } from '../../types'

const borders: { value: BorderStyle; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'thin-gray', label: 'Gray' },
  { value: 'thin-black', label: 'Thin' }, { value: 'medium-black', label: 'Medium' },
  { value: 'double-black', label: 'Double' }, { value: 'white-inset', label: 'White' },
]
interface Props { image: ImageBitmap; size: PhotoSize; transform: Transform; onTransformChange: (transform: Transform) => void }

export function ExportPanel({ image, size, transform, onTransformChange }: Props) {
  const [settings, setSettings] = useState<SheetSettings>({ paper: PAPERS[0], orientation: 'portrait', quantity: 8, marginMm: 10, gapMm: 3, cuttingGuides: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewZoom, setPreviewZoom] = useState(100)
  const layout = useMemo(() => layoutSheet(settings, size), [settings, size])
  const previewUrl = useMemo(() => renderPhoto(image, image.width, image.height, size, transform).toDataURL('image/png'), [image, size, transform])
  const set = <K extends keyof SheetSettings>(key: K, value: SheetSettings[K]) => setSettings(s => ({ ...s, [key]: value }))
  const getCanvas = () => renderPhoto(image, image.width, image.height, size, transform)
  async function runExport(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() } catch { setError('Could not prepare the download. Please retry. Your photo is still available.') }
    finally { setBusy(false) }
  }
  const download = (type: 'image/png' | 'image/jpeg') => runExport(async () => {
    const blob = await canvasToBlob(getCanvas(), type)
    save(blob, `IDReady-${size.id}.${type === 'image/png' ? 'png' : 'jpg'}`)
  })
  const pdf = () => runExport(async () => {
    const { jsPDF } = await import('jspdf')
    const data = getCanvas().toDataURL('image/jpeg', .95)
    const doc = new jsPDF({ unit: 'mm', format: [layout.pageWidth, layout.pageHeight], orientation: settings.orientation })
    for (let p = 0; p < layout.pages; p++) {
      if (p) doc.addPage([layout.pageWidth, layout.pageHeight], settings.orientation)
      layout.items.filter(i => i.page === p).forEach(i => {
        doc.addImage(data, 'JPEG', i.x, i.y, i.width, i.height, undefined, 'FAST')
        if (settings.cuttingGuides) {
          doc.setDrawColor(110); doc.setLineWidth(.15)
          const d = 2
          doc.line(i.x - d, i.y, i.x - .4, i.y)
          doc.line(i.x, i.y - d, i.x, i.y - .4)
          doc.line(i.x + i.width + .4, i.y, i.x + i.width + d, i.y)
          doc.line(i.x + i.width, i.y - d, i.x + i.width, i.y - .4)
          doc.line(i.x - d, i.y + i.height, i.x - .4, i.y + i.height)
          doc.line(i.x, i.y + i.height + .4, i.x, i.y + i.height + d)
        }
      })
    }
    doc.save(`IDReady-${settings.paper.id}.pdf`)
  })
  return <div className="export-layout">
    <div className="export-grid">
      <section className="sheet-area export-preview" aria-label="Printable sheet preview">
        <div className="preview-zoom-toolbar" role="group" aria-label="Print preview zoom">
          <button className="icon-button" aria-label="Zoom out print preview" disabled={previewZoom <= 100} onClick={() => setPreviewZoom(value => Math.max(100, value - 25))}><ZoomOut /></button>
          <output aria-live="polite">{previewZoom}%</output>
          <button className="icon-button" aria-label="Zoom in print preview" disabled={previewZoom >= 300} onClick={() => setPreviewZoom(value => Math.min(300, value + 25))}><ZoomIn /></button>
          <button className="button quiet" onClick={() => setPreviewZoom(100)}>Fit page</button>
        </div>
        <div className="sheet-zoom-viewport" tabIndex={0} role="region" aria-label="Sheet preview. Scroll to inspect the enlarged page.">
        <div className="sheet" style={{ aspectRatio: `${layout.pageWidth}/${layout.pageHeight}`, width: `calc(min(100cqw - 24px, min(440px, 55dvh - 24px) * ${layout.pageWidth / layout.pageHeight}) * ${previewZoom / 100})` }}>
          {layout.items.filter(i => i.page === 0).map((i, n) => <div key={n} className="sheet-photo" style={{ left: `${i.x / layout.pageWidth * 100}%`, top: `${i.y / layout.pageHeight * 100}%`, width: `${i.width / layout.pageWidth * 100}%`, height: `${i.height / layout.pageHeight * 100}%`, backgroundImage: `url(${previewUrl})` }} />)}
        </div>
        </div>
        <p className="preview-caption">Page {layout.pages ? 1 : 0} of {layout.pages} · {layout.perPage} fit per page</p>
      </section>
      <aside className="controls export-controls">
        <section><h2>Sheet settings</h2><p>Choose your paper and arrange your copies.</p>
          <div className="field-row">
            <label>Paper<select value={settings.paper.id} onChange={e => set('paper', PAPERS.find(paper => paper.id === e.target.value) ?? PAPERS[0])}>{(['Document', 'Photo'] as const).map(group => <optgroup key={group} label={`${group} paper`}>{PAPERS.filter(paper => paper.group === group).map(paper => <option key={paper.id} value={paper.id}>{paper.label} · {paper.dimensions}</option>)}</optgroup>)}</select></label>
            <label>Orientation<select value={settings.orientation} onChange={e => set('orientation', e.target.value as 'portrait' | 'landscape')}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
          </div>
          <div className="field-row">
            <label>Copies<input type="number" min="1" max="100" value={settings.quantity} onChange={e => set('quantity', Math.min(100, Math.max(1, Number(e.target.value) || 1)))} /></label>
            <label>Gap (mm)<input type="number" min="0" max="20" value={settings.gapMm} onChange={e => set('gapMm', Math.min(20, Math.max(0, Number(e.target.value) || 0)))} /></label>
          </div>
          <details className="export-spacing"><summary>Margins & cutting guides</summary><div className="details-body">
            <label>Safe margin (mm)<input type="number" min="3" max="30" value={settings.marginMm} onChange={e => set('marginMm', Math.min(30, Math.max(3, Number(e.target.value) || 3)))} /></label>
            <label className="check"><input type="checkbox" checked={settings.cuttingGuides} onChange={e => set('cuttingGuides', e.target.checked)} />Add cutting guides outside photos</label>
          </div></details>
          <fieldset className="border-picker"><legend>Photo border</legend><div className="border-options">
            {borders.map(border => <label key={border.value} className={`border-option ${(transform.borderStyle ?? 'none') === border.value ? 'selected' : ''}`}>
              <input type="radio" name="photo-border" value={border.value} checked={(transform.borderStyle ?? 'none') === border.value} onChange={() => onTransformChange({ ...transform, borderStyle: border.value })} />
              <span className={`border-swatch swatch-${border.value}`} aria-hidden="true"><span /></span><span>{border.label}</span>
            </label>)}
          </div><p>Applied inside each photo, including PNG and JPEG downloads.</p></fieldset>
          {!layout.perPage && <div className="notice error" role="alert">This photo does not fit. Try larger paper or smaller margins.</div>}
          {settings.quantity > layout.perPage && layout.perPage > 0 && <div className="notice" role="status">{layout.perPage} fit per page. Your {settings.quantity} copies will use {layout.pages} pages.</div>}
        </section>
        <section><h2>Single photo</h2><p>{size.widthMm} × {size.heightMm} mm · {mmToPx(size.widthMm)} × {mmToPx(size.heightMm)} px at 300 DPI</p>
          <div className="button-pair"><button className="button secondary" disabled={busy} onClick={() => void download('image/png')}><FileImage />PNG</button><button className="button secondary" disabled={busy} onClick={() => void download('image/jpeg')}><Download />JPEG</button></div>
        </section>
        <details className="print-check"><summary><Printer />Printing tips</summary><div className="details-body"><ol><li>Select {settings.paper.label} paper.</li><li>Choose Actual size / 100%.</li><li>Turn off Fit to page.</li><li>Choose the correct paper type and quality.</li></ol><p><strong>Epson L3210:</strong> Download the PDF, transfer it to a computer connected to the printer by USB, and print at 100%.</p></div></details>
      </aside>
    </div>
    <div className="export-download-bar">
      <div><strong>{layout.pages ? 'Ready to print' : 'Adjust sheet settings'}</strong><p>{settings.paper.label} · {settings.quantity} {settings.quantity === 1 ? 'copy' : 'copies'} · {size.widthMm} × {size.heightMm} mm · {layout.pages} {layout.pages === 1 ? 'page' : 'pages'}</p>{error && <p className="export-error" role="alert">{error}</p>}</div>
      <button className="button primary" disabled={busy || !layout.items.length} onClick={() => void pdf()}><FileText />{busy ? 'Preparing download…' : 'Download PDF'}</button>
    </div>
  </div>
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
