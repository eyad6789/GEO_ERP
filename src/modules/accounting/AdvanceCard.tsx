import { Link } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { formatCurrency } from '../../lib/format'
import type { Lang } from '../../i18n/strings'
import { OPERATIONAL_ADVANCE } from './shared'

/** Operational / employee advance — links to the resolved advance account. */
export function AdvanceCard({ code = OPERATIONAL_ADVANCE, iqd, usd, lang, t }: { code?: string; iqd: number; usd: number; lang: Lang; t: (k: string) => string }) {
  return (
    <Link
      to={`/accounting/accounts/${code}`}
      className="group flex items-center gap-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 p-5 transition hover:border-amber-400 hover:shadow-card-hover"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300">
        <HandCoins className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-amber-700">{t('accounting.cash.advance')}</p>
        <p className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatCurrency(iqd, 'IQD', lang)}</p>
        {/* Always show the dollar line (even at 0) so the advance card matches the
            dinar+dollar layout of the other cash cards. */}
        <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">{formatCurrency(usd, 'USD', lang)}</p>
      </div>
    </Link>
  )
}
