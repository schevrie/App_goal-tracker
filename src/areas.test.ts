import { describe, expect, it } from 'vitest'
import { carry } from './model'
import { areaLabel, fromStored, LIFE_AREAS, type Data } from './types'

describe('life areas', () => {
  it('has the six Plan of Action areas', () => {
    expect(LIFE_AREAS.map((a) => a.label)).toEqual([
      'Family & Home',
      'Financial & Career',
      'Mental & Educational',
      'Physical & Health',
      'Social & Cultural',
      'Spiritual & Ethical',
    ])
    expect(areaLabel(undefined)).toBe('No area')
  })

  it('keeps the area when an item is carried to the next week', () => {
    const c = carry({ id: 'a', title: 'Run 10k', type: 'needle', hours: 3, status: 'partial', area: 'physical' })
    expect(c.area).toBe('physical')
    expect(c.carriedFrom).toBe('a')
  })

  it('loads data saved before dreams existed, with existing goals uncategorized', () => {
    const old = {
      version: 1,
      settings: { needleTarget: 0.6, defaultFocusHours: 20, goals: [{ id: 'g', name: 'Speak up', active: true }], lastBackup: null },
      weeks: {},
      checkins: {},
      meetings: [],
    } as unknown as Partial<Data>
    const d = fromStored(old)
    expect(d.dreams).toEqual([])
    expect(d.settings.goals[0].area).toBeUndefined()
  })

  it('round-trips dreams and areas through a backup file', () => {
    const d = fromStored({ dreams: [{ id: 'x', title: 'See the northern lights', area: 'social', achieved: false }] })
    expect(fromStored(JSON.parse(JSON.stringify(d)))).toEqual(d)
  })
})
