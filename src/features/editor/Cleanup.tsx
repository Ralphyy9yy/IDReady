import { useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../../services/image-processing/render'

export function Cleanup({original,processed,onApply}:{original:ImageBitmap;processed:ImageBitmap;onApply:(blob:Blob)=>Promise<void>}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const last=useRef<{x:number;y:number}|undefined>(undefined)
  const [mode,setMode]=useState<'erase'|'restore'>('erase')
  const [brush,setBrush]=useState(30)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [history,setHistory]=useState<ImageData[]>([])
  useEffect(()=>{
    const c=canvas.current;if(!c)return
    const scale=Math.min(1,1600/Math.max(processed.width,processed.height))
    c.width=Math.round(processed.width*scale);c.height=Math.round(processed.height*scale)
    c.getContext('2d')?.drawImage(processed,0,0,c.width,c.height);setHistory([])
  },[processed])
  function paint(x:number,y:number) {
    const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return
    const from=last.current??{x,y}
    ctx.save();ctx.beginPath();ctx.lineWidth=brush;ctx.lineCap='round';ctx.moveTo(from.x,from.y);ctx.lineTo(x,y)
    if(mode==='erase'){ctx.strokeStyle='#fff';ctx.stroke()}
    else {
      // Clip to a round brush swept between pointer samples; reveal original pixels.
      const steps=Math.max(1,Math.ceil(Math.hypot(x-from.x,y-from.y)/(brush/4)))
      ctx.beginPath()
      for(let i=0;i<=steps;i++){const px=from.x+(x-from.x)*i/steps,py=from.y+(y-from.y)*i/steps;ctx.moveTo(px+brush/2,py);ctx.arc(px,py,brush/2,0,Math.PI*2)}
      ctx.clip();ctx.drawImage(original,0,0,c.width,c.height)
    }
    ctx.restore();last.current={x,y}
  }
  return <section className="cleanup-panel"><h2>Edge cleanup</h2><p>Erase unwanted areas to white or restore original pixels. This is a bounded-resolution editing copy (up to 1600 px); applying replaces the processed image, while the original stays available.</p>
    <div className="cleanup-toolbar"><button className={`button secondary ${mode==='erase'?'active':''}`} aria-pressed={mode==='erase'} onClick={()=>setMode('erase')}>Erase</button><button className={`button secondary ${mode==='restore'?'active':''}`} aria-pressed={mode==='restore'} onClick={()=>setMode('restore')}>Restore</button>
    <button className="button secondary" disabled={!history.length} onClick={()=>{const ctx=canvas.current?.getContext('2d');const previous=history[history.length-1];if(ctx&&previous)ctx.putImageData(previous,0,0);setHistory(old=>old.slice(0,-1))}}>Undo stroke</button></div>
    <label>Brush size: {brush} px<input type="range" min="5" max="100" value={brush} onChange={e=>setBrush(Number(e.target.value))}/></label>
    <canvas ref={canvas} aria-label="Draw with your pointer to erase or restore image edges" onPointerDown={event=>{
      const c=event.currentTarget,ctx=c.getContext('2d');if(!ctx||!event.isPrimary||busy)return
      setHistory(old=>[...old.slice(-4),ctx.getImageData(0,0,c.width,c.height)])
      c.setPointerCapture(event.pointerId);const r=c.getBoundingClientRect();paint((event.clientX-r.left)*c.width/r.width,(event.clientY-r.top)*c.height/r.height)
    }} onPointerMove={event=>{if(!event.currentTarget.hasPointerCapture(event.pointerId))return;const c=event.currentTarget,r=c.getBoundingClientRect();paint((event.clientX-r.left)*c.width/r.width,(event.clientY-r.top)*c.height/r.height)}} onPointerUp={event=>{last.current=undefined;event.currentTarget.releasePointerCapture(event.pointerId)}} onPointerCancel={()=>last.current=undefined}/>
    {error&&<p role="alert">{error}</p>}<button className="button primary" disabled={busy} onClick={async()=>{if(!canvas.current)return;setBusy(true);try{await onApply(await canvasToBlob(canvas.current,'image/png'))}catch{setError('Could not apply cleanup. Please retry.')}finally{setBusy(false)}}}>{busy?'Applying…':'Apply cleanup'}</button>
  </section>
}
