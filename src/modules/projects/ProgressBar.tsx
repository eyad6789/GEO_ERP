import { cn } from '../../lib/cn'

/** Compact progress bar with a brand-tinted fill, used across the Projects module. */
export function ProgressBar({
  value,
  className,
  showLabel = false,
  size = 'md',
}: {
  value: number
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)))
  const color = pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-primary' : pct >= 30 ? 'bg-accent' : 'bg-warning'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">{pct}%</span>}
    </div>
  )
}
