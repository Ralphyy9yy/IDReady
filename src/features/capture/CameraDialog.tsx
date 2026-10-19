import { Camera, CameraIcon, RefreshCw, RotateCcw, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props { onUse: (blob: Blob) => void; onClose: () => void; onUpload: () => void }
export function CameraDialog({ onUse, onClose, onUpload }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | undefined>(undefined)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [shot, setShot] = useState<Blob>()
  const [shotUrl, setShotUrl] = useState('')
  const [countdown, setCountdown] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let ownedStream: MediaStream | undefined
    const element = video.current
    setReady(false); setError('')
    async function start() {
      try {
        if (!window.isSecureContext) throw new Error('Camera access needs HTTPS or localhost. Upload a photo instead.')
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot access a camera. Upload a photo instead.')
        const acquired = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
        })
        // Permission may resolve after cleanup, including React's development remount.
        if (cancelled) { acquired.getTracks().forEach(track => track.stop()); return }
        ownedStream = acquired; stream.current = acquired
        if (element) { element.srcObject = acquired; await element.play() }
        if (!cancelled) setReady(true)
      } catch (cause) {
        if (cancelled) return
        ownedStream?.getTracks().forEach(track => track.stop())
        const name = cause instanceof Error ? cause.name : ''
        setError(name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser settings, then retry or upload a photo.'
          : name === 'NotFoundError' ? 'No camera was found. Connect a camera or upload a photo.'
          : name === 'NotReadableError' ? 'The camera is busy or unavailable. Close other apps using it, then retry.'
          : cause instanceof Error ? cause.message : 'The camera could not start. Retry or upload a photo.')
      }
    }
    void start()
    return () => {
      cancelled = true
      ownedStream?.getTracks().forEach(track => track.stop())
      if (element && element.srcObject === ownedStream) element.srcObject = null
      if (stream.current === ownedStream) stream.current = undefined
    }
  }, [facing, retry])

  useEffect(() => {
    if (!shot) { setShotUrl(''); return }
    const url = URL.createObjectURL(shot); setShotUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [shot])

  function take() {
    const element = video.current
    if (!ready || !element?.videoWidth || !element.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = element.videoWidth; canvas.height = element.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) { setError('Could not capture this photo. Try uploading instead.'); return }
    if (facing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(element, 0, 0)
    canvas.toBlob(blob => {
      if (blob) setShot(blob)
      else setError('The photo could not be saved. Try again.')
    }, 'image/jpeg', .94)
  }

  useEffect(() => {
    if (!count) return
    const timer = window.setTimeout(() => { if (count === 1) take(); setCount(count - 1) }, 1000)
    return () => window.clearTimeout(timer)
    // Capture uses the current video element when the countdown completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])

  return <div className="dialog-backdrop" role="presentation"><section className="camera-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <header><div><h2 id="camera-title">Take a photo</h2><p>Align your head and shoulders inside the guide.</p></div><button className="icon-button" onClick={onClose} aria-label="Close camera"><X /></button></header>
    <div className="camera-view">
      <video ref={video} playsInline muted hidden={!!shot} className={facing === 'user' ? 'mirrored' : ''} />
      {shotUrl && <img src={shotUrl} alt="Captured preview" />}
      {!shot && !error && <div className="head-guide" aria-hidden="true" />}
      {!ready && !error && <div className="camera-starting" role="status">Starting camera…</div>}
      {count > 0 && <div className="countdown" role="status">{count}</div>}
    </div>
    {error && <div className="notice error camera-error" role="alert"><p>{error}</p><div className="button-pair"><button className="button secondary" onClick={() => { setCount(0); setRetry(n => n + 1) }}><RefreshCw />Retry</button><button className="button secondary" onClick={onUpload}><Upload />Upload photo</button></div></div>}
    <div className="camera-options"><label><input type="checkbox" checked={countdown} disabled={count > 0} onChange={e => setCountdown(e.target.checked)} /> 3-second countdown</label>{!shot && <button className="button quiet" disabled={count > 0} onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}><RotateCcw />Switch camera</button>}</div>
    <footer>{shot ? <><button className="button secondary" onClick={() => setShot(undefined)}><RefreshCw />Retake</button><button className="button primary" onClick={() => onUse(shot)}><CameraIcon />Use photo</button></> : <button className="capture-button" onClick={() => countdown ? setCount(3) : take()} disabled={!ready || !!error || count > 0} aria-label="Capture photo"><Camera /></button>}</footer>
  </section></div>
}
