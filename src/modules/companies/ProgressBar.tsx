import { useLang } from '../../context/LangContext'
import { formatNumber } from '../../lib/format'

/** Slim horizontal progress bar with a percentage label, tuned by completion. */
export function ProgressBar({ value }: { value: number }) {
  const { lang } = useLang()
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)))
  const color =
    pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-primary' : pct >= 30 ? 'bg-accent' : 'bg-danger'

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 shrink-0 text-end text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
        {formatNumber(pct, lang)}%
      </span>
    </div>
  )
}
