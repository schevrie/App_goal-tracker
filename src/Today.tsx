import type { Data, Meeting, Rating } from './types'
import { uid } from './types'
import type { Update } from './store'
import { fmt, mondayOf, today } from './dates'
import { Card, Field, Segmented, Text } from './ui'

const RATINGS: { value: Rating; label: string; tone: string }[] = [
  { value: 'decisive', label: 'Decisive', tone: 'good' },
  { value: 'mixed', label: 'Mixed', tone: 'warn' },
  { value: 'indecisive', label: 'Indecisive', tone: 'bad' },
]

export default function Today(props: { data: Data; update: Update; goToWeek: () => void }) {
  const { data, update } = props
  const day = today()
  const week = data.weeks[mondayOf(day)]
  const c = data.checkins[day] ?? { onTrack: null, moved: '', adjust: '' }
  const meetings = data.meetings.filter((m) => m.date === day)

  const setCheckin = (patch: Partial<typeof c>) =>
    update((d) => ({ ...d, checkins: { ...d.checkins, [day]: { ...c, ...patch } } }))
  const setMeeting = (id: string, patch: Partial<Meeting>) =>
    update((d) => ({ ...d, meetings: d.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
  const addMeeting = () =>
    update((d) => ({ ...d, meetings: [...d.meetings, { id: uid(), date: day, topic: '', rating: null, comment: '' }] }))
  const removeMeeting = (id: string) => update((d) => ({ ...d, meetings: d.meetings.filter((m) => m.id !== id) }))

  return (
    <>
      <h1 className="page">{fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h1>

      {!week ? (
        <Card>
          <p>This week isn't planned yet.</p>
          <button className="primary" onClick={props.goToWeek}>Plan this week</button>
        </Card>
      ) : (
        week.mustWins.length > 0 && (
          <Card title="This week's must-wins">
            <ol className="mini">
              {week.mustWins.map((i) => (
                <li key={i.id} className={i.status}>
                  {i.title || 'Untitled'}
                </li>
              ))}
            </ol>
          </Card>
        )
      )}

      <Card title="Morning check-in">
        <Field label="On track for your priorities?">
          <Segmented
            value={c.onTrack === null ? null : c.onTrack ? 'yes' : 'no'}
            options={[
              { value: 'yes', label: 'Yes', tone: 'good' },
              { value: 'no', label: 'No', tone: 'bad' },
            ]}
            allowClear
            onChange={(v) => setCheckin({ onTrack: v === null ? null : v === 'yes' })}
          />
        </Field>
        <Field label="What moved forward yesterday?">
          <Text value={c.moved} onChange={(moved) => setCheckin({ moved })} />
        </Field>
        <Field label="Adjustment for today">
          <Text value={c.adjust} onChange={(adjust) => setCheckin({ adjust })} />
        </Field>
      </Card>

      <Card title="Meetings today" aside={<button onClick={addMeeting}>+ Meeting</button>}>
        {meetings.length === 0 && <p className="muted">Log a meeting right after it ends: topic and how decisive it was.</p>}
        {meetings.map((m) => (
          <div key={m.id} className="meeting">
            <input value={m.topic} placeholder="Topic" onChange={(e) => setMeeting(m.id, { topic: e.target.value })} />
            <Segmented value={m.rating} options={RATINGS} allowClear onChange={(rating) => setMeeting(m.id, { rating })} />
            <input value={m.comment} placeholder="Comment (optional)" onChange={(e) => setMeeting(m.id, { comment: e.target.value })} />
            <button className="link danger" onClick={() => removeMeeting(m.id)}>Remove</button>
          </div>
        ))}
      </Card>
    </>
  )
}
