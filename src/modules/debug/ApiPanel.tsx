import { useEffect, useState } from 'react'
import { Network, RefreshCw } from 'lucide-react'
import { useT, useLang } from '../../context/LangContext'
import { cn } from '../../lib/cn'
import { Panel, DTable, DTh, DTd, MethodTag, StatusTag } from './ui'
import { formatNumber } from '../../lib/format'
import { probeEndpoint, relTime, seedApiCalls, nextApiId, type ApiCall } from './lib'

const REAL_PROBES: { method: ApiCall['method']; endpoint: string }[] = [
  { method: 'GET', endpoint: '/health' },
  { method: 'GET', endpoint: '/companies' },
  { method: 'GET', endpoint: '/dashboard' },
]

export function ApiPanel() {
  const t = useT()
  const { lang } = useLang()
  const [calls, setCalls] = useState<ApiCall[]>(() => seedApiCalls())
  const [busy, setBusy] = useState(false)

  const runRealProbes = async () => {
    setBusy(true)
    const results = await Promise.all(REAL_PROBES.map((p) => probeEndpoint(p.method, p.endpoint)))
    setCalls((prev) => [...results.map((r) => ({ ...r, id: nextApiId() })), ...prev].slice(0, 40))
    setBusy(false)
  }

  // fire real probes once on mount
  useEffect(() => {
    void runRealProbes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Panel
      title={t('debug.api.title')}
      subtitle={`${calls.length} ${t('debug.logs.lines')}`}
      icon={<Network className="h-4 w-4" />}
      action={
        <button
          onClick={runRealProbes}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-debug-line px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-debug-line disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          {t('debug.api.replay')}
        </button>
      }
    >
      <DTable
        head={
          <>
            <DTh className="w-20">{t('debug.api.method')}</DTh>
            <DTh>{t('debug.api.endpoint')}</DTh>
            <DTh className="w-20">{t('debug.api.status')}</DTh>
            <DTh className="w-24 text-end">{t('debug.api.time')}</DTh>
            <DTh className="w-20 text-end">{t('debug.api.size')}</DTh>
            <DTh className="w-24 text-end">{t('debug.api.when')}</DTh>
          </>
        }
      >
        {calls.map((c) => {
          const slow = c.ms > 1000
          return (
            <tr
              key={c.id}
              className={cn(
                'transition hover:bg-white/[0.02]',
                slow && 'bg-red-500/[0.07]',
              )}
            >
              <DTd><MethodTag method={c.method} /></DTd>
              <DTd>
                <span className="flex items-center gap-2 font-mono text-xs text-slate-200">
                  <span dir="ltr">{c.endpoint}</span>
                  {c.real && (
                    <span className="rounded bg-primary-light/15 px-1 py-px text-[10px] font-bold text-primary-light ring-1 ring-inset ring-primary-light/30">
                      {t('debug.api.real')}
                    </span>
                  )}
                </span>
              </DTd>
              <DTd><StatusTag status={c.status} /></DTd>
              <DTd className="text-end">
                <span className={cn('font-mono tabular-nums', slow ? 'font-bold text-red-300' : 'text-slate-300')}>
                  {formatNumber(c.ms, lang)} ms
                </span>
                {slow && (
                  <span className="ms-1.5 rounded bg-red-400/15 px-1 py-px text-[10px] font-bold text-red-300 ring-1 ring-inset ring-red-400/30">
                    {t('debug.api.slow')}
                  </span>
                )}
              </DTd>
              <DTd className="text-end font-mono text-xs tabular-nums text-slate-400 dark:text-slate-400">{c.size}</DTd>
              <DTd className="text-end text-xs text-slate-500 dark:text-slate-400">{relTime(c.at, lang)}</DTd>
            </tr>
          )
        })}
      </DTable>
    </Panel>
  )
}
