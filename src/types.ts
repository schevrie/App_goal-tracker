export type ItemType = 'needle' | 'support'
export type ItemStatus = 'open' | 'done' | 'partial' | 'dropped'
export type Rating = 'decisive' | 'mixed' | 'indecisive'

/** The six areas of life from Paul J. Meyer's Plan of Action. */
export const LIFE_AREAS = [
  { id: 'family', label: 'Family & Home' },
  { id: 'financial', label: 'Financial & Career' },
  { id: 'mental', label: 'Mental & Educational' },
  { id: 'physical', label: 'Physical & Health' },
  { id: 'social', label: 'Social & Cultural' },
  { id: 'spiritual', label: 'Spiritual & Ethical' },
] as const

export type LifeArea = (typeof LIFE_AREAS)[number]['id']

export const areaLabel = (a: LifeArea | null | undefined) => LIFE_AREAS.find((x) => x.id === a)?.label ?? 'No area'

export interface Item {
  id: string
  title: string
  type: ItemType
  hours: number | null
  status: ItemStatus
  /** Area of life; unset on items created before areas existed. */
  area?: LifeArea | null
  /** Id of the item in the previous week this was carried from. */
  carriedFrom?: string
}

export interface Review {
  worked: string
  didnt: string
  adjust: string
  change: string
}

export interface Week {
  /** Monday, YYYY-MM-DD. */
  start: string
  focusHours: number
  strategyFocus: string
  constraints: string
  intention: string
  strategyDone: boolean
  mustWins: Item[]
  smaller: Item[]
  closed: boolean
  review: Review
  /** Weekly rating (1-5) and note per behavioural goal id. */
  goalRatings: Record<string, { rating: number | null; note: string }>
}

export interface CheckIn {
  onTrack: boolean | null
  moved: string
  adjust: string
}

export interface Meeting {
  id: string
  date: string
  topic: string
  rating: Rating | null
  comment: string
}

export interface Goal {
  id: string
  name: string
  active: boolean
  area?: LifeArea | null
}

export interface Dream {
  id: string
  title: string
  area: LifeArea | null
  achieved: boolean
  /** Date the dream was written down, YYYY-MM-DD. */
  added?: string
}

export interface Settings {
  needleTarget: number
  defaultFocusHours: number
  goals: Goal[]
  lastBackup: string | null
}

export interface Data {
  version: 1
  settings: Settings
  weeks: Record<string, Week>
  checkins: Record<string, CheckIn>
  meetings: Meeting[]
  dreams: Dream[]
}

export const emptyData = (): Data => ({
  version: 1,
  settings: { needleTarget: 0.6, defaultFocusHours: 20, goals: [], lastBackup: null },
  weeks: {},
  checkins: {},
  meetings: [],
  dreams: [],
})

/** Add dreams from another file, skipping any whose title is already on the list. */
export const mergeDreams = (current: Dream[], incoming: Dream[]): Dream[] => {
  const seen = new Set(current.map((d) => d.title.trim().toLowerCase()))
  const added: Dream[] = []
  for (const d of incoming) {
    const key = (d.title ?? '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const area = LIFE_AREAS.some((a) => a.id === d.area) ? d.area : null
    added.push({ id: uid(), title: d.title.trim(), area, achieved: !!d.achieved, ...(d.added ? { added: d.added } : {}) })
  }
  return [...current, ...added]
}

/** Fill fields added after the data was saved (stored data and backup files). */
export const fromStored = (raw: Partial<Data>): Data => {
  const d = { ...emptyData(), ...raw }
  return { ...d, dreams: d.dreams ?? [] }
}

export const uid = () => Math.random().toString(36).slice(2, 10)
