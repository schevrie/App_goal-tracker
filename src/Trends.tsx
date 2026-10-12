import type { Data } from './types'
import { fmt } from './dates'
import { pct, weekMetrics } from './metrics'
import { Card } from './ui'

function Bars(props: { values: (number | null)[]; labels: string[]; max?: number; target?: number; fmtValue?: (v: number) => string }) {
  const max = props.max ?? 1
  const n = props.values.length
  const W = 320
  const H = 110
  const pad = { l: 4, r: 4, t: 14, b: 18 }
  const bw = (W - pad.l - pad.r) / Math.max(n, 1)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max)
  const every = Math.ceil(n / 6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bars" role="img">
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="axis" />
      {props.target !== undefined && (
        <line x1={pad.l} x2={W - pad.r} y1={y(props.target)} y2={y(props.target)} className="target" />
      )}
      {props.values.map((v, i) => {
        const x = pad.l + i * bw
        return (
          <g key={i}>
            {v === null ? (
              <circle cx={x + bw / 2} cy={y(0) - 3} r={2.5} className="none">
                <title>{props.labels[i]}: not tracked</title>
              </circle>
            ) : (
              <rect x={x + bw * 0.15} width={bw * 0.7} y={y(v)} height={Math.max(y(0) - y(v), 1)} rx={2}>
                <title>{`${props.labels[i]}: ${props.fmtValue ? props.fmtValue(v) : pct(v)}`}</title>
              </rect>
            )}
            {(i % every === 0 || i === n - 1) && (
              <text x={x + bw / 2} y={H - 4} textAnchor="middle">{props.labels[i]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function Trends(props: { data: Data }) {
  const { data } = props
  const weeks = Object.values(data.weeks).sort((a, b) => a.start.localeCompare(b.start)).slice(-26)
  if (weeks.length === 0) return <><h1 className="page">Trends</h1><Card><p className="muted">No weeks yet. Plan a week or import your spreadsheet in Settings.</p></Card></>

  const ms = weeks.map((w) => weekMetrics(data, w))
  const labels = weeks.map((w) => fmt(w.start, { day: 'numeric', month: 'numeric' }))
  const goals = data.settings.goals.filter((g) => g.active)

  return (
    <>
      <h1 className="page">Trends</h1>
      <p className="muted small">Last {weeks.length} weeks. A dot means the week wasn't tracked, not 0%.</p>

      <Card title="Must-wins done (by hours)">
        <Bars values={ms.map((m) => m.execution)} labels={labels} />
      </Card>
      <Card title="Needle share of completed work">
        <Bars values={ms.map((m) => m.needle)} labels={labels} target={data.settings.needleTarget} />
        <p className="muted small">Line = your {pct(data.settings.needleTarget)} target.</p>
      </Card>
      <Card title="Decisive meetings">
        <Bars values={ms.map((m) => m.decisiveness)} labels={labels} />
      </Card>
      <Card title="Morning check-ins">
        <Bars values={ms.map((m) => m.checkinDays)} labels={labels} max={5} fmtValue={(v) => `${v}/5`} />
      </Card>
      {goals.map((g) => (
        <Card key={g.id} title={g.name}>
          <Bars
            values={weeks.map((w) => w.goalRatings[g.id]?.rating ?? null)}
            labels={labels}
            max={5}
            fmtValue={(v) => `${v}/5`}
          />
        </Card>
      ))}

      <Card title="Weeks">
        <table className="weeks">
          <thead>
            <tr><th>Week</th><th>Done</th><th>Needle</th><th>Decisive</th><th></th></tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => ({ w, m: ms[i] })).reverse().map(({ w, m }) => (
              <tr key={w.start}>
                <td>{fmt(w.start, { day: 'numeric', month: 'short' })}</td>
                <td>{pct(m.execution)}</td>
                <td>{pct(m.needle)}</td>
                <td>{pct(m.decisiveness)}</td>
                <td>{m.closed ? '✓' : <span className="muted">open</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
