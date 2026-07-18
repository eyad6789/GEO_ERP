import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (key: string) => void
  className?: string
  variant?: 'underline' | 'pills'
  /** underline variant: wrap tabs onto a new line instead of scrolling horizontally. */
  wrap?: boolean
}

export function Tabs({ tabs, value, onChange, className, variant = 'underline', wrap = false }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 p-1', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition',
              value === tab.key
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-1 border-b border-slate-200 dark:border-slate-700',
        wrap ? 'flex-wrap' : 'overflow-x-auto scrollbar-none',
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition -mb-px',
            value === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200',
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge}
        </button>
      ))}
    </div>
  )
}
