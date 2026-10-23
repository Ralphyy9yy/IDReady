import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import type { PhotoSize } from '../../types'

const format = (value: number) => String(Number(value.toFixed(4)))

export function CustomSize({size, sizes, onApply}: {size: PhotoSize; sizes: PhotoSize[]; onApply: (size: PhotoSize) => void}) {
  const [custom, setCustom] = useState(size.id === 'custom')
  const [unit, setUnit] = useState<'mm'|'in'>('mm')
  const [width, setWidth] = useState(format(size.widthMm))
  const [height, setHeight] = useState(format(size.heightMm))
  const factor = unit === 'in' ? 25.4 : 1
  const w = Number(width) * factor, h = Number(height) * factor
  const valid = width !== '' && height !== '' && Number.isFinite(w) && Number.isFinite(h) && w >= 10 && h >= 10 && w <= 150 && h <= 150
  return <section className="custom-size">
    <label>Photo size<select value={custom ? 'custom' : size.id} onChange={event => {
      if(event.target.value === 'custom') {
        setWidth(format(size.widthMm / factor)); setHeight(format(size.heightMm / factor)); setCustom(true)
      } else {setCustom(false); onApply(sizes.find(item => item.id === event.target.value)!)}
    }}>{sizes.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}<option value="custom">{size.id === 'custom' ? size.label : 'Custom size…'}</option></select></label>
    {custom && <form onSubmit={event => {
      event.preventDefault()
      if(valid) onApply({id:'custom', label:`Custom · ${format(w)} × ${format(h)} mm`, widthMm:w, heightMm:h})
    }}>
      <h2>Custom photo dimensions</h2>
      <div className="custom-dimensions-row">
        <label>Width<input type="number" step="any" required value={width} aria-invalid={!valid} aria-describedby="custom-size-help" onChange={event => setWidth(event.target.value)}/></label>
        <button className="icon-button custom-swap" type="button" aria-label="Swap width and height" title="Swap width and height" onClick={() => {setWidth(height); setHeight(width)}}><ArrowLeftRight/></button>
        <label>Height<input type="number" step="any" required value={height} aria-invalid={!valid} aria-describedby="custom-size-help" onChange={event => setHeight(event.target.value)}/></label>
        <label>Units<select value={unit} onChange={event => {
          const next = event.target.value as 'mm'|'in'
          const conversion = next === 'in' ? 1/25.4 : 25.4
          if(width !== '') setWidth(format(Number(width)*conversion))
          if(height !== '') setHeight(format(Number(height)*conversion))
          setUnit(next)
        }}><option value="mm">Millimetres</option><option value="in">Inches</option></select></label>
      </div>
      <p id="custom-size-help" aria-live="polite">{valid ? `${format(w)} × ${format(h)} mm · ${Math.round(w/25.4*300)} × ${Math.round(h/25.4*300)} px at 300 DPI` : 'Enter width and height between 10 and 150 mm (about 0.394–5.905 inches).'}</p>
      <button className="button secondary full" type="submit" disabled={!valid}>Apply dimensions</button>
    </form>}
  </section>
}
