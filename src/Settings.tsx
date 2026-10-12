import { useState } from 'react'
import type { Data } from './types'
import { emptyData, uid } from './types'
import type { Update } from './store'
import { fmt, today } from './dates'
import { mergeImport, parsePlanner, readWorkbook } from './importXlsx'
import { Card, Field, NumberInput } from './ui'

const pickFile = (accept: string) =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })

export default function Settings(props: { data: Data; update: Update }) {
  const { data, update } = props
  const s = data.settings
  const [msg, setMsg] = useState('')
  const [newGoal, setNewGoal] = useState('')
  const setS = (patch: Partial<Data['settings']>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))

  const importXlsx = async () => {
    const f = await pickFile('.xlsx')
    if (!f) return
    try {
      const r = parsePlanner(readWorkbook(new Uint8Array(await f.arrayBuffer())))
      if (!r.weeks.length) return setMsg('No "Week NN" sheets with data found in that file.')
      update((d) => mergeImport(d, r))
      setMsg(`Imported ${r.weeks.length} weeks, ${r.meetings.length} meetings and ${Object.keys(r.checkins).length} check-ins.`)
    } catch (e) {
      setMsg(`Could not read that file: ${(e as Error).message}`)
    }
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `focus-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setS({ lastBackup: today() })
  }

  const restoreBackup = async () => {
    const f = await pickFile('.json,application/json')
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text()) as Data
      if (parsed.version !== 1 || !parsed.weeks) throw new Error('not a Focus backup')
      if (!confirm('Replace everything in the app with this backup?')) return
      update(() => ({ ...emptyData(), ...parsed }))
      setMsg('Backup restored.')
    } catch (e) {
      setMsg(`Could not restore: ${(e as Error).message}`)
    }
  }

  return (
    <>
      <h1 className="page">Settings</h1>
      {msg && <p className="notice">{msg}</p>}

      <Card title="Targets">
        <div className="row">
          <Field label="Needle target (%)" hint="Share of completed hours on needle work">
            <NumberInput value={Math.round(s.needleTarget * 100)} step={5} onChange={(v) => setS({ needleTarget: (v ?? 0) / 100 })} />
          </Field>
          <Field label="Default focus hours">
            <NumberInput value={s.defaultFocusHours} step={1} onChange={(v) => setS({ defaultFocusHours: v ?? 0 })} />
          </Field>
        </div>
      </Card>

      <Card title="Behavioural goals">
        <p className="muted small">Meeting decisiveness is tracked from your meetings log. Add other goals to rate 1–5 each Friday.</p>
        {s.goals.map((g) => (
          <div key={g.id} className="row goal">
            <input value={g.name} onChange={(e) => setS({ goals: s.goals.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)) })} />
            <button className="link" onClick={() => setS({ goals: s.goals.map((x) => (x.id === g.id ? { ...x, active: !x.active } : x)) })}>
              {g.active ? 'Archive' : 'Restore'}
            </button>
          </div>
        ))}
        <form
          className="row goal"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newGoal.trim()) return
            setS({ goals: [...s.goals, { id: uid(), name: newGoal.trim(), active: true }] })
            setNewGoal('')
          }}
        >
          <input value={newGoal} placeholder="e.g. Speak up early in meetings" onChange={(e) => setNewGoal(e.target.value)} />
          <button type="submit">Add</button>
        </form>
      </Card>

      <Card title="Your data">
        <p className="muted small">
          Everything is stored only on this phone. Last backup: {s.lastBackup ? fmt(s.lastBackup, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never'}.
        </p>
        <div className="buttons">
          <button className="primary" onClick={exportBackup}>Save backup file</button>
          <button onClick={restoreBackup}>Restore backup</button>
          <button onClick={importXlsx}>Import Excel planner</button>
        </div>
      </Card>

      <Card title="Reminders">
        <p className="muted small">
          Set three repeating alarms or reminders on your phone: Monday morning (plan), each weekday morning (check-in), Friday
          afternoon (close the week). Open Focus from the home screen when they ring.
        </p>
      </Card>
    </>
  )
}
