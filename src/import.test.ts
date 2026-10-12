import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { readWorkbook, parsePlanner, mergeImport } from './importXlsx'
import { weekMetrics } from './metrics'
import { emptyData } from './types'

// The real planner holds personal data and is not committed; point PLANNER_XLSX at a copy to run this.
const path = process.env.PLANNER_XLSX ?? ''

describe.skipIf(!path || !existsSync(path))('import of the v3 planner', () => {
  it('reads weeks, meetings and check-ins', () => {
    const r = parsePlanner(readWorkbook(new Uint8Array(readFileSync(path))))
    const starts = r.weeks.map((w) => w.start).sort()
    expect(starts[0]).toBe('2026-07-06')
    expect(starts).toContain('2026-08-10') // week 4 follows a 3-week gap
    expect(r.weeks.length).toBe(11) // week 7 is empty
    const w1 = r.weeks.find((w) => w.start === '2026-07-06')!
    expect(w1.mustWins).toHaveLength(5)
    expect(w1.mustWins[3].hours).toBe(2) // "2.0 h" typed as text
    expect(r.needleTarget).toBe(0.6)
    expect(r.meetings.length).toBeGreaterThan(10)

    const data = mergeImport(emptyData(), r)
    const w11 = data.weeks['2026-09-28']
    const m = weekMetrics(data, w11)
    expect(m.closed).toBe(true)
    expect(m.decisiveness).toBeNull() // two meetings, none rated
    expect(m.meetingsUnrated).toBe(2)
  })
})
