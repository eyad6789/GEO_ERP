// Dark-themed local UI primitives for the Debug panel. The shared (light)
// Card/Table/Tabs would clash with the dark ops dashboard, so we roll our own.
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Panel({
  children,
  className,
  title,
  icon,
  action,
  subtitle,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  subtitle?: ReactNode
}) {
  return (
    <div className={cn('rounded-xl border border-debug-line bg-debug-panel shadow-lg shadow-black/20', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-debug-line px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-primary-light">{icon}</span>}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-100">{title}</h3>
              {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

/** Small dark stat tile for the status panel. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  accent = 'sky',
  children,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  accent?: 'sky' | 'green' | 'amber' | 'red' | 'purple'
  children?: ReactNode
}) {
  const ring: Record<string, string> = {
    sky: 'text-sky-300 bg-sky-400/10 ring-sky-400/20',
    green: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20',
    amber: 'text-amber-300 bg-amber-400/10 ring-amber-400/20',
    red: 'text-red-300 bg-red-400/10 ring-red-400/20',
    purple: 'text-purple-300 bg-purple-400/10 ring-purple-400/20',
  }
  return (
    <div className="rounded-xl border border-debug-line bg-debug-panel p-4 shadow-lg shadow-black/20 transition hover:border-primary-light/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-100">{value}</p>
        </div>
        {icon && (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', ring[accent])}>
            {icon}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="mt-2 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

/** Dark table shell. Use with DTh/DTd cells. */
export function DTable({ children, head }: { children: ReactNode; head: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead className="bg-debug-bg/60">
          <tr className="border-b border-debug-line text-xs uppercase tracking-wide text-slate-400">{head}</tr>
        </thead>
        <tbody className="divide-y divide-debug-line/70">{children}</tbody>
      </table>
    </div>
  )
}

export function DTh({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 text-start font-semibold', className)}>{children}</th>
}

export function DTd({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-2.5 align-middle text-slate-300', className)}>{children}</td>
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-sky-300 bg-sky-400/10 ring-sky-400/20',
  POST: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20',
  PUT: 'text-amber-300 bg-amber-400/10 ring-amber-400/20',
  DELETE: 'text-red-300 bg-red-400/10 ring-red-400/20',
}

export function MethodTag({ method }: { method: string }) {
  return (
    <span className={cn('inline-flex rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ring-1 ring-inset', METHOD_COLORS[method] ?? 'text-slate-300 bg-slate-400/10 ring-slate-400/20')}>
      {method}
    </span>
  )
}

export function StatusTag({ status }: { status: number }) {
  const color =
    status === 0
      ? 'text-red-300 bg-red-400/10 ring-red-400/20'
      : status >= 500
        ? 'text-red-300 bg-red-400/10 ring-red-400/20'
        : status >= 400
          ? 'text-amber-300 bg-amber-400/10 ring-amber-400/20'
          : 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/20'
  return (
    <span className={cn('inline-flex rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ring-1 ring-inset', color)}>
      {status === 0 ? 'ERR' : status}
    </span>
  )
}
