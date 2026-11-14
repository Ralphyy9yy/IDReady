import { useEffect, useRef, useState } from 'react'
import { Undo2, Redo2, Hand, ZoomIn, ZoomOut } from 'lucide-react'
import { containScale } from '../../lib/geometry'
import { canvasToBlob, drawPhoto } from '../../services/image-processing/render'
import type { PhotoSize, Transform } from '../../types'

export function Cleanup({
  original,
  processed,
  size,
  transform,
  onApply,
  onCancel,
}: {
  original: ImageBitmap
  processed: ImageBitmap
  size: PhotoSize
  transform: Transform
  onApply: (blob: Blob) => Promise<void>
  onCancel: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const working = useRef<HTMLCanvasElement | undefined>(undefined)
  const last = useRef<{ x: number; y: number } | undefined>(undefined)
  const [mode, setMode] = useState<'erase' | 'restore'>('erase')
  const [brush, setBrush] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ImageData[]>([])
  const [future, setFuture] = useState<ImageData[]>([])
  const [zoom, setZoom] = useState(100)
  const [panning, setPanning] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number; diameter: number } | null>(null)
  function redraw() {
    const view = canvas.current,
      source = working.current
    if (!view || !source) return
    const ctx = view.getContext('2d')
    if (ctx) drawPhoto(ctx, source, source.width, source.height, view.width, view.height, transform)
  }
  useEffect(() => {
    const source = document.createElement('canvas'),
      view = canvas.current
    const scale = Math.min(1, 1600 / Math.max(processed.width, processed.height))
    source.width = Math.round(processed.width * scale)
    source.height = Math.round(processed.height * scale)
    source.getContext('2d')?.drawImage(processed, 0, 0, source.width, source.height)
    working.current = source
    if (view) {
      const ratio = size.widthMm / size.heightMm
      view.width = Math.min(760, Math.round(580 * ratio))
      view.height = Math.round(view.width / ratio)
    }
    setHistory([])
    setFuture([])
    redraw()
    // The editing copy is initialized when entering cleanup or switching images.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processed, size])
  useEffect(() => {
    redraw()
    // Keep the same crop and adjustments as the normal photo preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transform])
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const view = event.currentTarget,
      source = working.current!,
      rect = view.getBoundingClientRect()
    const x =
      ((event.clientX - rect.left) * view.width) / rect.width -
      view.width / 2 -
      transform.x * view.width
    const y =
      ((event.clientY - rect.top) * view.height) / rect.height -
      view.height / 2 -
      transform.y * view.height
    const angle = (transform.rotation * Math.PI) / 180,
      scale = containScale(source.width, source.height, view.width, view.height) * transform.zoom
    return {
      x: (Math.cos(angle) * x + Math.sin(angle) * y) / scale + source.width / 2,
      y: (-Math.sin(angle) * x + Math.cos(angle) * y) / scale + source.height / 2,
    }
  }
  function trackCursor(event: React.PointerEvent<HTMLCanvasElement>) {
    const view = event.currentTarget,
      source = working.current
    if (!source || busy) return
    const rect = view.getBoundingClientRect()
    const scale =
      containScale(source.width, source.height, view.width, view.height) * transform.zoom
    setCursor({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      diameter: (brush * scale * rect.width) / view.width,
    })
  }
  function paint(to: { x: number; y: number }) {
    const source = working.current,
      ctx = source?.getContext('2d')
    if (!source || !ctx) return
    const from = last.current ?? to
    ctx.save()
    ctx.beginPath()
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (brush / 4)))
    for (let i = 0; i <= steps; i++) {
      const x = from.x + ((to.x - from.x) * i) / steps,
        y = from.y + ((to.y - from.y) * i) / steps
      ctx.moveTo(x + brush / 2, y)
      ctx.arc(x, y, brush / 2, 0, Math.PI * 2)
    }
    ctx.clip()
    if (mode === 'restore') ctx.drawImage(original, 0, 0, source.width, source.height)
    else {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, source.width, source.height)
    }
    ctx.restore()
    last.current = to
    redraw()
  }
  return (
    <div className="inline-cleanup">
      <div className="cleanup-toolbar" role="group" aria-label="Background cleanup tools">
        <button
          className={`button secondary ${mode === 'erase' ? 'active' : ''}`}
          aria-pressed={mode === 'erase'}
          onClick={() => {
            setMode('erase')
            setPanning(false)
          }}
        >
          Erase
        </button>
        <button
          className={`button secondary ${mode === 'restore' ? 'active' : ''}`}
          aria-pressed={mode === 'restore'}
          onClick={() => {
            setMode('restore')
            setPanning(false)
          }}
        >
          Restore
        </button>
        <button
          className="icon-button"
          aria-label="Undo stroke"
          title="Undo last stroke"
          disabled={!history.length || busy}
          onClick={() => {
            const ctx = working.current?.getContext('2d'),
              previous = history[history.length - 1]
            if (ctx && previous) {
              setFuture((old) => [
                ...old.slice(-4),
                ctx.getImageData(0, 0, working.current!.width, working.current!.height),
              ])
              ctx.putImageData(previous, 0, 0)
              redraw()
            }
            setHistory((old) => old.slice(0, -1))
          }}
        >
          <Undo2 aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          aria-label="Redo stroke"
          title="Redo last stroke"
          disabled={!future.length || busy}
          onClick={() => {
            const source = working.current,
              ctx = source?.getContext('2d'),
              next = future[future.length - 1]
            if (source && ctx && next) {
              setHistory((old) => [
                ...old.slice(-4),
                ctx.getImageData(0, 0, source.width, source.height),
              ])
              ctx.putImageData(next, 0, 0)
              setFuture((old) => old.slice(0, -1))
              redraw()
            }
          }}
        >
          <Redo2 />
        </button>
        <button
          className="button secondary"
          aria-pressed={panning}
          disabled={busy}
          onClick={() => {
            setPanning(!panning)
            setCursor(null)
          }}
        >
          <Hand />
          Move
        </button>
      </div>
      <div className="cleanup-view-tools" role="group" aria-label="Cleanup preview zoom">
        <button
          className="icon-button"
          aria-label="Zoom out cleanup preview"
          disabled={zoom <= 100 || busy}
          onClick={() => setZoom((value) => Math.max(100, value - 50))}
        >
          <ZoomOut />
        </button>
        <output aria-live="polite">{zoom}%</output>
        <button
          className="icon-button"
          aria-label="Zoom in cleanup preview"
          disabled={zoom >= 400 || busy}
          onClick={() => setZoom((value) => Math.min(400, value + 50))}
        >
          <ZoomIn />
        </button>
        <button
          className="button quiet"
          disabled={busy}
          onClick={() => {
            setZoom(100)
            if (viewport.current) {
              viewport.current.scrollTop = 0
              viewport.current.scrollLeft = 0
            }
          }}
        >
          Fit photo
        </button>
      </div>
      <label className="inline-brush">
        Brush: {brush} px
        <input
          type="range"
          min="5"
          max="100"
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
        />
      </label>
      <div ref={viewport} className="cleanup-viewport" data-move={panning}>
        <div
          className="preview-frame"
          style={{
            aspectRatio: `${size.widthMm}/${size.heightMm}`,
            width: `${zoom}%`,
            maxWidth: 'none',
            flexShrink: 0,
          }}
        >
          <canvas
            ref={canvas}
            aria-label="Photo preview. Paint to erase or restore background edges."
            onPointerEnter={(event) => {
              if (!panning && event.pointerType !== 'touch') trackCursor(event)
            }}
            onPointerLeave={() => setCursor(null)}
            onPointerDown={(event) => {
              const source = working.current,
                ctx = source?.getContext('2d')
              if (!source || !ctx || busy || !event.isPrimary || event.button !== 0) return
              if (panning && viewport.current) {
                pan.current = {
                  x: event.clientX,
                  y: event.clientY,
                  left: viewport.current.scrollLeft,
                  top: viewport.current.scrollTop,
                }
                event.currentTarget.setPointerCapture(event.pointerId)
                return
              }
              setFuture([])
              setHistory((old) => [
                ...old.slice(-4),
                ctx.getImageData(0, 0, source.width, source.height),
              ])
              trackCursor(event)
              last.current = undefined
              event.currentTarget.setPointerCapture(event.pointerId)
              paint(point(event))
            }}
            onPointerMove={(event) => {
              if (panning) {
                if (pan.current && viewport.current) {
                  viewport.current.scrollLeft = pan.current.left - (event.clientX - pan.current.x)
                  viewport.current.scrollTop = pan.current.top - (event.clientY - pan.current.y)
                }
                return
              }
              trackCursor(event)
              if (event.currentTarget.hasPointerCapture(event.pointerId)) paint(point(event))
            }}
            onPointerUp={(event) => {
              pan.current = null
              last.current = undefined
              if (event.pointerType === 'touch') setCursor(null)
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            onPointerCancel={() => {
              pan.current = null
              last.current = undefined
              setCursor(null)
            }}
            onLostPointerCapture={() => {
              last.current = undefined
              pan.current = null
            }}
          />
          {cursor && (
            <span
              className="brush-cursor"
              aria-hidden="true"
              style={{
                left: cursor.x,
                top: cursor.y,
                width: cursor.diameter,
                height: cursor.diameter,
              }}
            />
          )}
        </div>
      </div>
      <p className="preview-caption">
        {panning
          ? 'Drag to move the zoomed preview. Select Move again to paint.'
          : 'Paint to erase or restore. Restore brings back original pixels, including the background.'}{' '}
        Preview zoom does not change your crop. Undo keeps the last five strokes.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="cleanup-toolbar">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            if (!history.length || window.confirm('Discard unapplied cleanup strokes?')) onCancel()
          }}
        >
          Cancel cleanup
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={async () => {
            if (!working.current) return
            setBusy(true)
            try {
              await onApply(await canvasToBlob(working.current, 'image/png'))
            } catch {
              setError('Could not apply cleanup. Please retry.')
              setBusy(false)
            }
          }}
        >
          {busy ? 'Applying…' : 'Apply cleanup'}
        </button>
      </div>
    </div>
  )
}
