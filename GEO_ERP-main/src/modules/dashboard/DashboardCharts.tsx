import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { BarChart3, PieChart as PieIcon, Users } from 'lucide-react'
import { ChartCard, CHART_COLORS, STATUS_CHART_COLORS, EmptyState } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatCompact, formatNumber } from '../../lib/format'
import type { DashboardData } from '../../types'
import type { Lang as I18nLang } from '../../i18n/strings'

const AXIS = { fontSize: 12, fill: '#64748b' }

// ---- Tooltips --------------------------------------------------------------
function CurrencyTooltip({ active, payload, label, lang }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-card" dir="ltr">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium tabular-nums">{formatCurrency(p.value, 'IQD', lang as I18nLang)}</span>
        </p>
      ))}
    </div>
  )
}

function CountTooltip({ active, payload, label, lang, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-card" dir="ltr">
      <p className="mb-0.5 font-semibold text-slate-700">{label ?? payload[0]?.name}</p>
      <p className="font-medium tabular-nums text-slate-600">
        {formatNumber(payload[0].value, lang as I18nLang)} {suffix}
      </p>
    </div>
  )
}

// ---- Charts ----------------------------------------------------------------
export function DashboardCharts({ data }: { data: DashboardData }) {
  const t = useT()
  const { lang } = useLang()
  const l = lang as I18nLang

  const revenueData = data.revenue_expense_by_month ?? []
  const statusData = (data.projects_by_status ?? []).filter((d) => d.count > 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Revenue vs Expense — spans 2 cols on large screens */}
      <div className="lg:col-span-2">
        <ChartCard
          title={t('dashboard.chart.revenue_expense')}
          subtitle={t('dashboard.chart.revenue_expense_sub')}
          icon={<BarChart3 className="h-4 w-4" />}
          height={320}
        >
          {revenueData.length ? (
            <BarChart data={revenueData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis
                tick={AXIS}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) => formatCompact(v, l)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(26,95,122,0.06)' }}
                content={(props) => <CurrencyTooltip {...props} lang={lang} />}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar
                dataKey="revenue"
                name={t('dashboard.chart.revenue')}
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expense"
                name={t('dashboard.chart.expense')}
                fill={CHART_COLORS[1]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      {/* Projects by status — Pie */}
      <ChartCard
        title={t('dashboard.chart.projects_by_status')}
        subtitle={t('dashboard.chart.projects_by_status_sub')}
        icon={<PieIcon className="h-4 w-4" />}
        height={320}
      >
        {statusData.length ? (
          <PieChart>
            <Pie
              data={statusData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {statusData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip
              content={(props) => (
                <CountTooltip
                  {...props}
                  label={props.payload?.[0] ? t(`status.${props.payload[0].name}`) : ''}
                  lang={lang}
                  suffix={t('dashboard.chart.projects')}
                />
              )}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value: string) => t(`status.${value}`)}
            />
          </PieChart>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState />
    </div>
  )
}
