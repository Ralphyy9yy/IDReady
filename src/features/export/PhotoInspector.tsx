import { useEffect, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

export function PhotoInspector({src,ratio,onClose}:{src:string;ratio:number;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null)
  const [zoom,setZoom]=useState(100)
  useEffect(()=>{
    const element=dialog.current
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    element?.showModal()
    return()=>{element?.close();document.body.style.overflow=previous}
  },[])
  return <dialog ref={dialog} className="photo-inspector" aria-labelledby="photo-inspector-title" onCancel={event=>{event.preventDefault();onClose()}}>
    <header><div><h2 id="photo-inspector-title">Inspect final photo</h2><p>Check the crop, background edges, border, and name tag.</p></div><button className="icon-button" autoFocus aria-label="Close photo inspection" onClick={onClose}><X/></button></header>
    <div className="inspector-zoom" role="group" aria-label="Final photo zoom">
      <button className="icon-button" aria-label="Zoom out final photo" disabled={zoom===100} onClick={()=>setZoom(value=>Math.max(100,value-25))}><ZoomOut/></button>
      <output aria-live="polite">{zoom}%</output>
      <button className="icon-button" aria-label="Zoom in final photo" disabled={zoom===300} onClick={()=>setZoom(value=>Math.min(300,value+25))}><ZoomIn/></button>
      <button className="button quiet" onClick={()=>setZoom(100)}>Fit photo</button>
    </div>
    <div className="inspector-viewport" style={{height:`min(calc(60dvh + 32px), calc((100vw - 84px) / ${ratio} * ${zoom/100} + 32px))`}} tabIndex={0} aria-label="Enlarged final photo. Scroll when zoomed."><img src={src} alt="Enlarged final photo with applied crop, border and name tag" style={{width:`calc(min(100cqw - 32px, 60dvh * ${ratio}) * ${zoom/100})`}}/></div>
    <p className="inspector-note">Preview only — zoom does not change your photo or print dimensions. Press Escape to close.</p>
  </dialog>
}
