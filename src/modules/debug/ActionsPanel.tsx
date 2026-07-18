import { useState, type ReactNode } from 'react'
import { Eraser, Database, HeartPulse, Download, Wrench, Power, Loader2, type LucideIcon } from 'lucide-react'
import { useToast } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { cn } from '../../lib/cn'
import { Panel } from './ui'
import { probeHealth } from './lib'

type Tone = 'sky' | 'green' | 'amber' | 'purple' | 'red'

const TONES: Record<Tone, { ring: string; icon: string }> = {
  sky: { ring: 'ring-sky-400/20 hover:border-sky-400/40', icon: 'text-sky-300 bg-sky-400/10' },
  green: { ring: 'ring-emerald-400/20 hover:border-emerald-400/40', icon: 'text-emerald-300 bg-emerald-400/10' },
  amber: { ring: 'ring-amber-400/20 hover:border-amber-400/40', icon: 'text-amber-300 bg-amber-400/10' },
  purple: { ring: 'ring-purple-400/20 hover:border-purple-400/40', icon: 'text-purple-300 bg-purple-400/10' },
  red: { ring: 'ring-red-400/20 hover:border-red-400/40', icon: 'text-red-300 bg-red-400/10' },
}

function ActionButton({
  icon: Icon,
  title,
  desc,
  tone,
  running,
  onClick,
  trailing,
}: {
  icon: LucideIcon
  title: ReactNode
  desc: ReactNode
  tone: Tone
  running?: boolean
  onClick: () => void
  trailing?: ReactNode
}) {
  const t = TONES[tone]
  return (
    <button
      onClick={onClick}
      disabled={running}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border border-debug-line bg-debug-panel p-3.5 text-start transition disabled:opacity-60',
        t.ring,
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', t.icon)}>
        {running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-100">{title}</span>
        <span className="block truncate text-xs text-slate-400 dark:text-slate-400">{desc}</span>
      </span>
      {trailing}
    </button>
  )
}

export function ActionsPanel() {
  const t = useT()
  const { lang } = useLang()
  const { success, error, toast } = useToast()
  const [running, setRunning] = useState<string | null>(null)
  const [maintenance, setMaintenance] = useState(false)

  const withSpinner = async (key: string, ms: number, done: () => void) => {
    setRunning(key)
    toast(t('debug.actions.running'))
    await new Promise((r) => setTimeout(r, ms))
    setRunning(null)
    done()
  }

  const clearCache = () => withSpinner('cache', 700, () => success(t('debug.actions.clearCacheDone')))
  const reindex = () => withSpinner('reindex', 1200, () => success(t('debug.actions.reindexDone')))
  const download = () => withSpinner('download', 500, () => success(t('debug.actions.downloadDone')))
  const restart = () => withSpinner('restart', 900, () => success(t('debug.actions.restartDone')))

  const healthCheck = async () => {
    setRunning('health')
    const { ms, ok } = await probeHealth()
    setRunning(null)
    if (ok) success(`${t('debug.actions.healthOk')} ${ms} ms`)
    else error(t('debug.actions.healthFail'))
  }

  const toggleMaintenance = () => {
    setMaintenance((m) => {
      const next = !m
      if (next) toast(t('debug.actions.maintenanceOn'))
      else success(t('debug.actions.maintenanceOff'))
      return next
    })
  }

  return (
    <div className="space-y-4">
      <Panel title={t('debug.actions.title')} subtitle={t('debug.actions.subtitle')} icon={<Wrench className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionButton
            icon={Eraser}
            tone="sky"
            title={t('debug.actions.clearCache')}
            desc={t('debug.actions.clearCacheDesc')}
            running={running === 'cache'}
            onClick={clearCache}
          />
          <ActionButton
            icon={Database}
            tone="purple"
            title={t('debug.actions.reindex')}
            desc={t('debug.actions.reindexDesc')}
            running={running === 'reindex'}
            onClick={reindex}
          />
          <ActionButton
            icon={HeartPulse}
            tone="green"
            title={t('debug.actions.health')}
            desc={t('debug.actions.healthDesc')}
            running={running === 'health'}
            onClick={healthCheck}
          />
          <ActionButton
            icon={Download}
            tone="sky"
            title={t('debug.actions.download')}
            desc={t('debug.actions.downloadDesc')}
            running={running === 'download'}
            onClick={download}
          />
          <ActionButton
            icon={Wrench}
            tone="amber"
            title={t('debug.actions.maintenance')}
            desc={t('debug.actions.maintenanceDesc')}
            onClick={toggleMaintenance}
            trailing={
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset',
                  maintenance
                    ? 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
                    : 'bg-slate-400/10 text-slate-400 dark:text-slate-400 ring-slate-400/20',
                )}
              >
                {maintenance ? t('debug.actions.on') : t('debug.actions.off')}
              </span>
            }
          />
        </div>
      </Panel>

      <Panel title={t('debug.actions.dangerZone')} icon={<Power className="h-4 w-4" />} className="border-red-400/30">
        <div className="p-4">
          <div className="max-w-md">
            <ActionButton
              icon={Power}
              tone="red"
              title={t('debug.actions.restart')}
              desc={t('debug.actions.restartDesc')}
              running={running === 'restart'}
              onClick={restart}
            />
          </div>
          <p className="mt-2 text-xs text-red-300/70">
            {lang === 'ar'
              ? 'هذه عمليات محاكاة لأغراض العرض ولا تؤثر على الخادم الفعلي.'
              : 'These are simulated demo operations and do not affect the live server.'}
          </p>
        </div>
      </Panel>
    </div>
  )
}
