import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Truck,
  CheckCircle2,
  XCircle,
  Wrench,
  Plus,
  Search,
  FolderOpen,
  MapPin,
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  KpiCard,
  ChartCard,
  EmptyState,
  CHART_COLORS,
} from '../../../components/shared'
import { Spinner } from '../../../components/ui/Spinner'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useT, useLang } from '../../../context/LangContext'
import { useApi, useResource } from '../../../hooks/useResource'
import { formatNumber, pickName } from '../../../lib/format'
import { STATUS_COLOR } from '../fleetUtils'
import type { FleetSummary, FleetMapData, Vehicle } from '../../../types'
import { VehicleCard } from '../VehicleCard'
import { VehicleModule } from '../VehicleModule'
import { ToggleControl, TypeChips, type GroupMode } from '../FleetFilters'
import { AddVehicleDialog } from '../AddVehicleDialog'
import { LeafletMap } from '../LeafletMap'
import { FEATURES } from '../../../config/features'
import { MapComingSoon } from '../MapComingSoon'
import { registerStrings } from '../../../i18n/strings'

// Oil-change i18n keys used by VehicleCard (registered here so VehicleCard stays lean)
registerStrings({
  'fleet.oil.overdue': { ar: 'تجاوز موعد الزيت', en: 'Oil change overdue' },
  'fleet.oil.soon': { ar: 'قرب موعد الزيت', en: 'Oil change due soon' },
  'fleet.oil.ok': { ar: 'الزيت جيد', en: 'Oil OK' },
  'fleet.filter.all': { ar: 'الكل', en: 'All' },
  'fleet.filter.project': { ar: 'آليات مشاريع', en: 'Project vehicles' },
  'fleet.filter.company': { ar: 'آليات الشركة', en: 'Company-wide' },
  'fleet.veh.PRIVATE': { ar: 'خاصة', en: 'Private' },
  'fleet.veh.PUBLIC': { ar: 'عامة', en: 'Public' },
})

// ──────────────────────────────────────────────
// Tooltip components (ltr so numbers read left→right)
// ──────────────────────────────────────────────
function CountTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-card" dir="ltr">
      <p className="mb-0.5 font-semibold text-slate-700">{label ?? payload[0]?.name}</p>
      <p className="font-medium tabular-nums text-slate-600">
        {payload[0].value} {suffix}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────
// Main tab
// ──────────────────────────────────────────────
export function VehiclesTab() {
  const t = useT()
  const { lang } = useLang()

  const { data: summary, loading: loadingSum } = useApi<FleetSummary>('/fleet/summary')
  const { data: mapData, loading: loadingMap } = useApi<FleetMapData>('/fleet/map')
  const { data: vehicles, loading: loadingVehicles, refetch } = useResource<Vehicle>('vehicles')

  const [groupMode, setGroupMode] = useState<GroupMode>('by_type')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'PRIVATE' | 'PUBLIC'>('ALL')
  const [assignFilter, setAssignFilter] = useState<'ALL' | 'PROJECT' | 'COMPANY'>('ALL')
  const [addOpen, setAddOpen] = useState(false)

  // Vehicle selected from the list → drives the mini-map (fly/highlight) and the card ring.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openVehicle, setOpenVehicle] = useState<Vehicle | null>(null)
  const mapCardRef = useRef<HTMLDivElement | null>(null)

  // Bring the map into view when a vehicle is picked (skip the initial null state).
  useEffect(() => {
    if (selectedId === null) return
    mapCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selectedId])

  // ── derived data ──────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (q && !v.plate_number.toLowerCase().includes(q) &&
          !v.name_ar.toLowerCase().includes(q) &&
          !v.name_en.toLowerCase().includes(q) &&
          !v.driver_name.toLowerCase().includes(q)) return false
      // Ownership: private / public.
      if (ownerFilter !== 'ALL' && v.ownership !== ownerFilter) return false
      // Assignment: tied to a project vs a company-wide pool car (no project).
      if (assignFilter === 'PROJECT' && !v.project_id) return false
      if (assignFilter === 'COMPANY' && v.project_id) return false
      return true
    })
  }, [vehicles, search, ownerFilter, assignFilter])

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((v) => { map[v.vehicle_type] = (map[v.vehicle_type] ?? 0) + 1 })
    return map
  }, [filtered])

  const displayedVehicles = useMemo(() => {
    if (groupMode !== 'by_type') return filtered
    if (selectedType === 'ALL') return filtered
    return filtered.filter((v) => v.vehicle_type === selectedType)
  }, [filtered, groupMode, selectedType])

  // Groups for by_project mode: bucket by project_id
  const projectGroups = useMemo(() => {
    if (groupMode !== 'by_project') return []
    const map = new Map<string | null, Vehicle[]>()
    filtered.forEach((v) => {
      const key = v.project_id ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    })
    // Sort: null (unassigned) last
    const entries = [...map.entries()].sort(([a], [b]) => {
      if (a === null) return 1
      if (b === null) return -1
      return 0
    })
    return entries
  }, [filtered, groupMode])

  // Lookup project name from summary
  const projectNameMap = useMemo(() => {
    const m: Record<string, { name_ar: string; name_en: string }> = {}
    summary?.by_project.forEach((p) => {
      if (p.project_id) m[p.project_id] = { name_ar: p.name_ar, name_en: p.name_en }
    })
    return m
  }, [summary])

  // Chart data for status donut
  const statusChartData = useMemo(() => {
    return (summary?.by_status ?? []).filter((d) => d.count > 0)
  }, [summary])

  // Chart data for by_project bar
  const projectChartData = useMemo(() => {
    return (summary?.by_project ?? []).slice(0, 12)
  }, [summary])

  const loading = loadingSum || loadingVehicles

  // ── render ────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('fleet.kpi.total')}
          value={formatNumber(summary?.counts.total ?? 0, lang)}
          hint={t('fleet.kpi.total_hint')}
          icon={<Truck className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('fleet.kpi.active')}
          value={formatNumber(summary?.counts.active ?? 0, lang)}
          hint={t('fleet.kpi.active_hint')}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label={t('fleet.kpi.inactive')}
          value={formatNumber(summary?.counts.inactive ?? 0, lang)}
          hint={t('fleet.kpi.inactive_hint')}
          icon={<XCircle className="h-5 w-5" />}
          accent="danger"
        />
        <KpiCard
          label={t('fleet.kpi.maintenance')}
          value={formatNumber(summary?.counts.maintenance ?? 0, lang)}
          hint={t('fleet.kpi.maintenance_hint')}
          icon={<Wrench className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Status donut — 2 cols */}
        <div className="lg:col-span-2">
          <ChartCard
            title={t('fleet.chart.status')}
            subtitle={t('fleet.chart.status_sub')}
            icon={<PieIcon className="h-4 w-4" />}
            height={260}
          >
            {statusChartData.length ? (
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {statusChartData.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLOR[entry.status] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={(props) => (
                    <CountTooltip
                      {...props}
                      label={props.payload?.[0] ? t(`status.${props.payload[0].name}`) : ''}
                      suffix={t('fleet.kpi.total')}
                    />
                  )}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) => t(`status.${value}`)}
                />
              </PieChart>
            ) : (
              <div className="flex h-full items-center justify-center">
                <EmptyState />
              </div>
            )}
          </ChartCard>
        </div>

        {/* By-project bar — 3 cols */}
        <div className="lg:col-span-3">
          <ChartCard
            title={t('fleet.chart.by_project')}
            subtitle={t('fleet.chart.by_project_sub')}
            icon={<BarChart3 className="h-4 w-4" />}
            height={260}
          >
            {projectChartData.length ? (
              <BarChart
                data={projectChartData.map((p) => ({
                  name: lang === 'ar' ? p.name_ar : p.name_en,
                  count: p.count,
                }))}
                margin={{ top: 8, right: 12, left: 4, bottom: 32 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(26,95,122,0.06)' }}
                  content={(props) => (
                    <CountTooltip {...props} suffix={t('fleet.inventory.count')} />
                  )}
                />
                <Bar dataKey="count" name={t('fleet.inventory.count')} radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {projectChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="flex h-full items-center justify-center">
                <EmptyState />
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* ── Mini-map card ── */}
      {FEATURES.fleetMap ? (
      <div ref={mapCardRef} className="card overflow-hidden">

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-semibold text-slate-700">{t('fleet.map.overview')}</span>
          </div>
          <span className="text-xs text-slate-400">{t('fleet.map.full')}</span>
        </div>
        <div className="p-0">
          {loadingMap ? (
            <div className="flex h-[600px] items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <LeafletMap
              data={mapData}
              height={600}
              compact
              selectedVehicleId={selectedId}
              onVehicleOpen={(id) => { const v = vehicles.find((x) => x.id === id); if (v) setOpenVehicle(v) }}
            />
          )}
        </div>
      </div>
      ) : (
        <MapComingSoon minHeight={240} />
      )}

      {/* ── Inventory section header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800">{t('fleet.inventory.title')}</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
            {formatNumber(filtered.length, lang)} {t('fleet.inventory.count')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('fleet.search')}
              className="ps-8 text-sm"
            />
          </div>

          {/* Add button */}
          <Button
            onClick={() => setAddOpen(true)}
            size="sm"
          >
            <Plus className="me-1 h-4 w-4" />
            {t('fleet.add')}
          </Button>
        </div>
      </div>

      {/* ── Category filters: ownership (private/public) + assignment ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['ALL', 'PRIVATE', 'PUBLIC'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setOwnerFilter(k)}
              className={'rounded-md px-3 py-1 text-xs font-medium transition ' + (ownerFilter === k ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              {k === 'ALL' ? t('fleet.filter.all') : t(`fleet.veh.${k}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['ALL', 'PROJECT', 'COMPANY'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAssignFilter(k)}
              className={'rounded-md px-3 py-1 text-xs font-medium transition ' + (assignFilter === k ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              {k === 'ALL' ? t('fleet.filter.all') : k === 'PROJECT' ? t('fleet.filter.project') : t('fleet.filter.company')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Group toggle ── */}
      <ToggleControl value={groupMode} onChange={(m) => { setGroupMode(m); setSelectedType('ALL') }} />

      {/* ── Type chips (by_type mode only) ── */}
      {groupMode === 'by_type' && (
        <TypeChips counts={typeCounts} selected={selectedType} onSelect={setSelectedType} />
      )}

      {/* ── Vehicle grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : displayedVehicles.length === 0 && groupMode === 'by_type' ? (
        <EmptyState
          title={t('fleet.empty')}
          hint={t('fleet.empty_hint')}
          action={
            <Button onClick={() => setAddOpen(true)} size="sm">
              <Plus className="me-1 h-4 w-4" />
              {t('fleet.add')}
            </Button>
          }
        />
      ) : groupMode === 'by_type' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayedVehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              selected={v.id === selectedId}
              onSelect={() => setSelectedId(v.id)}
              onOpen={() => setOpenVehicle(v)}
            />
          ))}
        </div>
      ) : (
        // by_project groups
        <div className="space-y-6">
          {projectGroups.length === 0 ? (
            <EmptyState title={t('fleet.empty')} hint={t('fleet.empty_hint')} />
          ) : (
            projectGroups.map(([projectId, groupVehicles]) => {
              const proj = projectId ? projectNameMap[projectId] : null
              const groupName = proj ? pickName(proj, lang) : t('fleet.card.no_project')
              return (
                <div key={projectId ?? '__unassigned__'}>
                  {/* Group heading */}
                  <div className="mb-3 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-slate-700">{groupName}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-500">
                      {formatNumber(groupVehicles.length, lang)}
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {groupVehicles.map((v) => (
                      <VehicleCard
                        key={v.id}
                        vehicle={v}
                        selected={v.id === selectedId}
                        onSelect={() => setSelectedId(v.id)}
                        onOpen={() => setOpenVehicle(v)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Add vehicle dialog ── */}
      <AddVehicleDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={refetch}
      />

      {/* ── Full editable vehicle module (opens on card click) ── */}
      {openVehicle && (
        <VehicleModule
          vehicle={openVehicle}
          onClose={() => setOpenVehicle(null)}
          onChanged={() => { refetch(); setOpenVehicle(null) }}
        />
      )}
    </div>
  )
}
