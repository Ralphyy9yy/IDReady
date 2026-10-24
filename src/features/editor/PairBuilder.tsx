import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, ImagePlus, RotateCcw } from 'lucide-react'
import { validateImage } from '../../lib/validation/image'
import { canvasToBlob, decodeImage, drawPhoto } from '../../services/image-processing/render'
import type { Transform } from '../../types'

const initial:Transform={x:0,y:0,zoom:1,rotation:0,brightness:100,contrast:100,borderStyle:'none'}
interface Portrait {image:ImageBitmap;transform:Transform}
function drawPair(canvas:HTMLCanvasElement,slots:(Portrait|undefined)[]) {
  canvas.width=900;canvas.height=420
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable.')
  ctx.fillStyle='#f0f3f8';ctx.fillRect(0,0,900,420)
  slots.forEach((slot,index)=>{
    if(!slot){ctx.fillStyle='#68788e';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(index===0?'Left person':'Right person',index*450+225,220);return}
    ctx.save();ctx.beginPath();ctx.rect(index*450,0,450,420);ctx.clip();ctx.translate(index*450,0)
    drawPhoto(ctx,slot.image,slot.image.width,slot.image.height,450,420,slot.transform);ctx.restore()
  })
}
export function PairBuilder({onUse}:{onUse:(blob:Blob)=>Promise<void>}) {
  const [slots,setSlots]=useState<(Portrait|undefined)[]>([undefined,undefined])
  const [selected,setSelected]=useState(0)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState([false,false])
  const canvas=useRef<HTMLCanvasElement>(null)
  const details=useRef<HTMLDetailsElement>(null)
  const owned=useRef<(ImageBitmap|undefined)[]>([])
  const jobs=useRef([0,0])
  const mounted=useRef(true)
  useEffect(()=>{const images=owned.current;mounted.current=true;return()=>{mounted.current=false;jobs.current=jobs.current.map(job=>job+1);images.forEach(image=>image?.close())}},[])
  useEffect(()=>{if(canvas.current)drawPair(canvas.current,slots)},[slots])
  const upload=async(index:number,file?:File)=>{
    if(!file)return
    const ticket=++jobs.current[index]
    setLoading(old=>old.map((value,i)=>i===index?true:value));setError('')
    try{
      await validateImage(file)
      const image=await decodeImage(file)
      if(!mounted.current||ticket!==jobs.current[index]){image.close();return}
      if(image.width*image.height>40_000_000){image.close();throw new Error('Choose an image below 40 megapixels.')}
      owned.current[index]?.close();owned.current[index]=image
      setSlots(old=>old.map((item,i)=>i===index?{image,transform:{...initial}}:item));setSelected(index)
    }catch(e){if(mounted.current&&ticket===jobs.current[index])setError(e instanceof Error?e.message:'Could not load this portrait.')}
    finally{if(mounted.current&&ticket===jobs.current[index])setLoading(old=>old.map((value,i)=>i===index?false:value))}
  }
  const blocked=busy||loading.some(Boolean)
  const active=slots[selected]
  return <details className="pair-builder compact-pair" ref={details}><summary>Build an ASA pair from two photos</summary>
    <p>Combine two portraits into one 3 × 1.4 inch ASA photo.</p>
    <div className="pair-upload-cards">{slots.map((slot,index)=><label className="pair-upload-card" key={index}>
      {slot?<PairPreview portrait={slot}/>:<ImagePlus/>}
      <strong>{index===0?'Left person':'Right person'}</strong>
      <span>{loading[index]?'Loading…':slot?'Replace photo':'Choose photo'}</span>
      <input className="pair-file-input" aria-label={`Person ${index+1}`} type="file" disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={event=>{void upload(index,event.target.files?.[0]);event.target.value=''}}/>
    </label>)}</div>
    <canvas className="pair-combined" ref={canvas} aria-label="Combined ASA pair preview"/>
    <div className="pair-selection" role="group" aria-label="Select portrait to adjust">
      {[0,1].map(index=><button className="button secondary" key={index} aria-pressed={selected===index} disabled={blocked} onClick={()=>setSelected(index)}>{index===0?'Left':'Right'}</button>)}
      <button className="icon-button" title="Swap people" aria-label="Swap people" disabled={blocked||slots.every(slot=>!slot)} onClick={()=>{owned.current.reverse();setSlots(old=>[old[1],old[0]]);setSelected(1-selected)}}><ArrowLeftRight/></button>
      <button className="icon-button" title="Reset selected portrait" aria-label="Reset selected portrait" disabled={blocked||!active} onClick={()=>setSlots(old=>old.map((item,i)=>i===selected&&item?{...item,transform:{...initial}}:item))}><RotateCcw/></button>
    </div>
    {active&&<div className="pair-adjustments">{(['zoom','x','y'] as const).map(key=><label key={key}>{key==='zoom'?'Portrait zoom':key==='x'?'Portrait horizontal position':'Portrait vertical position'}<input type="range" disabled={blocked} min={key==='zoom'?1:-.5} max={key==='zoom'?3:.5} step={.01} value={active.transform[key]} onChange={event=>{const value=Number(event.target.value);setSlots(old=>old.map((item,i)=>i===selected&&item?{...item,transform:{...item.transform,[key]:value}}:item))}}/></label>)}</div>}
    <p role="status">{loading.some(Boolean)?'Loading portraits…':slots.some(slot=>!slot)?'Add both photos to continue.':'Both photos ready. Review framing before applying.'}</p>
    <p className="pair-save-note">Applying creates one combined image. Save a draft afterward to keep it; individual portrait edits are not stored in the draft.</p>
    {error&&<p role="alert">{error}</p>}<button className="button primary full" disabled={blocked||slots.some(slot=>!slot)} onClick={async()=>{
      setBusy(true);setError('')
      try{
        const output=document.createElement('canvas');drawPair(output,slots)
        await onUse(await canvasToBlob(output,'image/png'))
        if(details.current)details.current.open=false
      }catch(e){setError(e instanceof Error?e.message:'Could not create pair.')}finally{setBusy(false)}
    }}>{busy?'Preparing pair…':'Use this pair'}</button>
  </details>
}
function PairPreview({portrait}:{portrait:Portrait}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{const ctx=canvas.current?.getContext('2d');if(ctx)drawPhoto(ctx,portrait.image,portrait.image.width,portrait.image.height,450,420,portrait.transform)},[portrait])
  return <canvas width={450} height={420} ref={canvas} aria-hidden="true"/>
}
