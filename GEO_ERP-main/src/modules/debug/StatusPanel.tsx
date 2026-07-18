import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Database, Cpu, Users, ListTodo, Save, Timer } from 'lucide-react'
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber } from '../../lib/format'
import { Panel, StatTile } from './ui'
import { buildSeries } from './lib'

export function StatusPanel({ apiMs }: { apiMs: number | null }) {
  const t = useT()
  const { lang } = useLang()

  // mock animated memory bar
  const [mem, setMem] = useState(58)
  const memRef = useRef(58)
  useEffect(() => {
    const id = setInterval(() => {
      const delta = Math.round((Math.random() - 0.5) * 8)
      memRef.current = Math.min(92, Math.max(34, memRef.current + delta))
      setMem(memRef.current)
    }, 1500)
    return () => clearInterval(id)
  }, [])

  const series = useMemo(() => buildSeries(apiMs), [apiMs])
  const sessions = 14
  const jobs = 3
  const lastBackup = lang === 'ar' ? 'اليوم ٠٣:١٢ ص' : 'Today 03:12 AM'
  const memAccent = mem > 80 ? 'red' : mem > 65 ? 'amber' : 'purple'
  const apiAccent = apiMs === null ? 'sky' : apiMs > 200 ? 'amber' : 'green'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatTile
          label={t('debug.status.apiTime')}
          value={apiMs === null ? '…' : <>{formatNumber(apiMs, lang)} <span className="text-base font-normal text-slate-500">ms</span></>}
          hint={t('debug.status.apiHint')}
          icon={<Activity className="h-5 w-5" />}
          accent={apiAccent}
        />

        <StatTile
          label={t('debug.status.db')}
          value={
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xl">{t('debug.status.dbConnected')}</span>
            </span>
          }
          hint={t('debug.status.dbHint')}
          icon={<Database className="h-5 w-5" />}
          accent="green"
        />

        <StatTile
          label={t('debug.status.memory')}
          value={<>{mem}<span className="text-base font-normal text-slate-500">%</span></>}
          hint={t('debug.status.memHint')}
          icon={<Cpu className="h-5 w-5" />}
          accent={memAccent}
        >
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-debug-bg">
            <div
              className={
                'h-full rounded-full transition-all duration-700 ease-out ' +
                (mem > 80 ? 'bg-red-400' : mem > 65 ? 'bg-amber-400' : 'bg-primary-light')
              }
              style={{ width: `${mem}%` }}
            />
          </div>
        </StatTile>

        <StatTile
          label={t('debug.status.sessions')}
          value={formatNumber(sessions, lang)}
          hint={t('debug.status.sessHint')}
          icon={<Users className="h-5 w-5" />}
          accent="sky"
        />

        <StatTile
          label={t('debug.status.jobs')}
          value={formatNumber(jobs, lang)}
          hint={t('debug.status.jobsHint')}
          icon={<ListTodo className="h-5 w-5" />}
          accent="amber"
        />

        <StatTile
          label={t('debug.status.backup')}
          value={<span className="text-lg">{lastBackup}</span>}
          hint={t('debug.status.backupHint')}
          icon={<Save className="h-5 w-5" />}
          accent="green"
        />

        <StatTile
          label={t('debug.status.uptime')}
          value={<span className="font-mono">99.98<span className="text-base font-normal text-slate-500">%</span></span>}
          hint={t('debug.status.uptimeHint')}
          icon={<Timer className="h-5 w-5" />}
          accent="sky"
        />
      </div>

      <Panel
        title={t('debug.status.chartTitle')}
        subtitle={t('debug.status.chartSub')}
        icon={<Activity className="h-4 w-4" />}
      >
        <div className="p-3" style={{ direction: 'ltr' }}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="t" stroke="#64748b" tick={{ fontSize: 11 }} interval={3} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} width={40} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [`${v} ms`, 'ms']}
              />
              <Line type="monotone" dataKey="ms" stroke="#2d9cdb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  )
}
