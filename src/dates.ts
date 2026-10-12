// All dates are local calendar days as YYYY-MM-DD strings.

export const toISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (s: string, n: number) => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const today = () => toISO(new Date())

export const mondayOf = (s: string) => {
  const day = fromISO(s).getDay() // 0 = Sunday
  return addDays(s, day === 0 ? -6 : 1 - day)
}

export const workdays = (monday: string) => [0, 1, 2, 3, 4].map((i) => addDays(monday, i))

export const fmt = (s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  fromISO(s).toLocaleDateString(undefined, opts)

/** Excel serial date (1900 system) to YYYY-MM-DD. */
export const fromExcelSerial = (n: number) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
