import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface KpiCardProps {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  trend?: number // percentage; positive => up
  accent?: 'primary' | 'accent' | 'success' | 'danger' | 'info' | 'warning'
}

const ACCENTS = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  success: 'text-success bg-success/10',
  danger: 'text-danger bg-danger/10',
  info: 'text-info bg-info/10',
  warning: 'text-warning bg-warning/10',
}

export function KpiCard({ label, value, icon, hint, trend, accent = 'primary' }: KpiCardProps) {
  return (
    <div className="card p-5 transition hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', ACCENTS[accent])}>
            {icon}
          </span>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium">
          {trend >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-danger" />
          )}
          <span className={trend >= 0 ? 'text-success' : 'text-danger'}>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  )
}
