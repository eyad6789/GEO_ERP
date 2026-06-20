// ============================================================================
// AccountingTab — read-only finance preview for the Fleet module.
// IQD and USD are NEVER summed or combined — always separate series/columns.
// All financial data comes from GET /fleet/costs (FleetCosts shape).
// Editing happens exclusively in the Accounting module.
// ============================================================================
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts'
import {
  Lock,
  DollarSign,
  Wrench,
  Fuel,
  BarChart3,
  TrendingUp,
  FolderOpen,
} from 'lucide-react'
import { useT, useLang } from '../../../context/LangContext'
import { useApi } from '../../../hooks/useResource'
import {
  KpiCard,
  ChartCard,
  CHART_COLORS,
  ArabicTable,
  EmptyState,
} from '../../../components/shared'
import type { Column } from '../../../components/shared'
import { LoadingState } from '../../../components/ui/Spinner'
import { formatCurrency, formatCompact, pickName } from '../../../lib/format'
import type { FleetCosts, VehicleCostCategory } from '../../../types'
import type { Lang } from '../../../i18n/strings'

// ---- Chart tooltip helpers -------------------------------------------------
const AXIS_STYLE = { fontSize: 11, fill: '#64748b' }

function DualCurrencyTooltip({ active, payload, label, lang }: {
  active?: boolean; payload?: any[]; label?: string; lang: Lang
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-card" dir="ltr">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-slate-600">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-medium tabular-nums">
            {formatCompact(p.value, lang)} {p.dataKey === 'iqd' ? 'IQD' : 'USD'}
          </span>
        </p>
      ))}
    </div>
  )
}

// ---- Category i18n map -----------------------------------------------------
const CAT_KEYS: Record<string, string> = {
  PURCHASE: 'fleet.acc.cat.PURCHASE',
  MAINTENANCE: 'fleet.acc.cat.MAINTENANCE',
  FUEL: 'fleet.acc.cat.FUEL',
  PARTS: 'fleet.acc.cat.PARTS',
}

// ---- Main component --------------------------------------------------------
export function AccountingTab() {
  const t = useT()
  const { lang } = useLang()
  const l = lang as Lang

  const { data: costs, loading } = useApi<FleetCosts>('/fleet/costs')

  // ---- Derived KPIs --------------------------------------------------------
  const totals = costs?.totals ?? { iqd: 0, usd: 0 }

  const maintenanceIqd = costs?.by_category.find(
    (c) => c.category === 'MAINTENANCE',
  )?.iqd ?? 0
  const fuelIqd = costs?.by_category.find(
    (c) => c.category === 'FUEL',
  )?.iqd ?? 0

  // ---- Category table rows -------------------------------------------------
  type CatRow = { category: VehicleCostCategory; iqd: number; usd: number }
  const catColumns: Column<CatRow>[] = [
    {
      key: 'category',
      header: t('fleet.acc.category'),
      accessor: (r) => t(CAT_KEYS[r.category] ?? r.category),
      render: (r) => (
        <span className="font-medium text-slate-700">
          {t(CAT_KEYS[r.category] ?? r.category)}
        </span>
      ),
    },
    {
      key: 'iqd',
      header: t('fleet.acc.iqd'),
      align: 'end',
      accessor: (r) => r.iqd,
      render: (r) => (
        <span className="tabular-nums text-slate-700">
          {formatCurrency(r.iqd, 'IQD', l)}
        </span>
      ),
    },
    {
      key: 'usd',
      header: t('fleet.acc.usd'),
      align: 'end',
      accessor: (r) => r.usd,
      render: (r) => (
        <span className="tabular-nums font-medium text-emerald-700">
          {formatCurrency(r.usd, 'USD', l)}
        </span>
      ),
    },
  ]

  // ---- By-project table rows -----------------------------------------------
  type ProjRow = { project_id: string | null; name_ar: string; iqd: number; usd: number; vehicles: number }
  const projColumns: Column<ProjRow>[] = [
    {
      key: 'project',
      header: t('fleet.field.project'),
      accessor: (r) =>
        lang === 'en'
          ? r.name_ar || t('fleet.card.no_project')
          : r.name_ar || t('fleet.card.no_project'),
      render: (r) => (
        <span className="font-medium text-slate-700">
          {r.name_ar || t('fleet.card.no_project')}
        </span>
      ),
    },
    {
      key: 'vehicles',
      header: t('fleet.kpi.total'),
      align: 'center',
      accessor: (r) => r.vehicles,
      render: (r) => (
        <span className="tabular-nums text-slate-500">{r.vehicles}</span>
      ),
    },
    {
      key: 'iqd',
      header: t('fleet.acc.iqd'),
      align: 'end',
      accessor: (r) => r.iqd,
      render: (r) => (
        <span className="tabular-nums text-slate-700">
          {formatCurrency(r.iqd, 'IQD', l)}
        </span>
      ),
    },
    {
      key: 'usd',
      header: t('fleet.acc.usd'),
      align: 'end',
      accessor: (r) => r.usd,
      render: (r) => (
        <span className="tabular-nums font-medium text-emerald-700">
          {formatCurrency(r.usd, 'USD', l)}
        </span>
      ),
    },
  ]

  // ---- By-type chart data (bar chart; IQD & USD separate bars) -------------
  const byTypeData = (costs?.by_type ?? []).map((row) => ({
    name: lang === 'en' ? row.name_en : t(`fleet.type.${row.vehicle_type}` as any) || row.name_en,
    iqd: row.iqd,
    usd: row.usd,
  }))

  // ---- By-project chart data (horizontal bar; IQD series only for clarity) -
  const byProjData = (costs?.by_project ?? []).slice(0, 10).map((row) => ({
    name: row.name_ar || t('fleet.card.no_project'),
    iqd: row.iqd,
    usd: row.usd,
  }))

  // ---- Monthly trend (line/area; IQD + USD separate lines) ----------------
  const monthlyData = costs?.by_month ?? []

  // ---- Empty guard ---------------------------------------------------------
  const hasData = costs !== null && (totals.iqd > 0 || totals.usd > 0)

  if (loading) {
    return (
      <div className="py-16">
        <LoadingState label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ---- Read-only banner ------------------------------------------------ */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-800">{t('fleet.acc.readonly')}</p>
      </div>

      {!hasData ? (
        <EmptyState
          title={t('fleet.empty')}
          hint={t('fleet.empty_hint')}
          icon={<DollarSign className="h-7 w-7" />}
        />
      ) : (
        <>
          {/* ---- KPI row ----------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label={t('fleet.acc.total_iqd')}
              value={formatCompact(totals.iqd, l)}
              hint={formatCurrency(totals.iqd, 'IQD', l)}
              icon={<DollarSign className="h-5 w-5" />}
              accent="primary"
            />
            <KpiCard
              label={t('fleet.acc.total_usd')}
              value={formatCompact(totals.usd, l)}
              hint={formatCurrency(totals.usd, 'USD', l)}
              icon={<DollarSign className="h-5 w-5" />}
              accent="success"
            />
            <KpiCard
              label={t('fleet.acc.maintenance')}
              value={formatCompact(maintenanceIqd, l)}
              hint={formatCurrency(maintenanceIqd, 'IQD', l)}
              icon={<Wrench className="h-5 w-5" />}
              accent="warning"
            />
            <KpiCard
              label={t('fleet.acc.fuel')}
              value={formatCompact(fuelIqd, l)}
              hint={formatCurrency(fuelIqd, 'IQD', l)}
              icon={<Fuel className="h-5 w-5" />}
              accent="accent"
            />
          </div>

          {/* ---- Charts row: by-type + by-project ----------------------------- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Cost by Vehicle Type — grouped bar (IQD & USD separate bars) */}
            <ChartCard
              title={t('fleet.acc.by_type')}
              subtitle={t('fleet.acc.iqd') + ' / ' + t('fleet.acc.usd')}
              icon={<BarChart3 className="h-4 w-4" />}
              height={320}
            >
              {byTypeData.length ? (
                <BarChart
                  data={byTypeData}
                  margin={{ top: 8, right: 16, left: 4, bottom: 60 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ ...AXIS_STYLE, textAnchor: 'end' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    angle={-35}
                    interval={0}
                  />
                  <YAxis
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(v) => formatCompact(v, l)}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(26,95,122,0.06)' }}
                    content={(props) => (
                      <DualCurrencyTooltip {...(props as any)} lang={l} />
                    )}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    dataKey="iqd"
                    name={t('fleet.acc.iqd')}
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="usd"
                    name={t('fleet.acc.usd')}
                    fill={CHART_COLORS[2]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            {/* Cost per Project — horizontal bar (IQD + USD separate bars) */}
            <ChartCard
              title={t('fleet.acc.by_project')}
              subtitle={t('fleet.acc.iqd') + ' / ' + t('fleet.acc.usd')}
              icon={<FolderOpen className="h-4 w-4" />}
              height={Math.max(260, byProjData.length * 52)}
            >
              {byProjData.length ? (
                <BarChart
                  data={byProjData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v, l)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={AXIS_STYLE}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    width={110}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(26,95,122,0.06)' }}
                    content={(props) => (
                      <DualCurrencyTooltip {...(props as any)} lang={l} />
                    )}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="iqd"
                    name={t('fleet.acc.iqd')}
                    fill={CHART_COLORS[0]}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="usd"
                    name={t('fleet.acc.usd')}
                    fill={CHART_COLORS[3]}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>

          {/* ---- Monthly Cost Trend — area chart (IQD + USD separate lines) --- */}
          <ChartCard
            title={t('fleet.acc.monthly')}
            subtitle={t('fleet.acc.iqd') + ' & ' + t('fleet.acc.usd') + ' — ' + t('fleet.acc.readonly').split('—')[0].trim()}
            icon={<TrendingUp className="h-4 w-4" />}
            height={300}
          >
            {monthlyData.length ? (
              <AreaChart
                data={monthlyData}
                margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradIqd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradUsd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[3]} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={CHART_COLORS[3]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) => formatCompact(v, l)}
                />
                <Tooltip
                  cursor={{ stroke: '#1a5f7a', strokeWidth: 1, strokeDasharray: '4 2' }}
                  content={(props) => (
                    <DualCurrencyTooltip {...(props as any)} lang={l} />
                  )}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area
                  type="monotone"
                  dataKey="iqd"
                  name={t('fleet.acc.iqd')}
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fill="url(#gradIqd)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="usd"
                  name={t('fleet.acc.usd')}
                  stroke={CHART_COLORS[3]}
                  strokeWidth={2}
                  fill="url(#gradUsd)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {/* ---- Breakdown table: by category --------------------------------- */}
          <ArabicTable<CatRow>
            columns={catColumns}
            data={costs?.by_category ?? []}
            rowKey={(r) => r.category}
            searchable={false}
            pageSize={20}
            emptyTitle={t('fleet.empty')}
            emptyHint={t('fleet.empty_hint')}
          />

          {/* ---- Breakdown table: by project ---------------------------------- */}
          <ArabicTable<ProjRow>
            columns={projColumns}
            data={costs?.by_project ?? []}
            rowKey={(r, i) => r.project_id ?? String(i)}
            searchable={false}
            pageSize={15}
            emptyTitle={t('fleet.empty')}
            emptyHint={t('fleet.empty_hint')}
          />
        </>
      )}
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
