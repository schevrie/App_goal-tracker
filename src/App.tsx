import { useState } from 'react'
import { useData } from './store'
import { addDays, mondayOf, today } from './dates'
import Today from './Today'
import WeekView from './WeekView'
import Trends from './Trends'
import Settings from './Settings'

type Tab = 'today' | 'week' | 'trends' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '☀' },
  { id: 'week', label: 'Week', icon: '▦' },
  { id: 'trends', label: 'Trends', icon: '▁▃▅' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

export default function App() {
  const [data, update] = useData()
  const [tab, setTab] = useState<Tab>('today')
  const [weekStart, setWeekStart] = useState(() => mondayOf(today()))

  if (!data) return <div className="loading">Loading…</div>

  const hasData = Object.keys(data.weeks).length > 0
  const backupStale = hasData && (!data.settings.lastBackup || data.settings.lastBackup < addDays(today(), -14))

  return (
    <div className="app">
      <main>
        {backupStale && tab !== 'settings' && (
          <button className="notice" onClick={() => setTab('settings')}>
            Your data lives only on this phone. Save a backup file in Settings.
          </button>
        )}
        {tab === 'today' && <Today data={data} update={update} goToWeek={() => { setWeekStart(mondayOf(today())); setTab('week') }} />}
        {tab === 'week' && <WeekView data={data} update={update} start={weekStart} setStart={setWeekStart} />}
        {tab === 'trends' && <Trends data={data} />}
        {tab === 'settings' && <Settings data={data} update={update} />}
      </main>
      <nav>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); window.scrollTo(0, 0) }}>
            <span className="icon" aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
