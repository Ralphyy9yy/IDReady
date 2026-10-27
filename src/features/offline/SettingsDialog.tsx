import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { OfflinePanel } from './OfflinePanel'

const tabs=[{id:'offline',label:'Offline'},{id:'drafts',label:'Saved drafts'},{id:'help',label:'Help'}] as const
export function SettingsDialog({draftCount,onReady,onClose,onManageDrafts}:{draftCount:number;onReady:(ready:boolean)=>void;onClose:()=>void;onManageDrafts:()=>void}) {
  const [tab,setTab]=useState<typeof tabs[number]['id']>('offline')
  const dialog=useRef<HTMLDialogElement>(null)
  const opener=useRef(document.activeElement instanceof HTMLElement?document.activeElement:null)
  const content=useRef<HTMLDivElement>(null)
  const buttons=useRef<(HTMLButtonElement|null)[]>([])
  useEffect(()=>{
    const element=dialog.current,previous=document.body.style.overflow,trigger=opener.current
    document.body.style.overflow='hidden';element?.showModal()
    return()=>{element?.close();document.body.style.overflow=previous;requestAnimationFrame(()=>trigger?.focus({preventScroll:true}))}
  },[])
  const select=(id:typeof tab)=>{setTab(id);if(content.current)content.current.scrollTop=0}
  return <dialog ref={dialog} className="settings-dialog tabbed-settings" aria-labelledby="settings-title" onCancel={event=>{event.preventDefault();onClose()}}>
    <header><div><h2 id="settings-title">Offline & privacy</h2><p>Manage this browser and device.</p></div><button className="icon-button" autoFocus onClick={onClose} aria-label="Close"><X aria-hidden="true"/></button></header>
    <div className="settings-tabs" role="tablist" aria-label="Settings sections">{tabs.map((item,index)=><button key={item.id} ref={element=>{buttons.current[index]=element}} role="tab" id={`settings-tab-${item.id}`} aria-controls={`settings-panel-${item.id}`} aria-selected={tab===item.id} tabIndex={tab===item.id?0:-1} onClick={()=>select(item.id)} onKeyDown={event=>{
      let next=index
      if(event.key==='ArrowRight')next=(index+1)%tabs.length
      else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length
      else if(event.key==='Home')next=0
      else if(event.key==='End')next=tabs.length-1
      else return
      event.preventDefault();select(tabs[next].id);buttons.current[next]?.focus()
    }}>{item.label}</button>)}</div>
    <div className="settings-content" ref={content}>
      <div role="tabpanel" id="settings-panel-offline" aria-labelledby="settings-tab-offline" hidden={tab!=='offline'}><OfflinePanel onReady={onReady}/></div>
      <div role="tabpanel" id="settings-panel-drafts" aria-labelledby="settings-tab-drafts" hidden={tab!=='drafts'}><section><h3>Saved on this device</h3><p>{draftCount} saved {draftCount===1?'draft':'drafts'}. Each draft keeps its original, processed photo, name tag, and crop settings.</p><button className="button secondary full" onClick={onManageDrafts}>Manage saved drafts</button><p>Drafts stay in this browser. Clearing browser storage can remove them; downloading a photo does not create a draft.</p></section></div>
      <div role="tabpanel" id="settings-panel-help" aria-labelledby="settings-tab-help" hidden={tab!=='help'}><section><h3>Privacy</h3><p>Your photos are processed on this device and are not uploaded by IDReady. Save a draft only when you want this browser to keep a copy.</p></section><section><h3>Install & camera</h3><p>Install from your browser menu after visiting over HTTPS. Camera access requires HTTPS or localhost; plain HTTP on a local network address is not sufficient.</p></section><section><h3>Using offline mode</h3><p>Complete setup while online, reopen the app, then test an offline reload. The Offline tab checks required files; it does not guarantee a successful background-removal run.</p></section></div>
    </div>
  </dialog>
}
