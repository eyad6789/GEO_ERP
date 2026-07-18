// What an employee card shows — the catalog behind the «الحقول المعروضة» picker.
//
// The card's identity core (the tint wash, the avatar, the name, and the
// status/star end slot) is deliberately NOT in here: the first three are the
// card's whole premise, and the end slot is a state signal rather than a field —
// hiding it would let a card quietly misreport a TERMINATED employee.
//
// Everything else is a slot: a chip over the wash, a detail line under the name,
// the hours meter, or a footer metric cell. `value()` returning '' hides the
// field for that employee, so a person with no job title simply loses the line
// instead of rendering an em-dash.
import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@/i18n/strings'
import { formatDate, formatNumber } from '@/lib/format'
import type { Employee } from '@/types'
import type { MonthStats } from './useHrStats'

export type CardSlot = 'chip' | 'line' | 'meter' | 'metric'

/** Danger/dim tones exist to preserve the hand-tuned footer: absent is dimmed at
 *  zero and red above it; an empty leave balance is red. */
export type MetricTone = 'normal' | 'danger' | 'dim'

export interface CardFieldCtx {
  emp: Employee
  stats: MonthStats
  lang: Lang
  t: (key: string) => string
  /** Resolved by the caller — '' when absent (never pickName's '—'). */
  deptName: string
  coName: string
}

export interface CardField {
  key: string
  slot: CardSlot
  /** An existing i18n key — this catalog adds no field labels of its own. */
  labelKey: string
  /** Latin digits (phones, IBAN-ish ids, emails) need isolating under RTL. */
  dir?: 'ltr'
  /** chip | line | metric. '' → the field renders nothing. Absent for 'meter',
   *  which the card draws itself. */
  value?: (c: CardFieldCtx) => string
  /** metric only — the small «من N» trailing the number. */
  suffix?: (c: CardFieldCtx) => string
  /** metric only. */
  tone?: (c: CardFieldCtx) => MetricTone
}

/** More than four footer cells stop fitting: at 2xl:grid-cols-5 a card is
 *  ~220px, and «إجازة متبقية» at 11px wraps below ~55px. */
export const MAX_METRICS = 4

const num = (v: number, lang: Lang, decimals = 0) => formatNumber(v, lang, decimals)

export const CARD_FIELDS: CardField[] = [
  // --- chip ---------------------------------------------------------------
  {
    key: 'employee_number',
    slot: 'chip',
    labelKey: 'hr.emp.number',
    // Two seeders, two formats: seed:hr writes plain digits ('1'..'20'), which
    // localise to Arabic-Indic; seed writes 'EMP-0001', which doesn't parse —
    // show it verbatim rather than the «رقم ٠» that `Number(x) || 0` produced.
    value: ({ emp, lang, t }) => {
      const raw = (emp.employee_number ?? '').trim()
      if (!raw) return ''
      const n = Number(raw)
      return t('hr.card.num_chip').replace('{n}', Number.isFinite(n) ? num(n, lang) : raw)
    },
  },

  // --- detail lines (rendered in this order, never click order) -----------
  { key: 'job_title', slot: 'line', labelKey: 'hr.f.job_title', value: ({ emp }) => emp.job_title || '' },
  {
    key: 'phone_primary',
    slot: 'line',
    labelKey: 'hr.f.phone_primary',
    dir: 'ltr',
    value: ({ emp }) => emp.phone_primary || '',
  },
  { key: 'department', slot: 'line', labelKey: 'hr.f.department', value: ({ deptName }) => deptName },
  { key: 'company', slot: 'line', labelKey: 'hr.f.company', value: ({ coName }) => coName },
  {
    key: 'national_id',
    slot: 'line',
    labelKey: 'hr.f.national_id',
    dir: 'ltr',
    value: ({ emp }) => emp.national_id || '',
  },
  { key: 'email_work', slot: 'line', labelKey: 'hr.f.email_work', dir: 'ltr', value: ({ emp }) => emp.email_work || '' },
  {
    key: 'employment_type',
    slot: 'line',
    labelKey: 'hr.f.employment_type',
    value: ({ emp, t }) => (emp.employment_type ? t(`hr.etype.${emp.employment_type}`) : ''),
  },
  {
    key: 'hire_date',
    slot: 'line',
    labelKey: 'hr.f.hire_date',
    value: ({ emp, lang }) => (emp.hire_date ? formatDate(emp.hire_date, lang) : ''),
  },
  { key: 'gender', slot: 'line', labelKey: 'hr.f.gender', value: ({ emp, t }) => (emp.gender ? t(`hr.gender.${emp.gender}`) : '') },
  { key: 'dob', slot: 'line', labelKey: 'hr.f.dob', value: ({ emp, lang }) => (emp.dob ? formatDate(emp.dob, lang) : '') },

  // --- meter --------------------------------------------------------------
  { key: 'hours_meter', slot: 'meter', labelKey: 'hr.card.worked_hours' },

  // --- footer metrics -----------------------------------------------------
  {
    key: 'present_days',
    slot: 'metric',
    labelKey: 'hr.card.present_days',
    value: ({ stats, lang }) => num(stats.presentDays, lang),
  },
  {
    key: 'absent_days',
    slot: 'metric',
    labelKey: 'hr.card.absent_days',
    value: ({ stats, lang }) => num(stats.absentDays, lang),
    tone: ({ stats }) => (stats.absentDays > 0 ? 'danger' : 'dim'),
  },
  {
    key: 'leave_left',
    slot: 'metric',
    labelKey: 'hr.card.leave_left_short',
    value: ({ stats, lang }) => num(stats.leaveDaysRemaining, lang),
    suffix: ({ stats, lang, t }) => t('hr.card.of_n').replace('{y}', num(stats.leaveDaysEntitled, lang)),
    tone: ({ stats }) => (stats.leaveDaysRemaining <= 0 ? 'danger' : 'normal'),
  },
  {
    key: 'hours_left',
    slot: 'metric',
    labelKey: 'hr.card.hours_left_short',
    value: ({ stats, lang }) => num(stats.hoursRemaining, lang, 1),
  },
  {
    key: 'hourly_left',
    slot: 'metric',
    labelKey: 'hr.card.hourly_left_short',
    value: ({ stats, lang }) => num(stats.hourlyRemaining, lang, 1),
    suffix: ({ stats, lang, t }) => t('hr.card.of_n').replace('{y}', num(stats.hourlyAllowance, lang)),
    tone: ({ stats }) => (stats.hourlyRemaining <= 0 ? 'danger' : 'normal'),
  },
]

export const CARD_FIELD_MAP: Record<string, CardField> = Object.fromEntries(CARD_FIELDS.map((f) => [f.key, f]))

/** Reproduces the card as designed. `job_title` AND `phone_primary` are both on
 *  because the two seeders disagree: `npm run seed` always sets a job title,
 *  while `npm run seed:hr` (the real Baghdad-office staff) imports only
 *  name/phone/address and sets none — defaulting to the title alone would leave
 *  those cards with nothing under the name. Unchecking the phone restores the
 *  original single-line card. */
export const DEFAULT_CARD_FIELDS: string[] = [
  'employee_number',
  'job_title',
  'phone_primary',
  'hours_meter',
  'present_days',
  'absent_days',
  'leave_left',
]

const STORAGE_KEY = 'geo_erp.hr.card_fields.v1'

export function loadCardFields(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Only a MISSING key means "first run". A stored empty array is a real
    // choice (just faces and names) and must survive a reload.
    if (raw === null) return DEFAULT_CARD_FIELDS
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_CARD_FIELDS
    return parsed.filter((k): k is string => typeof k === 'string' && k in CARD_FIELD_MAP)
  } catch {
    return DEFAULT_CARD_FIELDS
  }
}

export interface UseCardFieldsResult {
  fields: string[]
  has: (key: string) => boolean
  toggle: (key: string) => void
  reset: () => void
}

/** The picker's selection, persisted. It has to be: the Employees tab unmounts
 *  on a tab switch, and opening an employee unmounts HrShell entirely, so there
 *  is no in-memory home that survives the module's own navigation. */
export function useCardFields(): UseCardFieldsResult {
  const [fields, setFields] = useState<string[]>(loadCardFields)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fields))
    } catch {
      // Private-mode quota errors must not break the page.
    }
  }, [fields])

  const toggle = useCallback((key: string) => {
    setFields((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }, [])

  const reset = useCallback(() => setFields(DEFAULT_CARD_FIELDS), [])
  const has = useCallback((key: string) => fields.includes(key), [fields])

  return { fields, has, toggle, reset }
}

/** Selected fields of a slot, in catalog order. */
export function fieldsForSlot(selected: string[], slot: CardSlot): CardField[] {
  return CARD_FIELDS.filter((f) => f.slot === slot && selected.includes(f.key))
}
