import { Camera, Check, ChevronLeft, ChevronRight, CloudOff, ImagePlus, Lock, Save, Settings, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CameraDialog } from './features/capture/CameraDialog'
import { Brand } from './components/layout/Brand'
import { Background } from './components/layout/Background'
import { Editor } from './features/editor/Editor'
import { ExportPanel } from './features/export/ExportPanel'
import { getOfflineState } from './features/offline/offline'
import { SettingsDialog } from './features/offline/SettingsDialog'
import { decodeImage, renderPhoto, canvasToBlob } from './services/image-processing/render'
import { deleteDraft, getDraft, listDrafts, saveDraft } from './services/storage/db'
import { validateImage } from './lib/validation/image'
import { DraftGallery } from './features/drafts/DraftGallery'
import { PairBuilder } from './features/editor/PairBuilder'
import { CustomSize } from './features/editor/CustomSize'
import { defaultSheetSettings, sameAsaPair } from './features/drafts/state'
import type { AsaPair, SheetSettings, StoredDraft, PhotoSize, Stage, Transform } from './types'

const SIZES:PhotoSize[]=[
 {id:'1x1',label:'1 × 1 inch',widthMm:25.4,heightMm:25.4},
 {id:'2x2',label:'2 × 2 inches',widthMm:50.8,heightMm:50.8},
 {id:'35x45',label:'Passport size (PH) · 35 × 45 mm',widthMm:35,heightMm:45},
 {id:'csc',label:'CSC exam · 35 × 45 mm',widthMm:35,heightMm:45},
 {id:'prc-online',label:'PRC online · 2 × 2 inches',widthMm:50.8,heightMm:50.8},
 {id:'1-5x1-5',label:'1½ × 1½ inches',widthMm:38.1,heightMm:38.1},
 {id:'1x1-5',label:'1 × 1½ inches',widthMm:25.4,heightMm:38.1},
 {id:'asa',label:'ASA · 3 × 1.4 inches (landscape)',widthMm:76.2,heightMm:35.56},
 {id:'wallet',label:'Wallet · 2½ × 3½ inches',widthMm:63.5,heightMm:88.9},
]
interface SavedState {photo:Blob;processed?:Blob;edits:string;savedAt:number;pair?:AsaPair}
const editKey=(size:PhotoSize,transform:Transform,sheetSettings:SheetSettings)=>JSON.stringify({size,transform,sheetSettings})
const initialTransform:Transform={x:0,y:0,zoom:1,rotation:0,brightness:100,contrast:100,borderStyle:'none'}

export default function App(){const input=useRef<HTMLInputElement>(null);const job=useRef(0);const [drafts,setDrafts]=useState<StoredDraft[]>([]);const [activeDraft,setActiveDraft]=useState<string>();const [stage,setStage]=useState<Stage>('add');const [camera,setCamera]=useState(false);const [sourceBlob,setSourceBlob]=useState<Blob>();const [original,setOriginal]=useState<ImageBitmap>();const [image,setImage]=useState<ImageBitmap>();const [processedBlob,setProcessedBlob]=useState<Blob>();const [size,setSize]=useState(SIZES[2]);const [transform,setTransform]=useState(initialTransform);const [error,setError]=useState('');const [processing,setProcessing]=useState(false);const [bgError,setBgError]=useState('');const [showOriginal,setShowOriginal]=useState(false);const [settings,setSettings]=useState(false);const [offlineReady,setOfflineReady]=useState(false);const [draft,setDraft]=useState(false);const [status,setStatus]=useState('');
 const [sheetSettings,setSheetSettings]=useState(defaultSheetSettings)
 const [asaPair,setAsaPair]=useState<AsaPair>()
 const [documentVersion,setDocumentVersion]=useState(0)
 const [savedState,setSavedState]=useState<SavedState>()
 const [saving,setSaving]=useState(false)
 const [pendingEdits,setPendingEdits]=useState(false)
 const dirty=!!sourceBlob&&(!savedState||savedState.photo!==sourceBlob||savedState.processed!==processedBlob||savedState.edits!==editKey(size,transform,sheetSettings)||!sameAsaPair(savedState.pair,asaPair))
 const allowLeave=()=>!(dirty||pendingEdits)||window.confirm('You have unsaved changes. Leave this screen? Applied edits stay in memory, but unapplied crop or cleanup edits will be discarded. Save a draft to keep your work.')
 const allowReplace=()=>!sourceBlob||!(dirty||pendingEdits)||window.confirm('Replace your photo and discard its unsaved changes? Save a draft first if you want to keep this work.')
 const goHome=()=>{if(allowLeave()){setStage('add');window.scrollTo({top:0})}}
 useEffect(()=>{
   if(!dirty&&!pendingEdits)return
   const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
   window.addEventListener('beforeunload',warn)
   return()=>window.removeEventListener('beforeunload',warn)
 },[dirty,pendingEdits])
 useEffect(()=>{void getOfflineState().then(state=>setOfflineReady(state.app&&state.background&&state.face)).catch(()=>setOfflineReady(false));void listDrafts().then(items=>{setDrafts(items);setDraft(!!items.length)}).catch(()=>setStatus('Saved drafts are unavailable in this browser.'))},[])
 const load=async(blob:Blob)=>{
   if(!allowReplace())return
   if(saving){setStatus('Please wait for the draft to finish saving.');return}
   const ticket=++job.current
   setProcessing(false);setError('');setBgError('')
   try{
     const bitmap=await decodeImage(blob)
     if(ticket!==job.current){bitmap.close();return}
     if(bitmap.width*bitmap.height>40_000_000){bitmap.close();throw new Error('Choose an image below 40 megapixels.')}
     original?.close();if(image!==original)image?.close()
     setActiveDraft(undefined);setSavedState(undefined);setAsaPair(undefined);setSheetSettings(defaultSheetSettings());setDocumentVersion(value=>value+1);setSourceBlob(blob);setOriginal(bitmap);setImage(bitmap);setProcessedBlob(undefined);setTransform(initialTransform);setStage('edit');setShowOriginal(false)
     try{
       const {detectFace}=await import('./services/ai/client');const faces=await detectFace(bitmap)
       if(ticket!==job.current)return
       if(faces.length===1){const face=faces[0];setTransform(t=>({...t,x:(.5-(face.originX+face.width/2)/bitmap.width)*.35,y:(.38-(face.originY+face.height/2)/bitmap.height)*.35}));setStatus('Face found. Review the suggested crop.')}
       else setStatus(faces.length?'Multiple faces found. Position your photo manually.':'No face found. Position your photo manually.')
     }catch{if(ticket===job.current)setStatus('Face positioning is unavailable. You can continue manually.')}
   }catch(error){if(ticket===job.current)setError(error instanceof Error?error.message:'Could not open this image.')}
 }

 const applyPair=async(blob:Blob)=>{
   if(saving||processing)throw new Error('Wait for saving or background processing to finish, then apply the pair again.')
   if(processedBlob&&!window.confirm('Rebuild this ASA image? Cleanup on the combined image will reset. Portrait edits, name tag, border and sheet settings will be kept.'))throw new Error('Pair not applied. Your current photo is unchanged.')
   const ticket=++job.current
   const bitmap=await decodeImage(blob)
   if(ticket!==job.current){bitmap.close();return}
   original?.close();if(image!==original)image?.close()
   setSourceBlob(blob);setOriginal(bitmap);setImage(bitmap);setProcessedBlob(undefined);setShowOriginal(false)
   setTransform(value=>({...value,x:0,y:0,zoom:1,rotation:0}))
   setSize(SIZES.find(item=>item.id==='asa')!)
   setStatus('ASA pair applied. Save a draft to keep both editable portraits and sheet settings.')
 }
 const choose=async(file?:File)=>{if(!file)return;try{await validateImage(file);await load(file)}catch(e){setError(e instanceof Error?e.message:'Invalid image.')}finally{if(input.current)input.current.value=''}}
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
   if(!allowReplace()||saving)return
   const ticket=++job.current;setProcessing(false)
   let restoredOriginal:ImageBitmap|undefined
   let restoredProcessed:ImageBitmap|undefined
   try {
     const d=await getDraft(id)
     if(!d){setDraft(false);setStatus('No saved draft was found.');return}
     restoredOriginal=await decodeImage(d.photo)
     if(d.processed)restoredProcessed=await decodeImage(d.processed)
     if(ticket!==job.current){restoredOriginal.close();restoredProcessed?.close();return}
     // Restoring bypasses import defaults and automatic face positioning.
     original?.close()
     if(image!==original)image?.close()
     setSavedState({photo:d.photo,processed:d.processed,edits:editKey(d.size,{...initialTransform,...d.transform},d.sheetSettings??defaultSheetSettings()),pair:d.asaPair,savedAt:d.updatedAt??d.createdAt})
     setActiveDraft(d.id)
     setSourceBlob(d.photo)
     setOriginal(restoredOriginal)
     setImage(restoredProcessed??restoredOriginal)
     setProcessedBlob(d.processed)
     setSheetSettings(d.sheetSettings??defaultSheetSettings())
     setAsaPair(d.asaPair)
     setDocumentVersion(value=>value+1)
     setSize(d.size)
     setTransform({...initialTransform,...d.transform})
     setShowOriginal(false)
     setBgError('')
     setError('')
     setDraft(true)
     setStage(d.stage==='export'?'export':'edit')
     setStatus('Draft restored with your saved photo and adjustments.')
   } catch {
     restoredOriginal?.close()
     restoredProcessed?.close()
     setError('Could not restore the saved draft. Please retry. Your saved draft has not been deleted.')
   }
 }
 const refreshDrafts=async()=>{const items=await listDrafts();setDrafts(items);setDraft(!!items.length)}
 const deleteSaved=async(id:string)=>{if(!window.confirm('Delete this saved draft? This cannot be undone. Your open photo will stay available.'))return;try{await deleteDraft(id);if(activeDraft===id){setActiveDraft(undefined);setSavedState(undefined)};await refreshDrafts();setStatus('Draft deleted.')}catch{setStatus('Could not delete this draft. Please retry.')}}
 const save=async()=>{
   if(!sourceBlob||!image||saving||processing||pendingEdits)return
   const existing=drafts.find(item=>item.id===activeDraft)
   const name=window.prompt(existing?'Update this draft name:':'Name this new draft:',existing?.name??'ID photo')
   if(name===null)return
   if(!window.confirm(existing?'Update this saved draft with your current edits?':'Save this photo and its edits on this device?'))return
   setSaving(true)
   try{
     const savedAt=Date.now()
     const id=activeDraft??crypto.randomUUID()
     const thumbnail=await canvasToBlob(renderPhoto(image,image.width,image.height,size,transform,60),'image/jpeg')
     await saveDraft({id,name:name.trim().slice(0,80)||'ID photo',createdAt:existing?.createdAt??Date.now(),updatedAt:savedAt,thumbnail,photo:sourceBlob,size,transform,processed:processedBlob,sheetSettings,asaPair,stage:stage==='export'?'export':'edit'})
     setActiveDraft(id);setSavedState({photo:sourceBlob,processed:processedBlob,edits:editKey(size,transform,sheetSettings),pair:asaPair,savedAt});await refreshDrafts().catch(()=>undefined);setStatus('Draft saved on this device.')
   }catch{setStatus('Could not save the draft. Browser storage may be full or unavailable.')}finally{setSaving(false)}
 }

 const next=()=>{if(stage==='edit'&&(!pendingEdits||window.confirm('Discard unapplied crop or cleanup edits and continue to export?')))setStage('export')};const back=()=>{if(stage==='export')setStage('edit');else goHome()}
 return <><Background/><header className="app-header"><Brand onClick={goHome}/><div className="header-actions"><button className={`offline-pill ${offlineReady?'ready':''}`} onClick={()=>setSettings(true)}><span>{offlineReady?<Check/>:<CloudOff/>}</span>{offlineReady?'Offline ready':'Offline setup'}</button><button className="icon-button" onClick={()=>setSettings(true)} aria-label="Settings and help"><Settings/></button></div></header>
 <nav className="steps" aria-label="Progress">{(['add','edit','export'] as Stage[]).map((s,i)=><button key={s} className={stage===s?'active':sourceBlob&&(['add','edit'].includes(s))?'done':''} onClick={()=>{if(s==='add')goHome();else if(sourceBlob&&(!pendingEdits||s===stage||window.confirm('Discard unapplied crop or cleanup edits and change screen?')))setStage(s)}} disabled={s!=='add'&&!sourceBlob}><span>{i+1}</span>{s==='add'?'Add photo':s==='edit'?'Edit photo':'Export'}</button>)}</nav>
 <main>{sourceBlob&&<div className="draft-save-status" role="status" aria-live="polite"><span>{saving?'Saving draft…':pendingEdits?'Unapplied edits — Apply or cancel to save':dirty?'Unsaved changes':`Saved on this device at ${new Date(savedState!.savedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}</span>{stage!=='edit'&&<button className="button secondary" disabled={saving||processing||pendingEdits} onClick={save}><Save/>Save draft</button>}</div>}{stage==='add'&&<section className="start"><div className="start-copy"><h1>Print-ready ID photos, made simple.</h1><p>Take or upload a photo, choose your size, and prepare a printable sheet.</p><div className="start-actions"><button className="button primary large" onClick={()=>setCamera(true)}><Camera/>Take photo</button><button className="button secondary large" onClick={()=>input.current?.click()}><Upload/>Upload photo</button></div>{draft&&<a className="resume" href="#saved-drafts">View saved drafts <ChevronRight/></a>}<p className="privacy"><Lock/>Photos are processed in your browser and are never uploaded by IDReady.</p></div><label className="drop-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void choose(e.dataTransfer.files[0])}}><ImagePlus/><strong>Drop a photo here</strong><span>JPEG, PNG or WebP · up to 25 MB</span><input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void choose(e.target.files?.[0])}/></label><div className="guidance"><h2>For a better result</h2><ul><li>Face the camera</li><li>Use even lighting</li><li>Keep head and shoulders visible</li><li>Avoid strong shadows</li></ul></div><div id="saved-drafts" style={{gridColumn:'1 / -1'}}><DraftGallery drafts={drafts} onResume={id=>void resume(id)} onDelete={id=>void deleteSaved(id)}/></div>{error&&<div className="notice error" role="alert">{error}</div>}</section>}
 {stage==='edit'&&image&&original&&<><div className="page-title"><div><button className="back-link" onClick={back}><ChevronLeft/>Change photo</button><h1>Edit photo</h1></div></div><Editor onPendingChange={setPendingEdits} pairBuilder={size.id==='asa'&&<PairBuilder key={documentVersion} initialPair={asaPair} onChange={setAsaPair} onUse={applyPair}/>} sizeControl={<CustomSize size={size} sizes={SIZES} onApply={setSize}/>} image={image} original={original} size={size} transform={transform} onChange={setTransform} onRemove={remove} processing={processing} bgError={bgError} processed={!!processedBlob} showOriginal={showOriginal} onShowOriginal={setShowOriginal} onApply={applyCleanup}/><div className="desktop-actions"><button className="button secondary" disabled={saving||processing||pendingEdits} onClick={save}><Save/>Save draft</button><button className="button primary" onClick={next}>Continue to export<ChevronRight/></button></div></>}
 {stage==='export'&&image&&<><div className="page-title"><div><button className="back-link" onClick={back}><ChevronLeft/>Back to edit</button><h1>Export & print</h1></div></div><ExportPanel settings={sheetSettings} onSettingsChange={setSheetSettings} image={image} size={size} transform={transform} onTransformChange={setTransform}/></>}</main>
 {stage==='edit'&&<div className="mobile-primary"><button className="button secondary" disabled={saving||processing||pendingEdits} onClick={save}><Save/>Save draft</button><button className="button primary full" onClick={next}>Continue to export<ChevronRight/></button></div>}{status&&<div className="app-notice" role="status" aria-live="polite">{status}</div>}
 {camera&&<CameraDialog onClose={()=>setCamera(false)} onUpload={()=>{setCamera(false);input.current?.click()}} onUse={b=>{setCamera(false);void load(b)}}/>}{settings&&<SettingsDialog draftCount={drafts.length} onReady={setOfflineReady} onClose={()=>setSettings(false)} onManageDrafts={()=>{if(allowLeave()){setStage('add');setSettings(false);window.location.hash='saved-drafts'}}}/>}</>}
