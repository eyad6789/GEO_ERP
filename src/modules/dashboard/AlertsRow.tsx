import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PackageX, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber } from '../../lib/format'
import type { DashboardData } from '../../types'

type Accent = 'danger' | 'warning' | 'info'

const STYLES: Record<
  Accent,
  { ring: string; iconWrap: string; value: string; bar: string }
> = {
  danger: {
    ring: 'hover:border-danger/40 hover:shadow-card-hover',
    iconWrap: 'bg-danger/10 text-danger',
    value: 'text-danger',
    bar: 'bg-danger',
  },
  warning: {
    ring: 'hover:border-warning/40 hover:shadow-card-hover',
    iconWrap: 'bg-warning/10 text-warning',
    value: 'text-warning',
    bar: 'bg-warning',
  },
  info: {
    ring: 'hover:border-info/40 hover:shadow-card-hover',
    iconWrap: 'bg-info/10 text-info',
    value: 'text-info',
    bar: 'bg-info',
  },
}

function AlertCard({
  to,
  icon,
  label,
  count,
  hint,
  accent,
}: {
  to: string
  icon: ReactNode
  label: string
  count: number
  hint: string
  accent: Accent
}) {
  const { lang } = useLang()
  const t = useT()
  const s = STYLES[accent]
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight

  return (
    <Link
      to={to}
      className={`group card relative flex items-center gap-4 overflow-hidden p-5 transition-all ${s.ring}`}
    >
      <span className={`absolute inset-y-0 start-0 w-1 ${s.bar}`} />
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconWrap}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tabular-nums ${s.value}`}>{formatNumber(count, lang)}</span>
          <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-400">{hint}</p>
      </div>
      <span className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-400 transition group-hover:text-primary">
        <span className="hidden sm:inline">{t('dashboard.alerts.review')}</span>
        <Chevron className="h-4 w-4" />
      </span>
    </Link>
  )
}

export function AlertsRow({ alerts }: { alerts: DashboardData['alerts'] }) {
  const t = useT()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <AlertCard
        to="/warehouse"
        icon={<PackageX className="h-6 w-6" />}
        label={t('dashboard.alerts.low_stock')}
        count={alerts.low_stock}
        hint={t('dashboard.alerts.low_stock_hint')}
        accent="danger"
      />
      <AlertCard
        to="/hr"
        icon={<CalendarClock className="h-6 w-6" />}
        label={t('dashboard.alerts.pending_leaves')}
        count={alerts.pending_leaves}
        hint={t('dashboard.alerts.pending_leaves_hint')}
        accent="warning"
      />
    </div>
  )
}
