import { Calendar } from 'lucide-react'
import { Field, Input } from '../../components/ui'
import { useT } from '../../context/LangContext'

export interface DateRange {
  from: string
  to: string
}

/** Shared from/to date-range toolbar. The global company filter lives in the top bar. */
export function FilterBar({
  range,
  onChange,
  right,
}: {
  range: DateRange
  onChange: (r: DateRange) => void
  right?: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="card mb-4 flex flex-wrap items-end justify-between gap-4 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <span className="flex h-9 items-center gap-2 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary">
          <Calendar className="h-4 w-4" />
          {t('accounting.filter.range')}
        </span>
        <Field label={t('accounting.filter.from')} className="w-40">
          <Input
            type="date"
            value={range.from}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
          />
        </Field>
        <Field label={t('accounting.filter.to')} className="w-40">
          <Input
            type="date"
            value={range.to}
            onChange={(e) => onChange({ ...range, to: e.target.value })}
          />
        </Field>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
