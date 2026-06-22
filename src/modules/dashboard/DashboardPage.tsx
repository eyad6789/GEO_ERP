import { AlertTriangle } from 'lucide-react'
import { useApi } from '../../hooks/useResource'
import { LoadingState } from '../../components/ui'
import { useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import type { DashboardData } from '../../types'
import { HeroHeader } from './HeroHeader'
import { KpiGrid } from './KpiGrid'
import { AlertsRow } from './AlertsRow'
import { DashboardCharts } from './DashboardCharts'
import { ActivityFeed } from './ActivityFeed'

export function DashboardPage() {
  const t = useT()
  const { companyId } = useCompany()
  // Dashboard follows the top-bar company filter (empty = whole group).
  const { data, loading, error } = useApi<DashboardData>('/dashboard', companyId ? { company_id: companyId } : undefined)

  if (loading) {
    return (
      <div className="py-10">
        <LoadingState label={t('dashboard.loading')} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <HeroHeader />
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <p className="font-semibold text-slate-600">{t('dashboard.error')}</p>
          {error && <p className="text-sm text-slate-400">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <HeroHeader />
      <KpiGrid data={data} />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {t('dashboard.alerts.title')}
        </h2>
        <AlertsRow alerts={data.alerts} />
      </section>

      <DashboardCharts data={data} />

      <ActivityFeed logs={data.recent_logs} />
    </div>
  )
}
