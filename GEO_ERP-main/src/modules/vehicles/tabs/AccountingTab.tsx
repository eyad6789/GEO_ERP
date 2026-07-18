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
import { useState, useMemo } from 'react'
import {
  DollarSign,
  Wrench,
  Fuel,
  BarChart3,
  TrendingUp,
  FolderOpen,
  Truck,
  Search,
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
import { Input } from '../../../components/ui/Input'
import { formatCurrency, formatCompact, pickName } from '../../../lib/format'
import type { FleetCosts, VehicleCostCategory } from '../../../types'
import { registerStrings, type Lang } from '../../../i18n/strings'
import { ToggleControl, TypeChips, type GroupMode } from '../FleetFilters'
import { FinanceVehicleCard } from '../FinanceVehicleCard'

// Per-vehicle cost table strings (colocated, mirroring MapTab/VehiclesTab pattern).
registerStrings({
  'fleet.acc.by_vehicle.title': { ar: 'التكاليف حسب الآلية', en: 'Costs by Vehicle' },
  'fleet.acc.by_vehicle.subtitle': { ar: 'إجمالي التكاليف والصيانة والوقود لكل آلية', en: 'Total, maintenance & fuel cost per vehicle' },
  'fleet.acc.col.vehicle': { ar: 'الآلية', en: 'Vehicle' },
  'fleet.acc.col.total_iqd': { ar: 'الإجمالي (د.ع)', en: 'Total (IQD)' },
  'fleet.acc.col.total_usd': { ar: 'الإجمالي ($)', en: 'Total (USD)' },
  'fleet.acc.col.maint_iqd': { ar: 'الصيانة (د.ع)', en: 'Maintenance (IQD)' },
  'fleet.acc.col.maint_usd': { ar: 'الصيانة ($)', en: 'Maintenance (USD)' },
  'fleet.acc.col.fuel_iqd': { ar: 'الوقود (د.ع)', en: 'Fuel (IQD)' },
  'fleet.acc.col.fuel_usd': { ar: 'الوقود ($)', en: 'Fuel (USD)' },
  'fleet.acc.search_vehicle': { ar: 'بحث عن آلية بالرقم أو الاسم...', en: 'Search by plate or name...' },
})

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

  // ---- Per-vehicle register: search + group toggle + type chips ------------
  // (mirrors the Vehicles-tab register structure on the finance data)
  const [vehSearch, setVehSearch] = useState('')
  const [groupMode, setGroupMode] = useState<GroupMode>('by_type')
  const [selectedType, setSelectedType] = useState<string>('ALL')

  const byVehicle = costs?.by_vehicle ?? []

  const vehFiltered = useMemo(() => {
    const q = vehSearch.trim().toLowerCase()
    if (!q) return byVehicle
    return byVehicle.filter((v) =>
      v.plate_number.toLowerCase().includes(q) ||
      v.name_ar.toLowerCase().includes(q) ||
      v.name_en.toLowerCase().includes(q) ||
      v.code.toLowerCase().includes(q),
    )
  }, [byVehicle, vehSearch])

  const vehTypeCounts = useMemo(() => {
    const m: Record<string, number> = {}
    vehFiltered.forEach((v) => { m[v.vehicle_type] = (m[v.vehicle_type] ?? 0) + 1 })
    return m
  }, [vehFiltered])

  const vehDisplayed = useMemo(() => {
    if (groupMode !== 'by_type' || selectedType === 'ALL') return vehFiltered
    return vehFiltered.filter((v) => v.vehicle_type === selectedType)
  }, [vehFiltered, groupMode, selectedType])

  const vehProjectGroups = useMemo(() => {
    if (groupMode !== 'by_project') return [] as Array<[string | null, FleetCosts['by_vehicle']]>
    const m = new Map<string | null, FleetCosts['by_vehicle']>()
    vehFiltered.forEach((v) => {
      const key = v.project_id ?? null
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(v)
    })
    return [...m.entries()].sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : 0))
  }, [vehFiltered, groupMode])

  const vehProjectName = useMemo(() => {
    const m: Record<string, string> = {}
    ;(costs?.by_project ?? []).forEach((p) => { if (p.project_id) m[p.project_id] = p.name_ar })
    return m
  }, [costs])

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

  if (loading) {
    return (
      <div className="py-16">
        <LoadingState label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
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

          {/* charts & empty breakdown tables removed — accounting starts at zero */}

          {/* ---- Per-vehicle register (search + group + chips + cards) -------- */}
          <div className="space-y-4 pt-2">
            {/* Section header + search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    {t('fleet.acc.by_vehicle.title')}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                      {formatCompact(vehFiltered.length, l)} {t('fleet.inventory.count')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{t('fleet.acc.by_vehicle.subtitle')}</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={vehSearch}
                  onChange={(e) => setVehSearch(e.target.value)}
                  placeholder={t('fleet.acc.search_vehicle')}
                  className="ps-8 text-sm"
                />
              </div>
            </div>

            {/* Group toggle */}
            <ToggleControl value={groupMode} onChange={(m) => { setGroupMode(m); setSelectedType('ALL') }} />

            {/* Type chips (by_type mode) */}
            {groupMode === 'by_type' && (
              <TypeChips counts={vehTypeCounts} selected={selectedType} onSelect={setSelectedType} />
            )}

            {/* Card grid */}
            {groupMode === 'by_type' ? (
              vehDisplayed.length === 0 ? (
                <EmptyState title={t('fleet.empty')} hint={t('fleet.empty_hint')} />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {vehDisplayed.map((v) => (
                    <FinanceVehicleCard key={v.id} vehicle={v} />
                  ))}
                </div>
              )
            ) : vehProjectGroups.length === 0 ? (
              <EmptyState title={t('fleet.empty')} hint={t('fleet.empty_hint')} />
            ) : (
              <div className="space-y-6">
                {vehProjectGroups.map(([projectId, groupVehicles]) => {
                  const groupName = projectId ? (vehProjectName[projectId] ?? t('fleet.card.no_project')) : t('fleet.card.no_project')
                  return (
                    <div key={projectId ?? '__unassigned__'}>
                      <div className="mb-3 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-accent" />
                        <h4 className="text-sm font-semibold text-slate-700">{groupName}</h4>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
                          {formatCompact(groupVehicles.length, l)}
                        </span>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {groupVehicles.map((v) => (
                          <FinanceVehicleCard key={v.id} vehicle={v} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
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
