import { describe, expect, it } from 'vitest'
import { weekMetrics } from './metrics'
import { emptyData, type Week } from './types'

const week = (over: Partial<Week> = {}): Week => ({
  start: '2026-10-12',
  focusHours: 20,
  strategyFocus: '',
  constraints: '',
  intention: '',
  strategyDone: false,
  mustWins: [],
  smaller: [],
  closed: false,
  review: { worked: '', didnt: '', adjust: '', change: '' },
  goalRatings: {},
  ...over,
})

describe('weekMetrics', () => {
  it('reports no execution score for an untouched week instead of 0', () => {
    const w = week({ mustWins: [{ id: 'a', title: 'A', type: 'needle', hours: 4, status: 'open' }] })
    expect(weekMetrics(emptyData(), w).execution).toBeNull()
  })

  it('weights execution by hours and counts partial as half', () => {
    const w = week({
      closed: true,
      mustWins: [
        { id: 'a', title: 'A', type: 'needle', hours: 6, status: 'done' },
        { id: 'b', title: 'B', type: 'support', hours: 4, status: 'partial' },
      ],
    })
    const m = weekMetrics(emptyData(), w)
    expect(m.execution).toBeCloseTo(0.8)
    expect(m.needle).toBeCloseTo(6 / 8)
    expect(m.capacity).toBe('under')
  })

  it('ignores dropped items and computes decisiveness over rated meetings only', () => {
    const data = emptyData()
    data.meetings = [
      { id: '1', date: '2026-10-12', topic: 'x', rating: 'decisive', comment: '' },
      { id: '2', date: '2026-10-13', topic: 'y', rating: null, comment: '' },
      { id: '3', date: '2026-10-14', topic: 'z', rating: 'mixed', comment: '' },
      { id: '4', date: '2026-10-20', topic: 'next week', rating: 'indecisive', comment: '' },
    ]
    const w = week({
      closed: true,
      mustWins: [
        { id: 'a', title: 'A', type: 'needle', hours: 2, status: 'done' },
        { id: 'b', title: 'B', type: 'needle', hours: 8, status: 'dropped' },
      ],
    })
    const m = weekMetrics(data, w)
    expect(m.execution).toBe(1)
    expect(m.decisiveness).toBe(0.5)
    expect(m.meetingsUnrated).toBe(1)
  })
})
