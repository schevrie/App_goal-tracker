import { useState } from 'react'
import { LIFE_AREAS, uid, type Data, type Dream, type LifeArea } from './types'
import type { Update } from './store'
import { AreaSelect, Card } from './ui'

function AddDream(props: { area: LifeArea | null; onAdd: (d: Dream) => void }) {
  const [title, setTitle] = useState('')
  return (
    <form
      className="add"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        props.onAdd({ id: uid(), title: title.trim(), area: props.area, achieved: false })
        setTitle('')
      }}
    >
      <input value={title} placeholder="Add a dream" onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  )
}

export default function Dreams(props: { data: Data; update: Update }) {
  const { data, update } = props
  const setDreams = (fn: (ds: Dream[]) => Dream[]) => update((d) => ({ ...d, dreams: fn(d.dreams) }))
  const change = (id: string, patch: Partial<Dream>) => setDreams((ds) => ds.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const groups: { area: LifeArea | null; label: string }[] = LIFE_AREAS.map((a) => ({ area: a.id, label: a.label }))
  if (data.dreams.some((x) => !x.area)) groups.push({ area: null, label: 'No area yet' })

  return (
    <>
      <h1 className="page">Dream list</h1>
      <p className="muted small">
        Everything you would like to be, do or have, across the six areas of life. Not all areas matter equally at any
        one time, but over time give each one attention.
      </p>
      {groups.map((g) => {
        const list = data.dreams.filter((x) => (x.area ?? null) === g.area)
        const done = list.filter((x) => x.achieved).length
        return (
          <Card key={g.area ?? 'none'} title={g.label} aside={list.length ? <span className="count">{done}/{list.length} achieved</span> : undefined}>
            {list.map((x) => (
              <div key={x.id} className={`dream ${x.achieved ? 'achieved' : ''}`}>
                <input
                  type="checkbox"
                  aria-label="Achieved"
                  checked={x.achieved}
                  onChange={(e) => change(x.id, { achieved: e.target.checked })}
                />
                <input className="title" value={x.title} onChange={(e) => change(x.id, { title: e.target.value })} />
                <button
                  className="link danger"
                  aria-label="Remove"
                  onClick={() => confirm(`Remove "${x.title}"?`) && setDreams((ds) => ds.filter((y) => y.id !== x.id))}
                >
                  ✕
                </button>
                <AreaSelect value={x.area} onChange={(area) => change(x.id, { area })} />
              </div>
            ))}
            {g.area && <AddDream area={g.area} onAdd={(d) => setDreams((ds) => [...ds, d])} />}
          </Card>
        )
      })}
    </>
  )
}
