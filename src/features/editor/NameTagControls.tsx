import type { NameTag, Transform } from '../../types'

export function NameTagControls({transform,onChange}:{transform:Transform;onChange:(transform:Transform)=>void}) {
  const nameTag: NameTag = transform.nameTag ?? {enabled:false,name:'',secondLine:'',fontSize:5,alignment:'center'}
  const updateNameTag = (patch:Partial<NameTag>) => onChange({...transform,nameTag:{...nameTag,...patch}})
  return <section className="name-tag-controls"><h2>Name tag</h2>
          <label className="check"><input type="checkbox" checked={nameTag.enabled} onChange={event => updateNameTag({ enabled: event.target.checked })} />Add a name tag</label>
          {nameTag.enabled && <>
            <label>Full name<input type="text" maxLength={80} value={nameTag.name} placeholder="e.g. JUAN DELA CRUZ" onChange={event => updateNameTag({ name: event.target.value })} /></label>
            <label>Second line (optional)<input type="text" maxLength={80} value={nameTag.secondLine} placeholder="e.g. Department or reference number" onChange={event => updateNameTag({ secondLine: event.target.value })} /></label>
            <div className="field-row"><label>Text size<select value={nameTag.fontSize} onChange={event => updateNameTag({ fontSize: Number(event.target.value) })}><option value={4}>Small</option><option value={5}>Medium</option><option value={6}>Large</option></select></label>
            <label>Alignment<select value={nameTag.alignment} onChange={event => updateNameTag({ alignment: event.target.value as NameTag['alignment'] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div>
            <p>The name tag overlays the bottom of your photo without moving the image. Long text automatically shrinks to fit.</p>
            <div className="notice">CSC photos require a physical hand-held name tag and handwritten signature. A digital name tag does not replace that requirement.</div>
          </>}
        </section>
}
