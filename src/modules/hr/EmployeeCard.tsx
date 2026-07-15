// Employee card — same visual language as the warehouse category cards
// (CategoryExplorer.tsx): icon tile + bold title + hover chevron, a hero
// number with a unit caption and a ring-pill badge, one slim progress bar,
// and a calm ·-separated caption line pinned to the card bottom.
import { ChevronRight, Phone } from 'lucide-react'
import { Avatar } from '../../components/ui'
import { StatusBadge } from '../../components/shared'
import { useLang, useT } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Department, Employee } from '../../types'
import type { MonthStats } from './useHrStats'

export function EmployeeCard({
  emp,
  dept,
  stats,
  photoDocId,
  onClick,
}: {
  emp: Employee
  dept?: Department
  stats: MonthStats
  photoDocId?: string
  onClick: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const name = pickName(emp, lang)
  const pct = stats.requiredHours > 0 ? Math.min(100, (stats.workedHours / stats.requiredHours) * 100) : 0
  const leaveEmpty = stats.leaveDaysRemaining <= 0

  return (
    <button
      onClick={onClick}
      className="card group flex h-full flex-col p-5 text-start transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {/* Photo/avatar tile + full name + forward affordance on hover */}
      <div className="flex items-center gap-3">
        {photoDocId ? (
          <img
            src={`/api/employee-documents/${photoDocId}/file`}
            alt={name}
            className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 transition-transform group-hover:scale-105"
          />
        ) : (
          <span className="shrink-0 transition-transform group-hover:scale-105">
            <Avatar name={name} color={emp.photo_color} size="md" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug text-slate-800">{name}</p>
          {emp.phone_primary && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3 w-3 shrink-0" />
              <span dir="ltr" className="tabular-nums">{emp.phone_primary}</span>
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 rtl:rotate-180" />
      </div>

      {/* Hero count row — worked hours; the leave/status pill lives here,
          never crowding the title (same slot as the warehouse نفد badge) */}
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold leading-none tabular-nums text-slate-800">
          {formatNumber(stats.workedHours, lang, 1)}
        </span>
        <span className="text-xs text-slate-400">
          {t('hr.card.hours_of').replace('{y}', formatNumber(stats.requiredHours, lang))}
        </span>
        <span className="ms-auto flex items-center gap-1.5">
          {emp.status !== 'ACTIVE' && <StatusBadge status={emp.status} />}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
              leaveEmpty
                ? 'bg-red-50 text-red-600 ring-red-100'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-100',
            )}
          >
            {t('hr.card.leave_pill').replace('{n}', formatNumber(stats.leaveDaysRemaining, lang))}
          </span>
        </span>
      </div>

      {/* Worked-vs-required share bar, tinted with the person's avatar color */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(pct > 0 ? 6 : 0, Math.round(pct))}%`, backgroundColor: emp.photo_color || '#1a5f7a' }}
        />
      </div>

      {/* Calm caption line, pinned to the card bottom */}
      <p className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-3.5 text-xs leading-relaxed text-slate-400">
        {dept && <span>{pickName(dept, lang)}</span>}
        {emp.job_title && (
          <>
            {dept && <span className="text-slate-200">·</span>}
            <span>{emp.job_title}</span>
          </>
        )}
        <span className="text-slate-200">·</span>
        <span>
          {t('hr.card.hourly_short')}{' '}
          <span className="font-semibold tabular-nums text-slate-600">
            {formatNumber(stats.hourlyRemaining, lang, 1)}
          </span>
        </span>
      </p>
    </button>
  )
}
