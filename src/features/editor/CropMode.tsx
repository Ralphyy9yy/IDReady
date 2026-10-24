import { useEffect, useRef, useState } from 'react'
import { containScale } from '../../lib/geometry'
import { effectivePpi } from '../../lib/geometry/resolution'
import { drawPhoto } from '../../services/image-processing/render'
import type { PhotoSize, Transform } from '../../types'

export function CropMode({image,size,transform,onApply,onCancel}:{image:ImageBitmap;size:PhotoSize;transform:Transform;onApply:(crop:Pick<Transform,'x'|'y'|'zoom'|'rotation'>)=>void;onCancel:()=>void}) {
  const [draft,setDraft]=useState(transform)
  const canvas=useRef<HTMLCanvasElement>(null)
  const drag=useRef<{x:number;y:number;tx:number;ty:number}|null>(null)
  const ratio=size.widthMm/size.heightMm
  const frameW=Math.min(640,400*ratio),frameH=frameW/ratio
  const pad=60,width=frameW+pad*2,height=frameH+pad*2
  useEffect(()=>{
    const view=canvas.current,ctx=view?.getContext('2d')
    if(!view||!ctx)return
    view.width=width;view.height=height
    ctx.fillStyle='#e8edf4';ctx.fillRect(0,0,width,height)
    ctx.save()
    ctx.translate(pad+frameW/2+draft.x*frameW,pad+frameH/2+draft.y*frameH)
    ctx.rotate(draft.rotation*Math.PI/180)
    ctx.filter=`brightness(${draft.brightness}%) contrast(${draft.contrast}%)`
    const scale=containScale(image.width,image.height,frameW,frameH)*draft.zoom
    ctx.drawImage(image,-image.width*scale/2,-image.height*scale/2,image.width*scale,image.height*scale)
    ctx.restore()
    ctx.fillStyle='#0f172a99'
    ctx.fillRect(0,0,width,pad);ctx.fillRect(0,pad+frameH,width,pad)
    ctx.fillRect(0,pad,pad,frameH);ctx.fillRect(pad+frameW,pad,pad,frameH)
    ctx.save();ctx.translate(pad,pad);drawPhoto(ctx,image,image.width,image.height,frameW,frameH,draft);ctx.restore()
    ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(pad,pad,frameW,frameH)
    ctx.strokeStyle='#ffffffaa';ctx.lineWidth=1;ctx.setLineDash([5,5])
    for(const fraction of [1/3,2/3]){
      ctx.beginPath();ctx.moveTo(pad+frameW*fraction,pad);ctx.lineTo(pad+frameW*fraction,pad+frameH);ctx.stroke()
      ctx.beginPath();ctx.moveTo(pad,pad+frameH*fraction);ctx.lineTo(pad+frameW,pad+frameH*fraction);ctx.stroke()
    }
  },[draft,image,frameW,frameH,width,height])
  return <div className="crop-mode">
    <p className="crop-instruction">Drag the photo inside the frame. Dimmed areas will not be exported.<br/><span role="status">Estimated source resolution: {Math.round(effectivePpi(image.width,image.height,size,draft.zoom))} PPI. {effectivePpi(image.width,image.height,size,draft.zoom)<300?'More zoom may soften printed detail.':''}</span></p>
    <canvas ref={canvas} style={{width:`min(100%, calc(44dvh * ${width/height}))`}} aria-label="Crop preview. Drag the photo or use the crop controls." onPointerDown={event=>{
      if(!event.isPrimary||event.button!==0)return
      drag.current={x:event.clientX,y:event.clientY,tx:draft.x,ty:draft.y};event.currentTarget.setPointerCapture(event.pointerId)
    }} onPointerMove={event=>{
      if(!drag.current)return
      const rect=event.currentTarget.getBoundingClientRect(),start=drag.current
      setDraft(value=>({...value,x:Math.max(-.5,Math.min(.5,start.tx+(event.clientX-start.x)/rect.width*width/frameW)),y:Math.max(-.5,Math.min(.5,start.ty+(event.clientY-start.y)/rect.height*height/frameH))}))
    }} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}/>
    <div className="crop-fields">{([{key:'zoom',label:'Crop zoom',min:1,max:3,step:.01},{key:'rotation',label:'Crop rotation',min:-15,max:15,step:.1},{key:'x',label:'Crop horizontal position',min:-.5,max:.5,step:.01},{key:'y',label:'Crop vertical position',min:-.5,max:.5,step:.01}] as const).map(field=><label key={field.key}>{field.label}<input type="range" min={field.min} max={field.max} step={field.step} value={draft[field.key]} onChange={event=>setDraft(value=>({...value,[field.key]:Number(event.target.value)}))}/></label>)}</div>
    <div className="crop-actions"><button className="button secondary" onClick={()=>setDraft(value=>({...value,x:0,y:0,zoom:1,rotation:0}))}>Reset crop</button><button className="button secondary" onClick={onCancel}>Cancel crop</button><button className="button primary" onClick={()=>onApply(draft)}>Apply crop</button></div>
  </div>
}
