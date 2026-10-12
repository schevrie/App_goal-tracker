import { useState } from 'react'
import type { Data, Item, ItemStatus, Week } from './types'
import type { Update } from './store'
import { addDays, fmt, mondayOf, today } from './dates'
import { pct, weekMetrics } from './metrics'
import { MAX_MUST_WINS, blankWeek, carry, carryCandidates, newItem, previousWeek } from './model'
import { Card, Field, NumberInput, Segmented, Stat, Text } from './ui'

const STATUS: { value: ItemStatus; label: string; tone?: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'partial', label: 'Partial', tone: 'warn' },
  { value: 'done', label: 'Done', tone: 'good' },
  { value: 'dropped', label: 'Dropped', tone: 'muted' },
]

const CAPACITY = {
  unset: 'Set your focus hours',
  over: 'Overcommitted',
  under: 'Room for more',
  balanced: 'Balanced',
}

function ItemRow(props: { item: Item; onChange: (i: Item) => void; onRemove: () => void; hoursOptional?: boolean }) {
  const { item, onChange } = props
  return (
    <div className={`item ${item.status}`}>
      <input
        className="title"
        value={item.title}
        placeholder={props.hoursOptional ? 'Smaller item' : 'Must-win outcome'}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
      />
      <div className="row">
        <Segmented
          value={item.type}
          options={[
            { value: 'needle', label: 'Needle' },
            { value: 'support', label: 'Support' },
          ]}
          onChange={(type) => type && onChange({ ...item, type })}
        />
        <div className="hours">
          <NumberInput value={item.hours} placeholder={props.hoursOptional ? 'h?' : 'h'} onChange={(hours) => onChange({ ...item, hours })} />
          <span>h</span>
        </div>
      </div>
      <div className="row">
        <Segmented value={item.status} options={STATUS} onChange={(status) => status && onChange({ ...item, status })} />
        <button className="link danger" onClick={props.onRemove} aria-label="Remove">✕</button>
      </div>
      {item.carriedFrom && <span className="tag">carried over</span>}
    </div>
  )
}

function PlanStart(props: { data: Data; update: Update; start: string }) {
  const { data, start } = props
  const prev = previousWeek(data, start)
  const candidates = carryCandidates(prev)
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(candidates.map((c) => [c.item.id, true]))
  )

  const create = () => {
    const w = blankWeek(data, start)
    for (const c of candidates) {
      if (!picked[c.item.id]) continue
      if (c.list === 'mustWins' && w.mustWins.length < MAX_MUST_WINS) w.mustWins.push(carry(c.item))
      else w.smaller.push(carry(c.item))
    }
    props.update((d) => ({ ...d, weeks: { ...d.weeks, [start]: w } }))
  }

  return (
    <Card title="Monday planning">
      {candidates.length > 0 ? (
        <>
          <p>Unfinished from the week of {fmt(prev!.start, { day: 'numeric', month: 'short' })}. Untick anything you're dropping.</p>
          <ul className="checks">
            {candidates.map(({ item }) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!picked[item.id]}
                    onChange={(e) => setPicked({ ...picked, [item.id]: e.target.checked })}
                  />
                  {item.title} <span className="muted">({item.status})</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Nothing to carry over.</p>
      )}
      <button className="primary" onClick={create}>Start planning this week</button>
    </Card>
  )
}

export default function WeekView(props: { data: Data; update: Update; start: string; setStart: (s: string) => void }) {
  const { data, update, start } = props
  const week = data.weeks[start]
  const isCurrent = start === mondayOf(today())

  const nav = (
    <div className="weeknav">
      <button onClick={() => props.setStart(addDays(start, -7))} aria-label="Previous week">‹</button>
      <div>
        <h1 className="page">Week of {fmt(start, { day: 'numeric', month: 'short', year: 'numeric' })}</h1>
        {!isCurrent && (
          <button className="link" onClick={() => props.setStart(mondayOf(today()))}>Go to this week</button>
        )}
      </div>
      <button onClick={() => props.setStart(addDays(start, 7))} aria-label="Next week">›</button>
    </div>
  )

  if (!week) return <>{nav}<PlanStart key={start} data={data} update={update} start={start} /></>

  const set = (patch: Partial<Week>) => update((d) => ({ ...d, weeks: { ...d.weeks, [start]: { ...d.weeks[start], ...patch } } }))
  const setList = (list: 'mustWins' | 'smaller', items: Item[]) => set({ [list]: items })
  const m = weekMetrics(data, week)
  const goals = data.settings.goals.filter((g) => g.active)
  const util = week.focusHours > 0 ? m.plannedHours / week.focusHours : 0

  const list = (key: 'mustWins' | 'smaller') =>
    week[key].map((item, idx) => (
      <ItemRow
        key={item.id}
        item={item}
        hoursOptional={key === 'smaller'}
        onChange={(i) => setList(key, week[key].map((x, j) => (j === idx ? i : x)))}
        onRemove={() => setList(key, week[key].filter((_, j) => j !== idx))}
      />
    ))

  return (
    <>
      {nav}

      <div className="stats">
        <Stat label="Must-wins done" value={pct(m.execution)} sub={m.execution === null ? 'not closed yet' : 'by hours'} />
        <Stat
          label="Needle work"
          value={pct(m.needle)}
          sub={`target ${pct(data.settings.needleTarget)}`}
          tone={m.needle === null ? '' : Math.abs(m.needle - data.settings.needleTarget) <= 0.1 ? 'good' : 'warn'}
        />
        <Stat
          label="Decisive meetings"
          value={pct(m.decisiveness)}
          sub={m.meetingsUnrated ? `${m.meetingsUnrated} unrated` : `${m.meetingsRated} rated`}
        />
        <Stat label="Check-ins" value={`${m.checkinDays}/5`} />
      </div>

      <Card
        title={week.mustWins.length > MAX_MUST_WINS ? 'Must-wins' : `Must-wins (${week.mustWins.length}/${MAX_MUST_WINS})`}
        aside={
          <button disabled={week.mustWins.length >= MAX_MUST_WINS} onClick={() => setList('mustWins', [...week.mustWins, newItem()])}>
            + Add
          </button>
        }
      >
        {week.mustWins.length === 0 && <p className="muted">The 3 outcomes that make this week a win.</p>}
        {list('mustWins')}
      </Card>

      <Card
        title="Smaller items"
        aside={<button onClick={() => setList('smaller', [...week.smaller, { ...newItem(), type: 'support' }])}>+ Add</button>}
      >
        {week.smaller.length === 0 && <p className="muted">Everything else worth tracking this week.</p>}
        {list('smaller')}
      </Card>

      <Card title="Capacity">
        <div className="row">
          <Field label="Focus hours available">
            <NumberInput value={week.focusHours} step={1} onChange={(v) => set({ focusHours: v ?? 0 })} />
          </Field>
          <Field label="Hours planned">
            <div className="big">{m.plannedHours}</div>
          </Field>
        </div>
        <div className={`bar ${m.capacity}`}>
          <div style={{ width: `${Math.min(util, 1.5) / 1.5 * 100}%` }} />
          <span className="mark" style={{ left: `${100 / 1.5}%` }} />
        </div>
        <p className={`capacity ${m.capacity}`}>{CAPACITY[m.capacity]}</p>
      </Card>

      <Card title="Focus">
        <Field label="Strategy session focus">
          <Text value={week.strategyFocus} onChange={(strategyFocus) => set({ strategyFocus })} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={week.strategyDone} onChange={(e) => set({ strategyDone: e.target.checked })} />
          Strategy session done
        </label>
        <Field label="Constraints">
          <Text value={week.constraints} onChange={(constraints) => set({ constraints })} />
        </Field>
        <Field label="Intention">
          <Text value={week.intention} onChange={(intention) => set({ intention })} />
        </Field>
      </Card>

      <Card title="Friday close" aside={week.closed ? <span className="tag good">closed</span> : undefined}>
        <p className="muted">Set each item's status above, then reflect.</p>
        {goals.map((g) => {
          const r = week.goalRatings[g.id] ?? { rating: null, note: '' }
          const setR = (patch: Partial<typeof r>) => set({ goalRatings: { ...week.goalRatings, [g.id]: { ...r, ...patch } } })
          return (
            <Field key={g.id} label={g.name}>
              <Segmented
                value={r.rating === null ? null : String(r.rating)}
                options={['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: v }))}
                allowClear
                onChange={(v) => setR({ rating: v === null ? null : Number(v) })}
              />
              <input value={r.note} placeholder="Note" onChange={(e) => setR({ note: e.target.value })} />
            </Field>
          )
        })}
        <Field label="What worked">
          <Text value={week.review.worked} onChange={(worked) => set({ review: { ...week.review, worked } })} />
        </Field>
        <Field label="What didn't work">
          <Text value={week.review.didnt} onChange={(didnt) => set({ review: { ...week.review, didnt } })} />
        </Field>
        <Field label="What to adjust">
          <Text value={week.review.adjust} onChange={(adjust) => set({ review: { ...week.review, adjust } })} />
        </Field>
        <Field label="One change for next week">
          <Text value={week.review.change} onChange={(change) => set({ review: { ...week.review, change } })} />
        </Field>
        <button className={week.closed ? '' : 'primary'} onClick={() => set({ closed: !week.closed })}>
          {week.closed ? 'Reopen week' : 'Close the week'}
        </button>
      </Card>

      <button
        className="link danger center"
        onClick={() => {
          if (confirm('Delete this week? Check-ins and meetings stay.')) {
            update((d) => {
              const weeks = { ...d.weeks }
              delete weeks[start]
              return { ...d, weeks }
            })
          }
        }}
      >
        Delete this week
      </button>
    </>
  )
}
