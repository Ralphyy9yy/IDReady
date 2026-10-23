import { useEffect, useState } from 'react'
import { downloadAiAssets, getOfflineState, removeAiAssets } from './offline'
import type { OfflineState } from './offline'

export function OfflinePanel({onReady}:{onReady:(ready:boolean)=>void}) {
  const [state,setState]=useState<OfflineState>({app:false,runtime:false,background:false,face:false,update:false})
  const [progress,setProgress]=useState<number>()
  const [error,setError]=useState('')
  useEffect(()=>{
    let live=true
    const refresh=()=>{void getOfflineState().then(next=>{if(live){setState(next);onReady(next.app&&next.background&&next.face)}}).catch(()=>{if(live)setError('Browser storage is unavailable. Offline setup could not be checked.')})}
    refresh();const timer=setInterval(refresh,8000)
    return ()=>{live=false;clearInterval(timer)}
  },[onReady])
  const refresh=async()=>{const next=await getOfflineState();setState(next);onReady(next.app&&next.background&&next.face)}
  return <section><h3>Offline readiness</h3><p>Download about 51 MB of model and runtime files on this device. Installation alone does not verify these files.</p>
    <ul className="offline-states"><li>Application shell<strong>{state.app?'Cached':'Not verified'}</strong></li><li>Background removal<strong>{state.background?'Cached':'Missing assets'}</strong></li><li>Face detection<strong>{state.face?'Cached':'Missing assets'}</strong></li><li>Update<strong>{state.update?'Available':'No waiting update'}</strong></li></ul>
    {!state.app&&<p>The app shell is cached on the deployed HTTPS site or production preview. Reopen online after first installation, then verify again.</p>}
    {state.update&&<p>An update is waiting. Save your work, close all app tabs, and reopen online when ready.</p>}
    {progress!==undefined&&<><progress value={progress} max={100}/><p role="status">{Math.round(progress)}% of required files downloaded</p></>}
    {error&&<div className="notice error" role="alert">{error}</div>}
    <button className="button primary full" disabled={progress!==undefined} onClick={async()=>{setProgress(0);setError('');try{await downloadAiAssets((done,total)=>setProgress(done/total*100));await refresh()}catch{setError('Download failed. Check your connection and available storage, then retry.')}finally{setProgress(undefined)}}}>Download / verify assets</button>
    <button className="button quiet full" disabled={progress!==undefined} onClick={async()=>{
      if(!window.confirm('Remove offline AI assets? Background removal will need a download again. Saved drafts will be kept.'))return
      try{await removeAiAssets();await refresh()}catch{setError('Could not remove cached assets. Please retry.')}
    }}>Remove AI assets</button>
    <p>Readiness checks stored files, not a complete inference. Test an offline reload before relying on it. Browser storage may be evicted.</p>
  </section>
}
