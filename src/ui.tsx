import type { ReactNode } from 'react'

export function Segmented<T extends string>(props: {
  value: T | null
  options: { value: T; label: string; tone?: string }[]
  onChange: (v: T | null) => void
  allowClear?: boolean
}) {
  return (
    <div className="seg" role="radiogroup">
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          className={`${props.value === o.value ? 'on' : ''} ${o.tone ?? ''}`}
          onClick={() => props.onChange(props.allowClear && props.value === o.value ? null : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field(props: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="label">{props.label}</span>
      {props.children}
      {props.hint && <span className="hint">{props.hint}</span>}
    </label>
  )
}

export function Text(props: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={props.rows ?? 2}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  )
}

export function NumberInput(props: { value: number | null; onChange: (v: number | null) => void; placeholder?: string; step?: number }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={props.step ?? 0.5}
      value={props.value ?? ''}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}

export function Card(props: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="card">
      {(props.title || props.aside) && (
        <header>
          <h2>{props.title}</h2>
          {props.aside}
        </header>
      )}
      {props.children}
    </section>
  )
}

export function Stat(props: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className={`stat ${props.tone ?? ''}`}>
      <div className="v">{props.value}</div>
      <div className="l">{props.label}</div>
      {props.sub && <div className="s">{props.sub}</div>}
    </div>
  )
}
