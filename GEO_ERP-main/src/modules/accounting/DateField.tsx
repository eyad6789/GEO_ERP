// A clear, unambiguous date control: three labelled parts — يوم / شهر / سنة —
// so the user always knows where the day, month and year go (the native
// <input type="date"> hid this, especially in RTL). Value is YYYY-MM-DD.
import { useLang, useT } from '../../context/LangContext'

const MONTHS: Record<'ar' | 'en', string[]> = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

const parse = (v: string) => {
  const [y = '', m = '', d = ''] = (v || '').split('-')
  return { y, m: m.replace(/^0/, ''), d: d.replace(/^0/, '') }
}
const build = (y: string, m: string, d: string) =>
  y && m && d ? `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : ''

export function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { lang } = useLang()
  const t = useT()
  const { y, m, d } = parse(value)

  const thisYear = new Date().getFullYear()
  const years: number[] = []
  for (let yr = thisYear + 1; yr >= thisYear - 10; yr--) years.push(yr)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = MONTHS[lang === 'en' ? 'en' : 'ar']

  const set = (part: 'y' | 'm' | 'd', val: string) => {
    const next = { y, m, d, [part]: val }
    onChange(build(next.y, next.m, next.d))
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Part caption={t('common.day')}>
        <select className="input-base" value={d} onChange={(e) => set('d', e.target.value)}>
          <option value="">—</option>
          {days.map((n) => (
            <option key={n} value={String(n)}>{n}</option>
          ))}
        </select>
      </Part>
      <Part caption={t('common.month')}>
        <select className="input-base" value={m} onChange={(e) => set('m', e.target.value)}>
          <option value="">—</option>
          {months.map((name, i) => (
            <option key={i} value={String(i + 1)}>{`${i + 1} — ${name}`}</option>
          ))}
        </select>
      </Part>
      <Part caption={t('common.year')}>
        <select className="input-base" value={y} onChange={(e) => set('y', e.target.value)}>
          <option value="">—</option>
          {years.map((yr) => (
            <option key={yr} value={String(yr)}>{yr}</option>
          ))}
        </select>
      </Part>
    </div>
  )
}

function Part({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-400">{caption}</span>
      {children}
    </div>
  )
}
