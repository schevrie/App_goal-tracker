import type { Data, Item, Week } from './types'
import { workdays } from './dates'

const credit = (i: Item) => (i.status === 'done' ? 1 : i.status === 'partial' ? 0.5 : 0)

export interface WeekMetrics {
  /** Share of planned must-win hours completed (partial = half). Null until the week has a status on any must-win. */
  execution: number | null
  /** Needle share of completed hours across all items with hours. Null when nothing is completed. */
  needle: number | null
  /** Decisive meetings / rated meetings. Null when no meeting is rated. */
  decisiveness: number | null
  meetingsUnrated: number
  meetingsRated: number
  /** Workdays with any check-in entry, out of 5. */
  checkinDays: number
  plannedHours: number
  capacity: 'unset' | 'over' | 'under' | 'balanced'
  closed: boolean
}

export function weekMetrics(data: Data, week: Week): WeekMetrics {
  const all = [...week.mustWins, ...week.smaller]
  const mw = week.mustWins.filter((i) => i.status !== 'dropped')
  const mwHours = mw.reduce((s, i) => s + (i.hours ?? 0), 0)
  const touched = mw.some((i) => i.status !== 'open') || week.closed
  let execution: number | null = null
  if (touched && mw.length) {
    execution = mwHours > 0
      ? mw.reduce((s, i) => s + credit(i) * (i.hours ?? 0), 0) / mwHours
      : mw.reduce((s, i) => s + credit(i), 0) / mw.length
  }

  const doneHours = (t: Item['type']) =>
    all.filter((i) => i.type === t).reduce((s, i) => s + credit(i) * (i.hours ?? 0), 0)
  const needleH = doneHours('needle')
  const supportH = doneHours('support')
  const needle = needleH + supportH > 0 ? needleH / (needleH + supportH) : null

  const days = workdays(week.start)
  const meetings = data.meetings.filter((m) => days.includes(m.date))
  const rated = meetings.filter((m) => m.rating)
  const decisiveness = rated.length ? rated.filter((m) => m.rating === 'decisive').length / rated.length : null

  const checkinDays = days.filter((d) => {
    const c = data.checkins[d]
    return c && (c.onTrack !== null || c.moved.trim() || c.adjust.trim())
  }).length

  const plannedHours = all.filter((i) => i.status !== 'dropped').reduce((s, i) => s + (i.hours ?? 0), 0)
  const util = week.focusHours > 0 ? plannedHours / week.focusHours : null
  const capacity = util === null ? 'unset' : util > 1.1 ? 'over' : util < 0.7 ? 'under' : 'balanced'

  return {
    execution,
    needle,
    decisiveness,
    meetingsUnrated: meetings.length - rated.length,
    meetingsRated: rated.length,
    checkinDays,
    plannedHours,
    capacity,
    closed: week.closed,
  }
}

export const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`)
