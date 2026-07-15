// Compact month control: ‹ prev · month select · year select · next ›
// Value is 'YYYY-MM'. Iraqi Arabic month names (same set DateField uses).
import { ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react'
import { useLang, useT } from '../../context/LangContext'
import { Button } from '../../components/ui'
import { currentMonthKey, splitMonthKey } from './hours'

const MONTHS: Record<'ar' | 'en', string[]> = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

/** Localised «تموز 2026» label for a 'YYYY-MM' key. */
export function monthLabel(month: string, lang: 'ar' | 'en'): string {
  const { year, month: m } = splitMonthKey(month)
  const name = MONTHS[lang === 'en' ? 'en' : 'ar'][m - 1] ?? ''
  return `${name} ${year}`
}

export function MonthPicker({
  value,
  onChange,
  className,
}: {
  value: string // 'YYYY-MM'
  onChange: (v: string) => void
  className?: string
}) {
  const t = useT()
  const { lang } = useLang()
  const { year, month } = splitMonthKey(value)
  const months = MONTHS[lang === 'en' ? 'en' : 'ar']
  const thisYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = thisYear + 1; y >= thisYear - 5; y--) years.push(y)
  if (!years.includes(year)) years.push(year)

  const pad = (n: number) => String(n).padStart(2, '0')
  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      {/* «previous month» points backwards along the reading direction */}
      <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label={t('hr.filter.prev_month')}>
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </Button>
      <select
        value={month}
        onChange={(e) => onChange(`${year}-${pad(Number(e.target.value))}`)}
        className="input-base w-auto min-w-[7.5rem] py-1.5 text-sm"
        aria-label={t('hr.filter.month')}
      >
        {months.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange(`${Number(e.target.value)}-${pad(month)}`)}
        className="input-base w-auto py-1.5 text-sm tabular-nums"
        aria-label={t('hr.filter.year')}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label={t('hr.filter.next_month')}>
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </Button>
      {value !== currentMonthKey() && (
        <Button variant="ghost" size="sm" onClick={() => onChange(currentMonthKey())}>
          <RotateCcw className="h-3.5 w-3.5" />
          {t('hr.filter.current_month')}
        </Button>
      )}
    </div>
  )
}
