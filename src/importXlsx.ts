import { unzipSync, strFromU8 } from 'fflate'
import type { Data, Item, ItemStatus, Meeting, Rating, Week } from './types'
import { uid } from './types'
import { addDays, fromExcelSerial } from './dates'

// Reads the "FOCUS SYSTEM v3" weekly planner workbook (one "Week NN" sheet per week)
// with a minimal xlsx reader: only cell values are needed, cached results included.

type Cells = Record<string, string | number>

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')

const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('')

export function readWorkbook(buf: Uint8Array): Record<string, Cells> {
  const files = unzipSync(buf)
  const read = (p: string) => (files[p] ? strFromU8(files[p]) : '')

  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]))
  const rels = Object.fromEntries(
    [...read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
      /Id="([^"]+)"/.exec(m[0])![1],
      /Target="([^"]+)"/.exec(m[0])![1].replace(/^\/?(xl\/)?/, 'xl/'),
    ])
  )

  const out: Record<string, Cells> = {}
  for (const m of read('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = decode(/name="([^"]*)"/.exec(m[0])![1])
    const rid = /r:id="([^"]+)"/.exec(m[0])![1]
    const xml = read(rels[rid])
    const cells: Cells = {}
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1]
      const body = c[2] ?? ''
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1]
      if (!ref) continue
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1]
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1]
      if (t === 's' && v !== undefined) cells[ref] = shared[Number(v)]
      else if (t === 'inlineStr') cells[ref] = texts(body)
      else if ((t === 'str' || t === 'e') && v !== undefined) cells[ref] = decode(v)
      else if (t === 'b' && v !== undefined) cells[ref] = v === '1' ? 'TRUE' : 'FALSE'
      else if (v !== undefined) cells[ref] = Number(v)
    }
    out[name] = cells
  }
  return out
}

const str = (v: string | number | undefined) => (v === undefined ? '' : String(v).trim())
const yes = (v: string | number | undefined) => str(v).toLowerCase() === 'yes'
const num = (v: string | number | undefined) => {
  if (typeof v === 'number') return v
  const m = /-?\d+(?:[.,]\d+)?/.exec(str(v))
  return m ? Number(m[0].replace(',', '.')) : null
}
const status = (v: string | number | undefined): ItemStatus => {
  const s = str(v).toLowerCase()
  return s === 'yes' ? 'done' : s === 'partial' ? 'partial' : 'open'
}
const rating = (v: string | number | undefined): Rating | null => {
  const s = str(v).toLowerCase()
  return s === 'decisive' || s === 'mixed' || s === 'indecisive' ? s : null
}

export interface ImportResult {
  weeks: Week[]
  meetings: Meeting[]
  checkins: Data['checkins']
  needleTarget: number | null
}

export function parsePlanner(sheets: Record<string, Cells>): ImportResult {
  const weeks: Week[] = []
  const meetings: Meeting[] = []
  const checkins: Data['checkins'] = {}
  const cols = ['C', 'D', 'E', 'F', 'G']

  for (const [name, c] of Object.entries(sheets)) {
    if (!/^Week \d+$/.test(name) || typeof c.C5 !== 'number') continue
    const start = fromExcelSerial(c.C5)

    const mustWins: Item[] = []
    for (let r = 10; r <= 14; r++) {
      const title = str(c[`C${r}`])
      if (!title) continue
      mustWins.push({
        id: uid(),
        title,
        type: str(c[`E${r}`]).toLowerCase() === 'support' ? 'support' : 'needle',
        hours: num(c[`F${r}`]),
        status: status(c[`G${r}`]),
      })
    }
    const anyStatus = [10, 11, 12, 13, 14].some((r) => str(c[`G${r}`]))
    const review = { worked: str(c.C85), didnt: str(c.C86), adjust: str(c.C87), change: str(c.C88) }
    const hasData = mustWins.length > 0 || Object.keys(c).some((k) => /^[C-G](39|4[01]|4[6-9]|5[0-4])$/.test(k))
    if (!hasData) continue

    weeks.push({
      start,
      focusHours: num(c.C23) ?? 0,
      strategyFocus: str(c.C16),
      constraints: str(c.C18),
      intention: str(c.C20),
      strategyDone: yes(c.C60),
      mustWins,
      smaller: [],
      closed: yes(c.C61) || anyStatus || Object.values(review).some(Boolean),
      review,
      goalRatings: {},
    })

    cols.forEach((col, i) => {
      const date = addDays(start, i)
      const onTrack = str(c[`${col}39`])
      const moved = str(c[`${col}40`])
      const adjust = str(c[`${col}41`])
      if (onTrack || moved || adjust) {
        checkins[date] = { onTrack: onTrack ? yes(onTrack) : null, moved, adjust }
      }
      for (const r of [46, 49, 52]) {
        const topic = str(c[`${col}${r}`])
        const rt = rating(c[`${col}${r + 1}`])
        const comment = str(c[`${col}${r + 2}`])
        if (topic || rt || comment) meetings.push({ id: uid(), date, topic, rating: rt, comment })
      }
    })
  }

  const target = sheets.Summary?.C5
  return { weeks, meetings, checkins, needleTarget: typeof target === 'number' ? target : null }
}

/** Merge imported weeks into existing data; imported weeks replace same-dated weeks. */
export function mergeImport(data: Data, r: ImportResult): Data {
  const weeks = { ...data.weeks }
  const dates = new Set<string>()
  for (const w of r.weeks) {
    weeks[w.start] = w
    for (let i = 0; i < 7; i++) dates.add(addDays(w.start, i))
  }
  return {
    ...data,
    settings: r.needleTarget !== null ? { ...data.settings, needleTarget: r.needleTarget } : data.settings,
    weeks,
    checkins: { ...data.checkins, ...r.checkins },
    meetings: [...data.meetings.filter((m) => !dates.has(m.date)), ...r.meetings],
  }
}
