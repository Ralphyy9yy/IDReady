import { useState } from 'react'
import type { PhotoSize } from '../../types'

export function CustomSize({onApply}:{onApply:(size:PhotoSize)=>void}) {
  const [unit,setUnit]=useState<'mm'|'in'>('mm')
  const [width,setWidth]=useState('35')
  const [height,setHeight]=useState('45')
  const [error,setError]=useState('')
  return <details className="custom-size"><summary>Custom photo dimensions</summary><form onSubmit={event=>{
    event.preventDefault()
    const w=Number(width)*(unit==='in'?25.4:1),h=Number(height)*(unit==='in'?25.4:1)
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<10||h<10||w>150||h>150){setError('Use dimensions between 10 and 150 mm (0.394–5.905 inches).');return}
    setError('');onApply({id:'custom',label:`Custom · ${width} × ${height} ${unit}`,widthMm:w,heightMm:h})
  }}>
    <div className="field-row"><label>Width<input type="number" step="any" required value={width} onChange={e=>setWidth(e.target.value)}/></label><label>Height<input type="number" step="any" required value={height} onChange={e=>setHeight(e.target.value)}/></label></div>
    <label>Units<select value={unit} onChange={e=>{const next=e.target.value as 'mm'|'in'; const factor=next==='in'?1/25.4:25.4;setWidth(String(Number((Number(width)*factor).toFixed(4))));setHeight(String(Number((Number(height)*factor).toFixed(4))));setUnit(next)}}><option value="mm">Millimetres</option><option value="in">Inches</option></select></label>
    {error&&<p role="alert">{error}</p>}<button className="button secondary" type="submit">Apply dimensions</button>
  </form></details>
}
