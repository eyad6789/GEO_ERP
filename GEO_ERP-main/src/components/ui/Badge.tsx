import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeColor =
  | 'gray'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue'
  | 'sky'
  | 'purple'
  | 'primary'

const COLORS: Record<BadgeColor, string> = {
  gray: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  primary: 'bg-primary/10 text-primary ring-primary/20',
}

export function Badge({
  color = 'gray',
  children,
  className,
  dot,
}: {
  color?: BadgeColor
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        COLORS[color],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}
