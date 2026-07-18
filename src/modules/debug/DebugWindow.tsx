import { useCallback, useEffect, useRef, useState } from 'react'
import { Bug, Activity, Terminal, Network, Database, Users, Wrench, RefreshCw } from 'lucide-react'
import { useT } from '../../context/LangContext'
import { cn } from '../../lib/cn'
import { probeHealth } from './lib'
import { StatusPanel } from './StatusPanel'
import { LogsPanel } from './LogsPanel'
import { ApiPanel } from './ApiPanel'
import { QueriesPanel } from './QueriesPanel'
import { UsersPanel } from './UsersPanel'
import { ActionsPanel } from './ActionsPanel'

type TabKey = 'status' | 'logs' | 'api' | 'queries' | 'users' | 'actions'

const REFRESH_SECONDS = 10

const TABS: { key: TabKey; icon: typeof Bug; labelKey: string }[] = [
  { key: 'status', icon: Activity, labelKey: 'debug.tab.status' },
  { key: 'logs', icon: Terminal, labelKey: 'debug.tab.logs' },
  { key: 'api', icon: Network, labelKey: 'debug.tab.api' },
  { key: 'queries', icon: Database, labelKey: 'debug.tab.queries' },
  { key: 'users', icon: Users, labelKey: 'debug.tab.users' },
  { key: 'actions', icon: Wrench, labelKey: 'debug.tab.actions' },
]

export function DebugWindow() {
  const t = useT()
  const [tab, setTab] = useState<TabKey>('status')
  const [apiMs, setApiMs] = useState<number | null>(null)
  const [healthy, setHealthy] = useState(true)
  const [countdown, setCountdown] = useState(REFRESH_SECONDS)

  const ping = useCallback(async () => {
    const { ms, ok } = await probeHealth()
    setApiMs(ms)
    setHealthy(ok)
    setCountdown(REFRESH_SECONDS)
  }, [])

  // keep a stable ref so the 1s interval always sees the latest ping fn
  const pingRef = useRef(ping)
  pingRef.current = ping

  useEffect(() => {
    void pingRef.current()
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void pingRef.current()
          return REFRESH_SECONDS
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="-m-4 min-h-[calc(100vh-3rem)] rounded-none bg-debug-bg p-4 text-slate-200 sm:-m-6 sm:rounded-2xl sm:p-6">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary-light ring-1 ring-inset ring-primary-light/30">
            <Bug className="h-6 w-6" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
              {t('debug.title')}
              <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                {t('debug.envBadge')}
              </span>
            </h1>
            <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-400">{t('debug.subtitle')}</p>
          </div>
        </div>

        {/* live indicator + auto-refresh countdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-debug-line bg-debug-panel px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', healthy ? 'animate-ping bg-emerald-400' : 'bg-red-400')} />
              <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', healthy ? 'bg-emerald-400' : 'bg-red-400')} />
            </span>
            <span className={cn('font-mono text-xs font-bold', healthy ? 'text-emerald-300' : 'text-red-300')}>
              {t('debug.live')}
            </span>
          </div>

          <button
            onClick={() => void ping()}
            title={t('debug.refreshNow')}
            className="flex items-center gap-2 rounded-lg border border-debug-line bg-debug-panel px-3 py-1.5 text-xs text-slate-300 transition hover:bg-debug-line"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {t('debug.refreshIn')} <span className="font-mono font-bold text-primary-light">{countdown}{t('debug.seconds')}</span>
            </span>
          </button>
        </div>
      </div>

      {/* dark pills tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-debug-line bg-debug-panel p-1.5">
        {TABS.map((tabItem) => {
          const Icon = tabItem.icon
          const active = tab === tabItem.key
          return (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                active
                  ? 'bg-primary text-white shadow-sm shadow-primary/40'
                  : 'text-slate-400 dark:text-slate-400 hover:bg-debug-line hover:text-slate-200',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(tabItem.labelKey)}
            </button>
          )
        })}
      </div>

      {/* panels */}
      <div className="animate-fade-in">
        {tab === 'status' && <StatusPanel apiMs={apiMs} />}
        {tab === 'logs' && <LogsPanel />}
        {tab === 'api' && <ApiPanel />}
        {tab === 'queries' && <QueriesPanel />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'actions' && <ActionsPanel />}
      </div>
    </div>
  )
}
