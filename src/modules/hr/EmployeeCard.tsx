// Employee card — identity-first "membership badge" (بطاقة العضو), the design
// panel winner. The person is the hero: a whisper-opacity wash of their
// personal tint crowns the card, a haloed avatar overlaps it, the name sits
// centered in Cairo, and the month compresses into one tinted hours meter plus
// a hairline-divided حضور/غياب/إجازة footer strip. The gold accent has exactly
// one job: a star chip for people who completed their required hours.
import { type KeyboardEvent } from 'react'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { Avatar } from '../../components/ui'
import { StatusBadge } from '../../components/shared'
import { useLang, useT } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Employee } from '../../types'
import type { MonthStats } from './useHrStats'

const HEX6 = /^#[0-9a-fA-F]{6}$/

export function EmployeeCard({
  emp,
  stats,
  photoDocId,
  onClick,
  onEdit,
  onDelete,
}: {
  emp: Employee
  stats: MonthStats
  photoDocId?: string
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
  }
  const name = pickName(emp, lang)
  // Hex-alpha suffixes below need a clean 6-digit hex — fall back to primary.
  const tint = HEX6.test(emp.photo_color || '') ? emp.photo_color : '#1a5f7a'
  const pct = stats.requiredHours > 0 ? Math.min(100, (stats.workedHours / stats.requiredHours) * 100) : 0
  const leaveEmpty = stats.leaveDaysRemaining <= 0
  const starred = emp.status === 'ACTIVE' && stats.requiredHours > 0 && stats.workedHours >= stats.requiredHours

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-0 active:shadow-card"
    >
      {/* Edit / delete quick actions — always visible on the card top */}
      {(onEdit || onDelete) && (
        <div className="absolute end-2 top-2 z-10 flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              title={t('common.edit')}
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/80 text-slate-500 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 backdrop-blur-sm transition hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title={t('common.delete')}
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/80 text-slate-500 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 backdrop-blur-sm transition hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Identity wash — the personal tint at whisper opacity, fading downward */}
      <div
        aria-hidden
        className="h-[4.25rem] w-full shrink-0"
        style={{ background: `linear-gradient(180deg, ${tint}2e 0%, ${tint}12 60%, ${tint}00 100%)` }}
      />

      {/* Employee number chip — always visible so numbering gaps (15, 19) are explainable */}
      <span className="absolute start-3 top-3 inline-flex items-center rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 backdrop-blur-sm">
        {t('hr.card.num_chip').replace('{n}', formatNumber(Number(emp.employee_number) || 0, lang))}
      </span>

      {/* End slot: status only when it is news; else the gold completed-hours star */}
      {emp.status !== 'ACTIVE' ? (
        <span className="absolute end-3 top-3">
          <StatusBadge status={emp.status} />
        </span>
      ) : starred ? (
        <span
          title={t('hr.card.hours_complete')}
          className="absolute end-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent-dark ring-1 ring-inset ring-accent/30"
        >
          <Star className="h-3.5 w-3.5 fill-current" />
        </span>
      ) : null}

      {/* Haloed avatar overlapping the wash — white keyline + soft tint ring */}
      <div className="-mt-9 flex justify-center">
        <span
          className="rounded-full bg-white dark:bg-slate-800 p-1 transition-transform duration-200 group-hover:scale-105"
          style={{ boxShadow: `0 0 0 4px ${tint}26` }}
        >
          {photoDocId ? (
            <img
              src={`/api/employee-documents/${photoDocId}/file`}
              alt={name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <Avatar name={name} color={tint} size="lg" />
          )}
        </span>
      </div>

      {/* Who — name large in Cairo; one calm secondary line (title if it exists, else phone) */}
      <div className="flex flex-col items-center px-4 pt-2.5">
        <p className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-800 dark:text-slate-100 transition-colors group-hover:text-primary">
          {name}
        </p>
        {emp.job_title ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{emp.job_title}</p>
        ) : emp.phone_primary ? (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400" dir="ltr">
            <span className="tabular-nums tracking-wide">{emp.phone_primary}</span>
          </p>
        ) : null}
      </div>

      {/* Hours meter — worked vs required, labeled, tinted with the personal color */}
      <div className="mt-auto w-full px-4 pt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">
            {formatNumber(stats.workedHours, lang, 1)}
            <span className="ms-1 font-normal text-slate-400 dark:text-slate-400">
              {t('hr.card.hours_of_short').replace('{y}', formatNumber(stats.requiredHours, lang))}
            </span>
          </span>
          <span className="tabular-nums text-slate-400 dark:text-slate-400">{formatNumber(Math.round(pct), lang)}٪</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(pct > 0 ? 6 : 0, Math.round(pct))}%`, backgroundColor: tint }}
          />
        </div>
      </div>

      {/* Segmented footer strip — present / absent / leave balance, hairline-divided */}
      <div className="mt-3.5 grid w-full grid-cols-3 border-t border-slate-100 dark:border-slate-700/70 [&>*+*]:border-s [&>*+*]:border-slate-100">
        <div className="py-2.5">
          <p className="text-sm font-bold tabular-nums leading-none text-slate-800 dark:text-slate-100">
            {formatNumber(stats.presentDays, lang)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-400">{t('hr.card.present_days')}</p>
        </div>
        <div className="py-2.5">
          <p
            className={cn(
              'text-sm font-bold tabular-nums leading-none',
              stats.absentDays > 0 ? 'text-danger' : 'text-slate-300',
            )}
          >
            {formatNumber(stats.absentDays, lang)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-400">{t('hr.card.absent_days')}</p>
        </div>
        <div className="py-2.5">
          {/* «المتبقي من المستحق» phrased with من — bidi-safe with Arabic-Indic digits */}
          <p
            className={cn(
              'text-sm font-bold tabular-nums leading-none',
              leaveEmpty ? 'text-danger' : 'text-slate-800 dark:text-slate-100',
            )}
          >
            {formatNumber(stats.leaveDaysRemaining, lang)}
            <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400">
              {' '}{t('hr.card.of_n').replace('{y}', formatNumber(stats.leaveDaysEntitled, lang))}
            </span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-400">{t('hr.card.leave_left_short')}</p>
        </div>
      </div>
    </div>
  )
}
