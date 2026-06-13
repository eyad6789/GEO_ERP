import { Link } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { formatCurrency } from '../../lib/format'
import type { Lang } from '../../i18n/strings'
import { OPERATIONAL_ADVANCE } from './shared'

/** السلف التشغيلية — reads chart account 16112 and links into the tree. */
export function AdvanceCard({ iqd, usd, lang, t }: { iqd: number; usd: number; lang: Lang; t: (k: string) => string }) {
  return (
    <Link
      to={`/accounting/accounts/${OPERATIONAL_ADVANCE}`}
      className="group flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 transition hover:border-amber-400 hover:shadow-card-hover"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
        <HandCoins className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 group-hover:text-amber-700">{t('accounting.cash.advance')}</p>
        <p className="text-xl font-bold tabular-nums text-amber-700">{formatCurrency(iqd, 'IQD', lang)}</p>
        {usd !== 0 && <p className="text-xs font-medium tabular-nums text-emerald-600">{formatCurrency(usd, 'USD', lang)}</p>}
      </div>
    </Link>
  )
}
