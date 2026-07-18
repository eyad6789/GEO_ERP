import { Database } from 'lucide-react'
import { useT, useLang } from '../../context/LangContext'
import { cn } from '../../lib/cn'
import { Panel, DTable, DTh, DTd } from './ui'
import { formatNumber } from '../../lib/format'
import { seedQueries } from './lib'

export function QueriesPanel() {
  const t = useT()
  const { lang } = useLang()
  const queries = seedQueries().sort((a, b) => b.ms - a.ms)

  return (
    <Panel
      title={t('debug.db.title')}
      subtitle="SQLite · pragma profile"
      icon={<Database className="h-4 w-4" />}
    >
      <DTable
        head={
          <>
            <DTh>{t('debug.db.query')}</DTh>
            <DTh className="w-40">{t('debug.db.table')}</DTh>
            <DTh className="w-24 text-end">{t('debug.db.rows')}</DTh>
            <DTh className="w-24 text-end">{t('debug.db.calls')}</DTh>
            <DTh className="w-32 text-end">{t('debug.db.duration')}</DTh>
          </>
        }
      >
        {queries.map((q) => {
          const slow = q.ms > 500
          return (
            <tr key={q.id} className={cn('transition hover:bg-white/[0.02]', slow && 'bg-amber-500/[0.06]')}>
              <DTd>
                <code className="block max-w-[420px] truncate font-mono text-xs text-slate-300" dir="ltr" title={q.sql}>
                  {q.sql}
                </code>
              </DTd>
              <DTd>
                <span className="rounded bg-debug-bg px-1.5 py-0.5 font-mono text-[11px] text-purple-300 ring-1 ring-inset ring-debug-line">
                  {q.table}
                </span>
              </DTd>
              <DTd className="text-end font-mono tabular-nums text-slate-400 dark:text-slate-400">{formatNumber(q.rows, lang)}</DTd>
              <DTd className="text-end font-mono tabular-nums text-slate-400 dark:text-slate-400">{formatNumber(q.calls, lang)}</DTd>
              <DTd className="text-end">
                <span className={cn('font-mono font-bold tabular-nums', slow ? 'text-amber-300' : 'text-emerald-300')}>
                  {formatNumber(q.ms, lang)} ms
                </span>
                <span
                  className={cn(
                    'ms-2 inline-flex rounded px-1.5 py-px text-[10px] font-bold ring-1 ring-inset',
                    slow
                      ? 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
                      : 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
                  )}
                >
                  {slow ? t('debug.db.slowBadge') : t('debug.db.fast')}
                </span>
              </DTd>
            </tr>
          )
        })}
      </DTable>
    </Panel>
  )
}
