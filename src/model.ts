import type { Data, Item, Week } from './types'
import { uid } from './types'

export const MAX_MUST_WINS = 3

export const blankWeek = (data: Data, start: string): Week => ({
  start,
  focusHours: data.settings.defaultFocusHours,
  strategyFocus: '',
  constraints: '',
  intention: '',
  strategyDone: false,
  mustWins: [],
  smaller: [],
  closed: false,
  review: { worked: '', didnt: '', adjust: '', change: '' },
  goalRatings: {},
})

/** The most recent week that starts before `start`. */
export const previousWeek = (data: Data, start: string): Week | undefined =>
  Object.values(data.weeks)
    .filter((w) => w.start < start)
    .sort((a, b) => b.start.localeCompare(a.start))[0]

/** Items from the previous week that were not finished or dropped. */
export const carryCandidates = (prev: Week | undefined): { item: Item; list: 'mustWins' | 'smaller' }[] =>
  prev
    ? [
        ...prev.mustWins.map((item) => ({ item, list: 'mustWins' as const })),
        ...prev.smaller.map((item) => ({ item, list: 'smaller' as const })),
      ].filter(({ item }) => item.status === 'open' || item.status === 'partial')
    : []

export const carry = (item: Item): Item => ({
  id: uid(),
  title: item.title,
  type: item.type,
  hours: item.hours,
  status: 'open',
  carriedFrom: item.id,
})

export const newItem = (): Item => ({ id: uid(), title: '', type: 'needle', hours: null, status: 'open' })
