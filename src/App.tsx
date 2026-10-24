import { Camera, Check, ChevronLeft, ChevronRight, CloudOff, HelpCircle, ImagePlus, Lock, Save, Settings, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CameraDialog } from './features/capture/CameraDialog'
import { Brand } from './components/layout/Brand'
import { Background } from './components/layout/Background'
import { Editor } from './features/editor/Editor'
import { ExportPanel } from './features/export/ExportPanel'
import { getOfflineState } from './features/offline/offline'
import { OfflinePanel } from './features/offline/OfflinePanel'
import { decodeImage, renderPhoto, canvasToBlob } from './services/image-processing/render'
import { deleteDraft, getDraft, listDrafts, saveDraft } from './services/storage/db'
import { validateImage } from './lib/validation/image'
import { DraftGallery } from './features/drafts/DraftGallery'
import { PairBuilder } from './features/editor/PairBuilder'
import { CustomSize } from './features/editor/CustomSize'
import type { StoredDraft, PhotoSize, Stage, Transform } from './types'

const SIZES:PhotoSize[]=[
 {id:'1x1',label:'1 × 1 inch',widthMm:25.4,heightMm:25.4},
 {id:'2x2',label:'2 × 2 inches',widthMm:50.8,heightMm:50.8},
 {id:'35x45',label:'Passport size (PH) · 35 × 45 mm',widthMm:35,heightMm:45},
 {id:'csc',label:'CSC exam · 35 × 45 mm',widthMm:35,heightMm:45},
 {id:'prc-online',label:'PRC online · 2 × 2 inches',widthMm:50.8,heightMm:50.8},
 {id:'1-5x1-5',label:'1½ × 1½ inches',widthMm:38.1,heightMm:38.1},
 {id:'1x1-5',label:'1 × 1½ inches',widthMm:25.4,heightMm:38.1},
 {id:'asa',label:'ASA · 3 × 1.4 inches (landscape)',widthMm:76.2,heightMm:35.56},
]
const initialTransform:Transform={x:0,y:0,zoom:1,rotation:0,brightness:100,contrast:100,borderStyle:'none'}

export default function App(){const input=useRef<HTMLInputElement>(null);const job=useRef(0);const [drafts,setDrafts]=useState<StoredDraft[]>([]);const [activeDraft,setActiveDraft]=useState<string>();const [stage,setStage]=useState<Stage>('add');const [camera,setCamera]=useState(false);const [sourceBlob,setSourceBlob]=useState<Blob>();const [original,setOriginal]=useState<ImageBitmap>();const [image,setImage]=useState<ImageBitmap>();const [processedBlob,setProcessedBlob]=useState<Blob>();const [size,setSize]=useState(SIZES[2]);const [transform,setTransform]=useState(initialTransform);const [error,setError]=useState('');const [processing,setProcessing]=useState(false);const [bgError,setBgError]=useState('');const [showOriginal,setShowOriginal]=useState(false);const [settings,setSettings]=useState(false);const [offlineReady,setOfflineReady]=useState(false);const [draft,setDraft]=useState(false);const [status,setStatus]=useState('');
 useEffect(()=>{void getOfflineState().then(state=>setOfflineReady(state.app&&state.background&&state.face)).catch(()=>setOfflineReady(false));void listDrafts().then(items=>{setDrafts(items);setDraft(!!items.length)}).catch(()=>setStatus('Saved drafts are unavailable in this browser.'))},[])
 const load=async(blob:Blob)=>{
   const ticket=++job.current
   setProcessing(false);setError('');setBgError('')
   try{
     const bitmap=await decodeImage(blob)
     if(ticket!==job.current){bitmap.close();return}
     if(bitmap.width*bitmap.height>40_000_000){bitmap.close();throw new Error('Choose an image below 40 megapixels.')}
     original?.close();if(image!==original)image?.close()
     setActiveDraft(undefined);setSourceBlob(blob);setOriginal(bitmap);setImage(bitmap);setProcessedBlob(undefined);setTransform(initialTransform);setStage('edit');setShowOriginal(false)
     try{
       const {detectFace}=await import('./services/ai/client');const faces=await detectFace(bitmap)
       if(ticket!==job.current)return
       if(faces.length===1){const face=faces[0];setTransform(t=>({...t,x:(.5-(face.originX+face.width/2)/bitmap.width)*.35,y:(.38-(face.originY+face.height/2)/bitmap.height)*.35}));setStatus('Face found. Review the suggested crop.')}
       else setStatus(faces.length?'Multiple faces found. Position your photo manually.':'No face found. Position your photo manually.')
     }catch{if(ticket===job.current)setStatus('Face positioning is unavailable. You can continue manually.')}
   }catch(error){if(ticket===job.current)setError(error instanceof Error?error.message:'Could not open this image.')}
 }

 const choose=async(file?:File)=>{if(!file)return;try{await validateImage(file);await load(file)}catch(e){setError(e instanceof Error?e.message:'Invalid image.')}}
 const remove=async()=>{
   if(!original||processing)return
   const ticket=++job.current
   setProcessing(true);setBgError('');setShowOriginal(false)
   try{
     await new Promise<void>(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)))
     const {removeBackground}=await import('./services/ai/client')
     const blob=await removeBackground(original),result=await decodeImage(blob)
     if(ticket!==job.current){result.close();return}
     if(image!==original)image?.close();setImage(result);setProcessedBlob(blob);setStatus('Background removed. Review hair and shoulders; use Edge cleanup if needed.')
   }catch(error){if(ticket===job.current)setBgError((error instanceof Error?error.message:'Processing failed.')+' Your original is safe. Retry or continue manually.')}
   finally{if(ticket===job.current)setProcessing(false)}
 }
 const applyCleanup=async(blob:Blob)=>{
   const ticket=++job.current,result=await decodeImage(blob)
   if(ticket!==job.current){result.close();return}
   if(image!==original)image?.close();setImage(result);setProcessedBlob(blob);setShowOriginal(false);setStatus('Cleanup applied. Original photo retained.')
 }

 const resume=async(id='current')=>{
   job.current++;setProcessing(false)
   let restoredOriginal:ImageBitmap|undefined
   let restoredProcessed:ImageBitmap|undefined
   try {
     const d=await getDraft(id)
     if(!d){setDraft(false);setStatus('No saved draft was found.');return}
     restoredOriginal=await decodeImage(d.photo)
     if(d.processed)restoredProcessed=await decodeImage(d.processed)
     // Restoring bypasses import defaults and automatic face positioning.
     original?.close()
     if(image!==original)image?.close()
     setActiveDraft(d.id)
     setSourceBlob(d.photo)
     setOriginal(restoredOriginal)
     setImage(restoredProcessed??restoredOriginal)
     setProcessedBlob(d.processed)
     setSize(d.size)
     setTransform({...initialTransform,...d.transform})
     setShowOriginal(false)
     setBgError('')
     setError('')
     setDraft(true)
     setStage('edit')
     setStatus('Draft restored with your saved photo and adjustments.')
   } catch {
     restoredOriginal?.close()
     restoredProcessed?.close()
     setError('Could not restore the saved draft. Please retry. Your saved draft has not been deleted.')
   }
 }
 const refreshDrafts=async()=>{const items=await listDrafts();setDrafts(items);setDraft(!!items.length)}
 const deleteSaved=async(id:string)=>{if(!window.confirm('Delete this saved draft? This cannot be undone. Your open photo will stay available.'))return;try{await deleteDraft(id);if(activeDraft===id)setActiveDraft(undefined);await refreshDrafts();setStatus('Draft deleted.')}catch{setStatus('Could not delete this draft. Please retry.')}}
 const save=async()=>{
   if(!sourceBlob||!image)return
   const existing=drafts.find(item=>item.id===activeDraft)
   const name=window.prompt(existing?'Update this draft name:':'Name this new draft:',existing?.name??'ID photo')
   if(name===null)return
   if(!window.confirm(existing?'Update this saved draft with your current edits?':'Save this photo and its edits on this device?'))return
   try{
     const id=activeDraft??crypto.randomUUID()
     const thumbnail=await canvasToBlob(renderPhoto(image,image.width,image.height,size,transform,60),'image/jpeg')
     await saveDraft({id,name:name.trim().slice(0,80)||'ID photo',createdAt:existing?.createdAt??Date.now(),updatedAt:Date.now(),thumbnail,photo:sourceBlob,size,transform,processed:processedBlob})
     setActiveDraft(id);await refreshDrafts();setStatus('Draft saved on this device.')
   }catch{setStatus('Could not save the draft. Browser storage may be full or unavailable.')}
 }

 const next=()=>{if(stage==='edit')setStage('export')};const back=()=>setStage(stage==='export'?'edit':'add')
 return <><Background/><header className="app-header"><Brand onClick={()=>{setStage('add');window.scrollTo({top:0})}}/><div className="header-actions"><button className={`offline-pill ${offlineReady?'ready':''}`} onClick={()=>setSettings(true)}><span>{offlineReady?<Check/>:<CloudOff/>}</span>{offlineReady?'Offline ready':'Offline setup'}</button><button className="icon-button" onClick={()=>setSettings(true)} aria-label="Settings and help"><Settings/></button></div></header>
 <nav className="steps" aria-label="Progress">{(['add','edit','export'] as Stage[]).map((s,i)=><button key={s} className={stage===s?'active':sourceBlob&&(['add','edit'].includes(s))?'done':''} onClick={()=>{if(s==='add'||sourceBlob)setStage(s)}} disabled={s!=='add'&&!sourceBlob}><span>{i+1}</span>{s==='add'?'Add photo':s==='edit'?'Edit photo':'Export'}</button>)}</nav>
 <main>{stage==='add'&&<section className="start"><div className="start-copy"><h1>Print-ready ID photos, made simple.</h1><p>Take or upload a photo, choose your size, and prepare a printable sheet.</p><div className="start-actions"><button className="button primary large" onClick={()=>setCamera(true)}><Camera/>Take photo</button><button className="button secondary large" onClick={()=>input.current?.click()}><Upload/>Upload photo</button></div>{draft&&<a className="resume" href="#saved-drafts">View saved drafts <ChevronRight/></a>}<p className="privacy"><Lock/>Photos are processed in your browser and are never uploaded by IDReady.</p></div><label className="drop-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void choose(e.dataTransfer.files[0])}}><ImagePlus/><strong>Drop a photo here</strong><span>JPEG, PNG or WebP · up to 25 MB</span><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void choose(e.target.files?.[0])}/></label><div className="guidance"><h2>For a better result</h2><ul><li>Face the camera</li><li>Use even lighting</li><li>Keep head and shoulders visible</li><li>Avoid strong shadows</li></ul></div><div id="saved-drafts" style={{gridColumn:'1 / -1'}}><DraftGallery drafts={drafts} onResume={id=>void resume(id)} onDelete={id=>void deleteSaved(id)}/></div>{error&&<div className="notice error" role="alert">{error}</div>}</section>}
 {stage==='edit'&&image&&original&&<><div className="page-title"><div><button className="back-link" onClick={back}><ChevronLeft/>Change photo</button><h1>Edit photo</h1></div></div><Editor pairBuilder={size.id==='asa'&&<PairBuilder onUse={async blob=>{await load(blob);setSize(SIZES.find(item=>item.id==='asa')!)}}/>} sizeControl={<CustomSize size={size} sizes={SIZES} onApply={setSize}/>} image={image} original={original} size={size} transform={transform} onChange={setTransform} onRemove={remove} processing={processing} bgError={bgError} processed={!!processedBlob} showOriginal={showOriginal} onShowOriginal={setShowOriginal} onApply={applyCleanup}/><div className="desktop-actions"><button className="button secondary" onClick={save}><Save/>Save draft</button><button className="button primary" onClick={next}>Continue to export<ChevronRight/></button></div></>}
 {stage==='export'&&image&&<><div className="page-title"><div><button className="back-link" onClick={back}><ChevronLeft/>Back to edit</button><h1>Export & print</h1></div></div><ExportPanel image={image} size={size} transform={transform} onTransformChange={setTransform}/></>}</main>
 {stage==='edit'&&<div className="mobile-primary"><button className="button secondary" onClick={save}><Save/>Save draft</button><button className="button primary full" onClick={next}>Continue to export<ChevronRight/></button></div>}{status&&<div className="app-notice" role="status" aria-live="polite">{status}</div>}
 {camera&&<CameraDialog onClose={()=>setCamera(false)} onUpload={()=>{setCamera(false);input.current?.click()}} onUse={b=>{setCamera(false);void load(b)}}/>}{settings&&<div className="dialog-backdrop"><section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header><div><h2 id="settings-title">Offline & privacy</h2><p>Manage what this browser keeps.</p></div><button className="icon-button" onClick={()=>setSettings(false)} aria-label="Close">×</button></header><div className="settings-content"><OfflinePanel onReady={setOfflineReady}/><section><h3>Saved drafts</h3><p>{drafts.length} saved on this device. Each draft keeps its original, processed photo, name tag, and crop settings.</p><button className="button secondary full" onClick={()=>{setStage('add');setSettings(false);window.location.hash='saved-drafts'}}>Manage saved drafts</button></section><section><h3><HelpCircle/>Install & camera</h3><p>Install from your browser menu after visiting over HTTPS. Camera access also requires HTTPS (or localhost); plain HTTP on a LAN address is not sufficient.</p></section></div></section></div>}</>}
