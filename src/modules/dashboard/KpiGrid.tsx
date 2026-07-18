import { Users, Truck } from 'lucide-react'
import { KpiCard } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatNumber } from '../../lib/format'
import type { DashboardData } from '../../types'

export function KpiGrid({ data }: { data: DashboardData }) {
  const t = useT()
  const { lang } = useLang()
  const { counts, finance } = data

  // IQD figure with a small USD sub-line when USD activity exists. The two
  // currencies are kept separate — never summed or converted.
  const withUsd = (iqd: number, usd: number) =>
    usd ? (
      <span className="inline-flex flex-col">
        <span>{formatCurrency(iqd, 'IQD', lang)}</span>
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{formatCurrency(usd, 'USD', lang)}</span>
      </span>
    ) : (
      formatCurrency(iqd, 'IQD', lang)
    )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <KpiCard
        label={t('dashboard.kpi.employees')}
        value={formatNumber(counts.employees, lang)}
        hint={t('dashboard.kpi.employees_hint')}
        icon={<Users className="h-5 w-5" />}
        accent="accent"
      />
      <KpiCard
        label={t('dashboard.kpi.fleet_spend')}
        value={withUsd(finance.fleet_spend_iqd ?? 0, finance.fleet_spend_usd ?? 0)}
        hint={t('dashboard.kpi.fleet_spend_hint')}
        icon={<Truck className="h-5 w-5" />}
        accent="warning"
      />
    </div>
  )
}
