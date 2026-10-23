import { useEffect, useRef, useState } from 'react'
import { validateImage } from '../../lib/validation/image'
import { canvasToBlob, decodeImage, drawPhoto } from '../../services/image-processing/render'
import type { Transform } from '../../types'

const initial:Transform={x:0,y:0,zoom:1,rotation:0,brightness:100,contrast:100,borderStyle:'none'}
interface Portrait {image:ImageBitmap;transform:Transform}
export function PairBuilder({onUse}:{onUse:(blob:Blob)=>Promise<void>}) {
  const [slots,setSlots]=useState<(Portrait|undefined)[]>([undefined,undefined])
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const owned=useRef<(ImageBitmap|undefined)[]>([])
  useEffect(()=>()=>owned.current.forEach(image=>image?.close()),[])
  const upload=async(index:number,file?:File)=>{
    if(!file)return
    try{
      await validateImage(file)
      const image=await decodeImage(file)
      if(image.width*image.height>40_000_000){image.close();throw new Error('Choose an image below 40 megapixels.')}
      owned.current[index]?.close();owned.current[index]=image
      setSlots(old=>old.map((item,i)=>i===index?{image,transform:{...initial}}:item));setError('')
    }catch(e){setError(e instanceof Error?e.message:'Could not load this portrait.')}
  }
  return <details className="pair-builder"><summary>Build an ASA pair from two photos</summary>
    <p>Each portrait has its own framing. Using the pair creates a combined photo; saving a draft afterward preserves that combined image.</p>
    <div className="pair-slots">{slots.map((slot,index)=><div className="pair-slot" key={index}>
      <label>Person {index+1}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>void upload(index,event.target.files?.[0])}/></label>
      {slot&&<><PairPreview portrait={slot}/>{(['zoom','x','y'] as const).map(key=><label key={key}>{key==='zoom'?'Zoom':key==='x'?'Horizontal position':'Vertical position'}<input type="range" min={key==='zoom'?1:-.5} max={key==='zoom'?3:.5} step={.01} value={slot.transform[key]} onChange={event=>{const value=Number(event.target.value);setSlots(old=>old.map((item,i)=>i===index&&item?{...item,transform:{...item.transform,[key]:value}}:item))}}/></label>)}</>}
    </div>)}</div>
    {error&&<p role="alert">{error}</p>}<button className="button primary" disabled={busy||slots.some(slot=>!slot)} onClick={async()=>{
      setBusy(true);setError('')
      try{
        const canvas=document.createElement('canvas');canvas.width=900;canvas.height=420
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable.')
        slots.forEach((slot,index)=>{if(!slot)return;ctx.save();ctx.beginPath();ctx.rect(index*450,0,450,420);ctx.clip();ctx.translate(index*450,0);drawPhoto(ctx,slot.image,slot.image.width,slot.image.height,450,420,slot.transform);ctx.restore()})
        await onUse(await canvasToBlob(canvas,'image/png'))
      }catch(e){setError(e instanceof Error?e.message:'Could not create pair.')}finally{setBusy(false)}
    }}>{busy?'Preparing pair…':'Use this pair'}</button>
  </details>
}
function PairPreview({portrait}:{portrait:Portrait}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{const ctx=canvas.current?.getContext('2d');if(ctx)drawPhoto(ctx,portrait.image,portrait.image.width,portrait.image.height,450,420,portrait.transform)},[portrait])
  return <canvas width={450} height={420} ref={canvas} aria-label="Portrait framing preview"/>
}
