import { Camera, CameraIcon, RefreshCw, RotateCcw, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Props { onUse: (blob: Blob) => void; onClose: () => void; onUpload: () => void }
export function CameraDialog({ onUse, onClose, onUpload }: Props) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | undefined>(undefined); const [error, setError] = useState(''); const [facing, setFacing] = useState<'user'|'environment'>('user'); const [shot, setShot] = useState<Blob>(); const [countdown, setCountdown] = useState(false); const [count, setCount] = useState(0)
  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = undefined }
  const start = async () => { stop(); setError(''); try { if (!window.isSecureContext) throw new Error('Camera access needs HTTPS or localhost. Upload a photo instead.'); const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); stream.current = s; if (video.current) { video.current.srcObject = s; await video.current.play() } } catch (e) { setError(e instanceof Error ? e.message : 'Camera access was denied or unavailable.') } }
  // Restart when the requested camera direction changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void start(); return stop }, [facing])
  const capture = () => { const take = () => { const v = video.current; if (!v) return; const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext('2d'); if (!x) return; if (facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1) } x.drawImage(v, 0, 0); c.toBlob(b => b && setShot(b), 'image/jpeg', .94) }; if (!countdown) take(); else { setCount(3); const timer = setInterval(() => setCount(n => { if (n <= 1) { clearInterval(timer); take(); return 0 } return n - 1 }), 1000) } }
  return <div className="dialog-backdrop" role="presentation"><section className="camera-dialog" role="dialog" aria-modal="true" aria-labelledby="camera-title">
    <header><div><h2 id="camera-title">Take a photo</h2><p>Align your head and shoulders inside the guide.</p></div><button className="icon-button" onClick={() => { stop(); onClose() }} aria-label="Close camera"><X/></button></header>
    <div className="camera-view">{shot ? <img src={URL.createObjectURL(shot)} alt="Captured preview"/> : <video ref={video} playsInline muted className={facing === 'user' ? 'mirrored' : ''}/>}<div className="head-guide" aria-hidden="true"/>{count > 0 && <div className="countdown">{count}</div>}</div>
    {error && <div className="notice error" role="alert">{error}<button className="button secondary" onClick={onUpload}><Upload/>Upload photo</button></div>}
    <div className="camera-options"><label><input type="checkbox" checked={countdown} onChange={e => setCountdown(e.target.checked)}/> 3-second countdown</label>{!shot && <button className="button quiet" onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}><RotateCcw/>Switch camera</button>}</div>
    <footer>{shot ? <><button className="button secondary" onClick={() => setShot(undefined)}><RefreshCw/>Retake</button><button className="button primary" onClick={() => onUse(shot)}><CameraIcon/>Use photo</button></> : <button className="capture-button" onClick={capture} disabled={!!error} aria-label="Capture photo"><Camera/></button>}</footer>
  </section></div>
}
