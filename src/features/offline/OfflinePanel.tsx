import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { downloadAiAssets, getOfflineState, removeAiAssets } from './offline'
import type { OfflineState } from './offline'

export function OfflinePanel({onReady}:{onReady:(ready:boolean)=>void}) {
  const [state,setState]=useState<OfflineState>({app:false,runtime:false,background:false,face:false,update:false})
  const [checked,setChecked]=useState(false)
  const [verifying,setVerifying]=useState(false)
  const [progress,setProgress]=useState<number>()
  const [error,setError]=useState('')
  useEffect(()=>{
    let live=true
    const refresh=()=>{void getOfflineState().then(next=>{if(live){setState(next);setChecked(true);onReady(next.app&&next.background&&next.face)}}).catch(()=>{if(live){setChecked(true);setError('Browser storage is unavailable. Offline setup could not be checked.')}})}
    refresh();const timer=setInterval(refresh,8000)
    return ()=>{live=false;clearInterval(timer)}
  },[onReady])
  const refresh=async()=>{const next=await getOfflineState();setState(next);setChecked(true);onReady(next.app&&next.background&&next.face)}
  const ready=checked&&state.app&&state.background&&state.face
  const filesReady=state.background&&state.face
  const busy=progress!==undefined||verifying
  const missing=[!state.app&&'app files',!state.background&&'background removal files',!state.face&&'face detection files'].filter(Boolean)
  return <section className="offline-panel">
    <div className={`offline-summary ${ready&&!error?'is-ready':'is-incomplete'}`} role="status">
      {ready&&!error?<CheckCircle2 aria-hidden="true"/>:<AlertCircle aria-hidden="true"/>}
      <div><h3>{error?'Offline setup needs attention':!checked?'Checking offline setup…':ready?'Offline files ready':'Offline setup incomplete'}</h3>
      <p>{!checked?'Checking files stored in this browser.':ready&&!error?'Required files are stored on this device.':error?'The check or download could not finish. See the message below.':`Still needed: ${missing.join(', ')}.`}</p></div>
    </div>
    <ul className="offline-states">{[{label:'App files',ready:state.app},{label:'Background removal',ready:state.background},{label:'Face detection',ready:state.face}].map(item=><li key={item.label}><span>{item.label}</span><strong className={!checked?'status-neutral':item.ready?'status-ready':'status-missing'}>{!checked?'Checking…':item.ready?'Ready':'Not ready'}</strong></li>)}</ul>
    <p className="offline-update">{state.update?'Update available — save your work, close all app tabs, and reopen online when ready.':'No pending app update.'}</p>
    {progress!==undefined&&<><progress aria-label="Offline file download" value={progress} max={100}/><p role="status">{Math.round(progress)}% of required files downloaded</p></>}
    {error&&<div className="notice error" role="alert">{error}</div>}
    <button className="button primary full" disabled={busy||!checked} onClick={async()=>{
      setError('')
      if(filesReady){setVerifying(true);try{await refresh()}catch{setError('Could not check stored files. Please retry.')}finally{setVerifying(false)};return}
      setProgress(0)
      try{await downloadAiAssets((done,total)=>setProgress(done/total*100));await refresh()}catch{setError('Download failed. Check your connection and available storage, then retry.')}finally{setProgress(undefined)}
    }}>{progress!==undefined?'Setting up offline…':verifying?'Checking…':filesReady?'Check again':'Set up offline · ~51 MB'}</button>
    <p className="offline-short-note">Stored files are not a full processing test. Try an offline reload before relying on offline mode.</p>
    <details className="offline-details"><summary>How offline mode works</summary>
      <p>Setup downloads about 51 MB of AI model and runtime files. Installing the app alone does not download or verify all these files.</p>
      {!state.app&&<p>App files are cached on the deployed HTTPS site or a production preview. Reopen online after installation, then check again. The development server does not verify the production offline app.</p>}
      <p>Background removal and face detection run on your device. Readiness checks stored files, not a complete processing run. Browser storage can be cleared or evicted, so verify again if offline processing stops working.</p>
    </details>
    <details className="offline-details"><summary>Downloaded file storage</summary><p>Remove the AI files to free storage. Background removal and face detection will need setup again. Your saved drafts will stay.</p>
      <button className="button secondary full offline-remove" disabled={busy} onClick={async()=>{
        if(!window.confirm('Remove downloaded AI files? Background removal and face detection will need setup again. Saved drafts will be kept.'))return
        setError('')
        try{await removeAiAssets();await refresh()}catch{setError('Could not remove downloaded files. Please retry.')}
      }}>Remove downloaded AI files</button>
    </details>
  </section>
}
