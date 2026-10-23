import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { StoredDraft } from '../../types'

export function DraftGallery({ drafts, onResume, onDelete }: { drafts: StoredDraft[]; onResume: (id:string)=>void; onDelete:(id:string)=>void }) {
  if (!drafts.length) return null
  return <section className="draft-gallery"><h2>Saved on this device</h2><div className="draft-list">{drafts.map(draft=><article className="draft-item" key={draft.id}>
    <Thumbnail blob={draft.thumbnail??draft.processed??draft.photo}/>
    <div><strong>{draft.name??'Saved photo'}</strong><p>{new Date(draft.updatedAt??draft.createdAt).toLocaleString()} · {draft.size.label}</p>
    <button className="button secondary" onClick={()=>onResume(draft.id)}>Resume</button></div>
    <button className="icon-button" aria-label={`Delete ${draft.name??'saved photo'}`} onClick={()=>onDelete(draft.id)}><Trash2/></button>
  </article>)}</div></section>
}
function Thumbnail({blob}:{blob:Blob}) {
  const [url,setUrl]=useState('')
  useEffect(()=>{const next=URL.createObjectURL(blob);setUrl(next);return ()=>URL.revokeObjectURL(next)},[blob])
  return <img src={url||undefined} alt="Saved photo thumbnail"/>
}
