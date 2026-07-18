// Employee card — identity-first "membership badge" (بطاقة العضو), the design
// panel winner. The person is the hero: a whisper-opacity wash of their
// personal tint crowns the card, a haloed avatar overlaps it, the name sits
// centered in Cairo, and the month compresses into one tinted hours meter plus
// a hairline-divided حضور/غياب/إجازة footer strip. The gold accent has exactly
// one job: a star chip for people who completed their required hours.
//
// Everything below the name is driven by the «الحقول المعروضة» picker (see
// cardFields.ts) — the wash, avatar, name and status/star slot are fixed.
import { type KeyboardEvent } from 'react'
import { Pencil, RotateCcw, Star, Trash2 } from 'lucide-react'
import { Avatar } from '../../components/ui'
import { StatusBadge } from '../../components/shared'
import { useLang, useT } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Employee } from '../../types'
import { CARD_FIELD_MAP, fieldsForSlot, MAX_METRICS, type CardFieldCtx } from './cardFields'
import type { MonthStats } from './useHrStats'

const HEX6 = /^#[0-9a-fA-F]{6}$/

// The footer's divider recipe is per-shape, not per-count: `[&>*+*]:border-s`
// is only correct while every cell is on one row. At four it wraps to 2×2 and
// needs a column rule on the even cells plus a row rule on the second row.
const FOOTER_GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2 [&>*+*]:border-s [&>*+*]:border-slate-100',
  3: 'grid-cols-3 [&>*+*]:border-s [&>*+*]:border-slate-100',
  4: 'grid-cols-2 [&>*:nth-child(even)]:border-s [&>*:nth-child(n+3)]:border-t [&>*]:border-slate-100',
}

const TONE_CLASS = {
  normal: 'text-slate-800',
  danger: 'text-danger',
  dim: 'text-slate-300',
} as const

export function EmployeeCard({
  emp,
  stats,
  photoDocId,
  fields,
  deptName = '',
  coName = '',
  onClick,
  onEdit,
  onDelete,
  onRestore,
  archived = false,
}: {
  emp: Employee
  stats: MonthStats
  photoDocId?: string
  /** Selected field keys — see cardFields.ts. */
  fields: string[]
  deptName?: string
  coName?: string
  onClick: () => void
  /** Management actions — rendered as hover icons inside the card's top corner. */
  onEdit?: () => void
  onDelete?: () => void
  onRestore?: () => void
  /** Archived cards are dimmed and carry a «مؤرشف» badge. */
  archived?: boolean
}) {
  const t = useT()
  const { lang } = useLang()

  // Keyboard activation: Enter/Space opens the profile, but only when the card
  // itself is focused — never when the focus is on an inner action button (else
  // deleting/restoring would also navigate).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault()
      onClick()
    }
  }
  const name = pickName(emp, lang)
  // Hex-alpha suffixes below need a clean 6-digit hex — fall back to primary.
  const tint = HEX6.test(emp.photo_color || '') ? emp.photo_color : '#1a5f7a'
  const pct = stats.requiredHours > 0 ? Math.min(100, (stats.workedHours / stats.requiredHours) * 100) : 0
  const starred = emp.status === 'ACTIVE' && stats.requiredHours > 0 && stats.workedHours >= stats.requiredHours

  const ctx: CardFieldCtx = { emp, stats, lang, t, deptName, coName }

  const chip = fields.includes('employee_number') ? CARD_FIELD_MAP.employee_number.value?.(ctx) : ''
  const lines = fieldsForSlot(fields, 'line')
    .map((f) => ({ key: f.key, dir: f.dir, text: f.value?.(ctx) ?? '' }))
    .filter((l) => l.text !== '')
  const showMeter = fields.includes('hours_meter')
  const metrics = fieldsForSlot(fields, 'metric').slice(0, MAX_METRICS)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-0 active:shadow-card',
        archived && 'opacity-90 hover:opacity-100',
      )}
    >
      {/* Management actions — hover-revealed icons INSIDE the card's top-end
          corner (over the status/star slot). Only shown when handlers are given. */}
      {(onEdit || onRestore || onDelete) && (
        <div className="absolute end-2 top-2 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          {onEdit && (
            <button
              type="button"
              title={t('common.edit')}
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="rounded-lg bg-white/90 p-1.5 text-slate-400 shadow ring-1 ring-inset ring-slate-200 backdrop-blur-sm transition hover:bg-white hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onRestore && (
            <button
              type="button"
              title={t('hr.emp.restore')}
              onClick={(e) => { e.stopPropagation(); onRestore() }}
              className="rounded-lg bg-white/90 p-1.5 text-slate-400 shadow ring-1 ring-inset ring-slate-200 backdrop-blur-sm transition hover:bg-white hover:text-emerald-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title={archived ? t('hr.delete.permanent_option') : t('hr.emp.delete')}
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="rounded-lg bg-white/90 p-1.5 text-slate-400 shadow ring-1 ring-inset ring-slate-200 backdrop-blur-sm transition hover:bg-white hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Archived marker — pinned inside the bottom-start corner */}
      {archived && (
        <span className="pointer-events-none absolute bottom-2 start-2 z-10 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-white">
          {t('hr.archived.badge')}
        </span>
      )}

      {/* Identity wash — the personal tint at whisper opacity, fading downward */}
      <div
        aria-hidden
        className="h-[4.25rem] w-full shrink-0"
        style={{ background: `linear-gradient(180deg, ${tint}2e 0%, ${tint}12 60%, ${tint}00 100%)` }}
      />

      {/* Employee number chip — makes numbering gaps (15, 19) explainable */}
      {chip ? (
        <span className="absolute start-3 top-3 inline-flex items-center rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-500 ring-1 ring-inset ring-slate-200 backdrop-blur-sm">
          {chip}
        </span>
      ) : null}

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
          className="rounded-full bg-white p-1 transition-transform duration-200 group-hover:scale-105"
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

      {/* Who — name large in Cairo; the calm secondary lines the picker allows */}
      <div className="flex w-full flex-col items-center px-4 pt-2.5">
        <p className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-800 transition-colors group-hover:text-primary">
          {name}
        </p>
        {lines.map((l) => (
          <p key={l.key} className="mt-1 max-w-full truncate text-xs text-slate-400" dir={l.dir}>
            {l.dir === 'ltr' ? <span className="tabular-nums tracking-wide">{l.text}</span> : l.text}
          </p>
        ))}
      </div>

      {/* The meter+footer block owns mt-auto, so hiding the meter still leaves
          the footer pinned to the bottom and cards in a row stay aligned. */}
      <div className="mt-auto w-full">
        {showMeter && (
          <div className="w-full px-4 pt-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold tabular-nums text-slate-700">
                {formatNumber(stats.workedHours, lang, 1)}
                <span className="ms-1 font-normal text-slate-400">
                  {t('hr.card.hours_of_short').replace('{y}', formatNumber(stats.requiredHours, lang))}
                </span>
              </span>
              <span className="tabular-nums text-slate-400">{formatNumber(Math.round(pct), lang)}٪</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(pct > 0 ? 6 : 0, Math.round(pct))}%`, backgroundColor: tint }}
              />
            </div>
          </div>
        )}

        {/* Segmented footer strip — hairline-divided. Omitted entirely when no
            metric is selected, so no stray top hairline is left behind. */}
        {metrics.length > 0 && (
          <div className={cn('mt-3.5 grid w-full border-t border-slate-100', FOOTER_GRID[metrics.length])}>
            {metrics.map((f) => {
              const tone = f.tone?.(ctx) ?? 'normal'
              const suffix = f.suffix?.(ctx)
              return (
                <div key={f.key} className="py-2.5">
                  {/* «المتبقي من المستحق» phrased with من — bidi-safe with Arabic-Indic digits */}
                  <p className={cn('text-sm font-bold tabular-nums leading-none', TONE_CLASS[tone])}>
                    {f.value?.(ctx)}
                    {suffix ? <span className="text-[10px] font-normal text-slate-400"> {suffix}</span> : null}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">{t(f.labelKey)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
