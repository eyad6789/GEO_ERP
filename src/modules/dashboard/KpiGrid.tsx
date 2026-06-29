import { FolderKanban, Users, TrendingUp, Banknote, FileSignature, Truck } from 'lucide-react'
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
        <span className="text-sm font-semibold text-emerald-600">{formatCurrency(usd, 'USD', lang)}</span>
      </span>
    ) : (
      formatCurrency(iqd, 'IQD', lang)
    )

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label={t('dashboard.kpi.employees')}
        value={formatNumber(counts.employees, lang)}
        hint={t('dashboard.kpi.employees_hint')}
        icon={<Users className="h-5 w-5" />}
        accent="accent"
      />
      <KpiCard
        label={t('dashboard.kpi.net_profit')}
        value={withUsd(finance.net_profit, finance.net_profit_usd)}
        hint={t('dashboard.kpi.net_profit_hint')}
        icon={<TrendingUp className="h-5 w-5" />}
        accent={finance.net_profit >= 0 ? 'success' : 'danger'}
      />
      <KpiCard
        label={t('dashboard.kpi.revenue')}
        value={withUsd(finance.total_revenue, finance.total_revenue_usd)}
        hint={t('dashboard.kpi.revenue_hint')}
        icon={<Banknote className="h-5 w-5" />}
        accent="success"
      />
      <KpiCard
        label={t('dashboard.kpi.contracts')}
        value={formatCurrency(finance.contract_value_total, 'IQD', lang)}
        hint={t('dashboard.kpi.contracts_hint')}
        icon={<FileSignature className="h-5 w-5" />}
        accent="primary"
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
