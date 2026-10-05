interface NumberFieldProps {
  id: string
  label: string
  value: number
  unit: string
  min?: number
  max?: number
  step?: number
  readOnly?: boolean
  emptyWhenZero?: boolean
  onChange: (value: number) => void
}

export function NumberField({
  id,
  label,
  value,
  unit,
  min,
  max,
  step = 0.1,
  readOnly = false,
  emptyWhenZero = false,
  onChange,
}: NumberFieldProps) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="input-shell">
        <input
          id={id}
          type="number"
          value={emptyWhenZero && value === 0 ? '' : value}
          min={min}
          max={max}
          step={step}
          readOnly={readOnly}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="unit">{unit}</span>
      </span>
    </label>
  )
}