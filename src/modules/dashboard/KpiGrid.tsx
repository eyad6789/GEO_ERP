import { Building2, FolderKanban, Users, TrendingUp, Banknote, FileSignature } from 'lucide-react'
import { KpiCard } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatNumber } from '../../lib/format'
import type { DashboardData } from '../../types'

export function KpiGrid({ data }: { data: DashboardData }) {
  const t = useT()
  const { lang } = useLang()
  const { counts, finance } = data

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label={t('dashboard.kpi.companies')}
        value={formatNumber(counts.companies, lang)}
        hint={t('dashboard.kpi.companies_hint')}
        icon={<Building2 className="h-5 w-5" />}
        accent="primary"
      />
      <KpiCard
        label={t('dashboard.kpi.active_projects')}
        value={formatNumber(counts.active_projects, lang)}
        hint={`${t('dashboard.kpi.active_projects_hint')} ${formatNumber(counts.projects, lang)}`}
        icon={<FolderKanban className="h-5 w-5" />}
        accent="info"
      />
      <KpiCard
        label={t('dashboard.kpi.employees')}
        value={formatNumber(counts.employees, lang)}
        hint={t('dashboard.kpi.employees_hint')}
        icon={<Users className="h-5 w-5" />}
        accent="accent"
      />
      <KpiCard
        label={t('dashboard.kpi.net_profit')}
        value={formatCurrency(finance.net_profit, 'IQD', lang)}
        hint={t('dashboard.kpi.net_profit_hint')}
        icon={<TrendingUp className="h-5 w-5" />}
        accent={finance.net_profit >= 0 ? 'success' : 'danger'}
      />
      <KpiCard
        label={t('dashboard.kpi.revenue')}
        value={formatCurrency(finance.total_revenue, 'IQD', lang)}
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
    </div>
  )
}
