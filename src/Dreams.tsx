import { useState } from 'react'
import { LIFE_AREAS, mergeDreams, uid, type Data, type Dream, type LifeArea } from './types'
import type { Update } from './store'
import { fmt, today } from './dates'
import { AreaSelect, Card } from './ui'
import { pickFile } from './files'

/** Grow a textarea to fit its text, so long dreams wrap instead of being cut off. */
const fit = (el: HTMLTextAreaElement | null) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight + 2}px`
}

function AddDream(props: { area: LifeArea | null; onAdd: (d: Dream) => void }) {
  const [title, setTitle] = useState('')
  return (
    <form
      className="add"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        props.onAdd({ id: uid(), title: title.trim(), area: props.area, achieved: false, added: today() })
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

  const [msg, setMsg] = useState('')

  const importDreams = async () => {
    const f = await pickFile('.json,application/json')
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text())
      const incoming: Dream[] = Array.isArray(parsed) ? parsed : parsed.dreams
      if (!Array.isArray(incoming)) throw new Error('no dreams in that file')
      const n = mergeDreams(data.dreams, incoming).length - data.dreams.length
      update((d) => ({ ...d, dreams: mergeDreams(d.dreams, incoming) }))
      setMsg(n ? `Added ${n} dream${n === 1 ? '' : 's'}.` : 'Those dreams are already on your list.')
    } catch (e) {
      setMsg(`Could not read that file: ${(e as Error).message}`)
    }
  }

  const groups: { area: LifeArea | null; label: string }[] = LIFE_AREAS.map((a) => ({ area: a.id, label: a.label }))
  if (data.dreams.some((x) => !x.area)) groups.push({ area: null, label: 'No area yet' })

  return (
    <>
      <h1 className="page">Dream list</h1>
      <p className="muted small">
        Everything you would like to be, do or have, across the six areas of life. Not all areas matter equally at any
        one time, but over time give each one attention.
      </p>
      {msg && <p className="notice">{msg}</p>}
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
                <textarea className="title" rows={1} ref={fit} onInput={(e) => fit(e.currentTarget)} value={x.title} onChange={(e) => change(x.id, { title: e.target.value.replace(/\n/g, ' ') })} />
                <button
                  className="link danger"
                  aria-label="Remove"
                  onClick={() => confirm(`Remove "${x.title}"?`) && setDreams((ds) => ds.filter((y) => y.id !== x.id))}
                >
                  ✕
                </button>
                <AreaSelect value={x.area} onChange={(area) => change(x.id, { area })} />
                {x.added && <span className="added">{fmt(x.added, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </div>
            ))}
            {g.area && <AddDream area={g.area} onAdd={(d) => setDreams((ds) => [...ds, d])} />}
          </Card>
        )
      })}
      <button className="link center" onClick={importDreams}>Add dreams from a file</button>
    </>
  )
}
