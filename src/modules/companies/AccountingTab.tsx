import { TrendingUp, TrendingDown, Wallet, Landmark, CreditCard, Scale, BarChart3, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useApi } from '../../hooks/useResource'
import { useChartTheme } from '../../hooks/useChartTheme'
import { useT, useLang } from '../../context/LangContext'
import { KpiCard, ChartCard, CHART_COLORS } from '../../components/shared'
import { Spinner } from '../../components/ui'
import { formatCurrency, formatCompact } from '../../lib/format'

interface CompanyPnl {
  revenue: number
  expense: number
  net: number
}

interface BalanceSheet {
  net_profit: number
  total_assets: number
  total_liabilities: number
  total_equity: number
  balanced: boolean
}

export function AccountingTab({ companyId }: { companyId: string }) {
  const t = useT()
  const { lang } = useLang()
  const ct = useChartTheme()

  const { data: pnl, loading: pnlLoading } = useApi<CompanyPnl>('/reports/company-pnl', { company_id: companyId })
  const { data: bs, loading: bsLoading } = useApi<BalanceSheet>('/reports/balance-sheet', { company_id: companyId })

  if (pnlLoading || bsLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const revenue = pnl?.revenue ?? 0
  const expense = pnl?.expense ?? 0
  const net = pnl?.net ?? revenue - expense
  const margin = revenue > 0 ? Math.round((net / revenue) * 100) : undefined

  const pnlData = [
    { name: t('companies.acc.revenue'), value: revenue, color: CHART_COLORS[3] },
    { name: t('companies.acc.expense'), value: expense, color: CHART_COLORS[4] },
    { name: t('companies.acc.net'), value: net, color: net >= 0 ? CHART_COLORS[0] : CHART_COLORS[4] },
  ]

  const balanceData = [
    { name: t('companies.acc.assets'), value: bs?.total_assets ?? 0, color: CHART_COLORS[0] },
    { name: t('companies.acc.liabilities'), value: bs?.total_liabilities ?? 0, color: CHART_COLORS[1] },
    { name: t('companies.acc.equity'), value: bs?.total_equity ?? 0, color: CHART_COLORS[2] },
  ]

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label={t('companies.acc.revenue')}
          value={formatCurrency(revenue, 'IQD', lang)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label={t('companies.acc.expense')}
          value={formatCurrency(expense, 'IQD', lang)}
          icon={<TrendingDown className="h-5 w-5" />}
          accent="danger"
        />
        <KpiCard
          label={t('companies.acc.net')}
          value={formatCurrency(net, 'IQD', lang)}
          icon={<Wallet className="h-5 w-5" />}
          accent={net >= 0 ? 'primary' : 'danger'}
          hint={margin !== undefined ? `${t('companies.proj.progress')}: ${margin}%` : undefined}
          trend={margin}
        />
        <KpiCard
          label={t('companies.acc.assets')}
          value={formatCurrency(bs?.total_assets ?? 0, 'IQD', lang)}
          icon={<Landmark className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('companies.acc.liabilities')}
          value={formatCurrency(bs?.total_liabilities ?? 0, 'IQD', lang)}
          icon={<CreditCard className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label={t('companies.acc.equity')}
          value={formatCurrency(bs?.total_equity ?? 0, 'IQD', lang)}
          icon={<Scale className="h-5 w-5" />}
          accent="accent"
        />
      </div>

      {/* Balanced banner */}
      <div
        className={
          'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ring-1 ' +
          (bs?.balanced
            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30'
            : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30')
        }
      >
        {bs?.balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {bs?.balanced ? t('companies.acc.balanced') : t('companies.acc.unbalanced')}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title={t('companies.acc.overview')} icon={<BarChart3 className="h-4 w-4" />} height={280}>
          <BarChart data={pnlData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={ct.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: ct.axis }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCompact(Number(v), lang)} tick={{ fontSize: 11, fill: ct.axis }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              formatter={(v) => formatCurrency(Number(v), 'IQD', lang)}
              contentStyle={{ borderRadius: 12, border: `1px solid ${ct.tooltipBorder}`, fontSize: 13 }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={70}>
              {pnlData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title={t('companies.acc.composition')} icon={<Scale className="h-4 w-4" />} height={280}>
          <BarChart data={balanceData} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={ct.grid} />
            <XAxis type="number" tickFormatter={(v) => formatCompact(Number(v), lang)} tick={{ fontSize: 11, fill: ct.axis }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: ct.axis }} axisLine={false} tickLine={false} width={90} />
            <Tooltip
              formatter={(v) => formatCurrency(Number(v), 'IQD', lang)}
              contentStyle={{ borderRadius: 12, border: `1px solid ${ct.tooltipBorder}`, fontSize: 13 }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={36}>
              {balanceData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>
      </div>
    </div>
  )
}
