import { NameTagControls } from '../editor/NameTagControls'
import { Download, FileImage, FileText, Printer, ZoomIn, ZoomOut, LayoutGrid, Square, Type } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cuttingGuides } from '../../lib/geometry/guides'
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
  const [page, setPage] = useState(0)
  const [tool,setTool] = useState<'layout'|'border'|'name'|'download'>('layout')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewZoom, setPreviewZoom] = useState(100)
  const pan = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null)
  const layout = useMemo(() => layoutSheet(settings, size), [settings, size])
  const previewUrl = useMemo(() => renderPhoto(image, image.width, image.height, size, transform).toDataURL('image/png'), [image, size, transform])
  const set = <K extends keyof SheetSettings>(key: K, value: SheetSettings[K]) => setSettings(s => ({ ...s, [key]: value }))
  const currentPage = Math.min(page, Math.max(0, layout.pages - 1))
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
    const { createSheetPdf } = await import('../../services/export/pdf')
    createSheetPdf(getCanvas().toDataURL('image/jpeg',.95),settings,size).save(`IDReady-${settings.paper.id}.pdf`)
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
        <div className={`sheet-zoom-viewport ${previewZoom > 100 ? 'is-zoomed' : ''}`} tabIndex={0} role="region" aria-label="Sheet preview. When zoomed, drag or scroll to inspect the page."
          onPointerDown={event => {
            if (previewZoom <= 100 || !event.isPrimary || event.button !== 0) return
            const viewport = event.currentTarget
            pan.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }
            viewport.setPointerCapture(event.pointerId)
            viewport.dataset.dragging = 'true'
          }}
          onPointerMove={event => {
            const start = pan.current
            if (!start || start.pointer !== event.pointerId) return
            event.currentTarget.scrollLeft = start.left - (event.clientX - start.x)
            event.currentTarget.scrollTop = start.top - (event.clientY - start.y)
          }}
          onPointerUp={event => {
            pan.current = null
            delete event.currentTarget.dataset.dragging
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
          }}
          onPointerCancel={event => { pan.current = null; delete event.currentTarget.dataset.dragging }}
          onLostPointerCapture={event => { pan.current = null; delete event.currentTarget.dataset.dragging }}>
        <div className="sheet" style={{ aspectRatio: `${layout.pageWidth}/${layout.pageHeight}`, width: `calc(min(100cqw - 24px, var(--sheet-fit-height) * ${layout.pageWidth / layout.pageHeight}) * ${previewZoom / 100})` }}>
          {layout.items.filter(i => i.page === currentPage).map((i, n) => <div key={n} className="sheet-photo" style={{ left: `${i.x / layout.pageWidth * 100}%`, top: `${i.y / layout.pageHeight * 100}%`, width: `${i.width / layout.pageWidth * 100}%`, height: `${i.height / layout.pageHeight * 100}%`, backgroundImage: `url(${previewUrl})` }} />)}
          {settings.cuttingGuides&&<svg className="sheet-cut-guides" viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`} aria-hidden="true">
            {layout.items.filter(item=>item.page===currentPage).flatMap(item=>cuttingGuides(item,settings.gapMm,settings.marginMm)).map((line,index)=><line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}/>)}
          </svg>}
        </div>
        </div>
        <div className="sheet-page-controls"><button className="button quiet" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</button><p className="preview-caption" aria-live="polite">Page {layout.pages ? currentPage+1 : 0} of {layout.pages} · {layout.perPage} fit per page</p><button className="button quiet" disabled={currentPage>=layout.pages-1} onClick={()=>setPage(currentPage+1)}>Next</button></div>
      </section>
      <aside className="controls export-controls">
        <div className="editor-tools" role="group" aria-label="Export tools">
          {([{id:'layout',label:'Layout',Icon:LayoutGrid},{id:'border',label:'Border',Icon:Square},{id:'name',label:'Name tag',Icon:Type},{id:'download',label:'Download',Icon:Download}] as const).map(({id,label,Icon})=><button key={id} type="button" aria-pressed={tool===id} aria-controls={`export-tool-${id}`} onClick={()=>setTool(id)}><Icon/><span>{label}</span></button>)}
        </div>
        <div id="export-tool-layout" className="editor-tool-panel" hidden={tool!=='layout'}>
        <section><h2>Sheet settings</h2><p>Choose your paper and arrange your copies.</p>
          <div className="field-row">
            <label>Paper<select value={settings.paper.id} onChange={e => set('paper', PAPERS.find(paper => paper.id === e.target.value) ?? PAPERS[0])}>{(['Document', 'Photo'] as const).map(group => <optgroup key={group} label={`${group} paper`}>{PAPERS.filter(paper => paper.group === group).map(paper => <option key={paper.id} value={paper.id}>{paper.label} · {paper.dimensions}</option>)}</optgroup>)}</select></label>
            <label>Orientation<select value={settings.orientation} onChange={e => set('orientation', e.target.value as 'portrait' | 'landscape')}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
          </div>
          <div className="field-row">
            <label>Copies<NumberField min={1} max={100} step={1} value={settings.quantity} onCommit={value => set('quantity', value)} /></label>
            <label>Gap (mm)<NumberField min={0} max={20} step={0.1} value={settings.gapMm} onCommit={value => set('gapMm', value)} /></label>
          </div>
          <details className="export-spacing"><summary>Margins & cutting guides</summary><div className="details-body">
            <label>Safe margin (mm)<NumberField min={3} max={30} step={0.1} value={settings.marginMm} onCommit={value => set('marginMm', value)} /></label>
            <label className="check"><input type="checkbox" checked={settings.cuttingGuides} onChange={e => set('cuttingGuides', e.target.checked)} />Add cutting guides outside photos</label>
          </div></details>

          {!layout.perPage && <div className="notice error" role="alert">This photo does not fit. Try larger paper or smaller margins.</div>}
          {settings.quantity > layout.perPage && layout.perPage > 0 && <div className="notice" role="status">{layout.perPage} fit per page. Your {settings.quantity} copies will use {layout.pages} pages.</div>}
        </section>
        </div>
        <div id="export-tool-border" className="editor-tool-panel" hidden={tool!=='border'}><section><h2>Photo border</h2>          <fieldset className="border-picker"><legend>Photo border</legend><div className="border-options">
            {borders.map(border => <label key={border.value} className={`border-option ${(transform.borderStyle ?? 'none') === border.value ? 'selected' : ''}`}>
              <input type="radio" name="photo-border" value={border.value} checked={(transform.borderStyle ?? 'none') === border.value} onChange={() => onTransformChange({ ...transform, borderStyle: border.value })} />
              <span className={`border-swatch swatch-${border.value}`} aria-hidden="true"><span /></span><span>{border.label}</span>
            </label>)}
          </div><p>Applied inside each photo, including PNG and JPEG downloads.</p></fieldset></section></div>
        <div id="export-tool-name" className="editor-tool-panel" hidden={tool!=='name'}><NameTagControls transform={transform} onChange={onTransformChange}/></div>
        <div id="export-tool-download" className="editor-tool-panel" hidden={tool!=='download'}>
        <section><h2>Printable sheet</h2><p>Download the PDF for exact physical dimensions. Print at Actual size / 100%.</p><p>Use the Download PDF button below.</p></section>
        <section><h2>Single photo</h2><p>{size.widthMm} × {size.heightMm} mm · {mmToPx(size.widthMm)} × {mmToPx(size.heightMm)} px at 300 DPI</p>
          <div className="button-pair"><button className="button secondary" disabled={busy} onClick={() => void download('image/png')}><FileImage />PNG</button><button className="button secondary" disabled={busy} onClick={() => void download('image/jpeg')}><Download />JPEG</button></div>
        </section>
        <details className="print-check"><summary><Printer />Printing tips</summary><div className="details-body"><ol><li>Select {settings.paper.label} paper.</li><li>Choose Actual size / 100%.</li><li>Turn off Fit to page.</li><li>Choose the correct paper type and quality.</li></ol><p><strong>Epson L3210:</strong> Download the PDF, transfer it to a computer connected to the printer by USB, and print at 100%.</p></div></details>
        </div>
      </aside>
    </div>
    <div className="export-download-bar">
      <div><strong>{layout.pages ? 'Ready to print' : 'Adjust sheet settings'}</strong><p>{settings.paper.label} · {settings.quantity} {settings.quantity === 1 ? 'copy' : 'copies'} · {size.widthMm} × {size.heightMm} mm · 300 DPI · {layout.pages} {layout.pages === 1 ? 'page' : 'pages'}</p>{error && <p className="export-error" role="alert">{error}</p>}</div>
      <button className="button primary" disabled={busy || !layout.items.length} onClick={() => void pdf()}><FileText />{busy ? 'Preparing download…' : 'Download PDF'}</button>
    </div>
  </div>
}

function NumberField({ value, min, max, step, onCommit }: { value: number; min: number; max: number; step: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const parsed = Number(text)
    const bounded = text.trim() && Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value
    const next = step === 1 ? Math.round(bounded) : Math.round(bounded * 10) / 10
    setText(String(next))
    onCommit(next)
  }
  return <input type="number" min={min} max={max} step={step} value={text} onChange={event => {
    setText(event.target.value)
    const parsed = event.target.valueAsNumber
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max && (step !== 1 || Number.isInteger(parsed))) onCommit(parsed)
  }} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
