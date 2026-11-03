import { useEffect, useState } from 'react'

interface NumberFieldProps {
  value: number
  min: number
  max: number
  step: number
  onCommit: (value: number) => void
}

/** Keep incomplete input editable; normalize it on blur or Enter. */
export function NumberField({ value, min, max, step, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const parsed = Number(text)
    const bounded =
      text.trim() && Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value
    const next = step === 1 ? Math.round(bounded) : Math.round(bounded * 10) / 10
    setText(String(next))
    onCommit(next)
  }
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        const parsed = event.target.valueAsNumber
        if (
          Number.isFinite(parsed) &&
          parsed >= min &&
          parsed <= max &&
          (step !== 1 || Number.isInteger(parsed))
        )
          onCommit(parsed)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
