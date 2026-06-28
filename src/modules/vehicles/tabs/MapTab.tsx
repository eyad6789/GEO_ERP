// ============================================================================
// MapTab — Map & Tracking tab for the Fleet module.
// Fetches /fleet/map, shows KPI row, big Leaflet map, legend, and a
// optional vehicles-by-project bar chart.
// ============================================================================
import { MapPin, Activity, Layers, Truck } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useApi } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { useCompany } from '../../../context/CompanyContext'
import { Spinner, useToast } from '../../../components/ui'
import { KpiCard } from '../../../components/shared/KpiCard'
import { Card, CardHeader } from '../../../components/ui/Card'
import { LeafletMap } from '../LeafletMap'
import { STATUS_COLOR, canEditFleet } from '../fleetUtils'
import { apiPut } from '../../../lib/api'
import type { FleetMapData } from '../../../types'
import { registerStrings } from '../../../i18n/strings'

// Extra i18n keys not in the shared strings.ts (MapTab-specific label/hint)
registerStrings({
  'fleet.map.vehicles_total': { ar: 'إجمالي الآليات على الخريطة', en: 'Total Vehicles on Map' },
  'fleet.map.kpi_onsite_hint': { ar: 'مخصصة لمشاريع نشطة', en: 'Assigned to active projects' },
  'fleet.map.kpi_active_hint': { ar: 'مشاريع قيد التنفيذ', en: 'Projects currently running' },
  'fleet.map.kpi_masterplan_hint': { ar: 'مشاريع في مرحلة التخطيط', en: 'Projects in planning phase' },
  'fleet.map.kpi_total_hint': { ar: 'آليات لها إحداثيات جغرافية', en: 'Vehicles with GPS coordinates' },
  'fleet.map.by_project_chart': { ar: 'الآليات حسب المشروع', en: 'Vehicles by Project' },
  'fleet.map.by_project_chart_sub': { ar: 'توزيع الآليات على المواقع', en: 'Vehicle distribution across sites' },
  'fleet.map.legend.title': { ar: 'دليل الخريطة', en: 'Map Legend' },
  'fleet.map.legend.hq': { ar: 'المقر الرئيسي', en: 'Headquarters' },
  'fleet.map.no_data': { ar: 'لا توجد بيانات خريطة', en: 'No map data available' },
  'fleet.map.drag_hint': { ar: 'اسحب أي آلية على الخريطة لتغيير موقعها', en: 'Drag any vehicle on the map to relocate it' },
  'fleet.map.moved': { ar: 'تم تحديث موقع الآلية', en: 'Vehicle location updated' },
})

// Legend colours
const PROJECT_KIND_COLOR: Record<string, string> = {
  ACTIVE: '#1a5f7a',
  MASTERPLAN: '#e8a838',
  BASE: '#475569',
}

export function MapTab() {
  const t = useT()
  const { lang } = useLang()
  const { role } = useCompany()
  const toast = useToast()
  const canEdit = canEditFleet(role.key)
  const { data, loading, refetch } = useApi<FleetMapData>('/fleet/map')

  // Fleet Manager: persist a dragged vehicle's new position. We update the local
  // map data in place (so the count/markers stay correct) without a full reload.
  const onVehicleMove = async (id: string, lat: number, lng: number) => {
    try {
      await apiPut(`/vehicles/${id}`, { lat, lng })
      toast.success(t('fleet.map.moved'))
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
      refetch() // on failure, reload to snap the marker back to the saved position
    }
  }

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const vehicles = data?.vehicles ?? []
  const projects = data?.projects ?? []

  const onSiteCount = vehicles.filter((v) => v.project_id != null).length
  const activeProjectCount = projects.filter((p) => p.kind === 'ACTIVE').length
  const masterplanCount = projects.filter((p) => p.kind === 'MASTERPLAN').length
  const totalOnMap = vehicles.length

  // ── Bar chart data: vehicles per project (top 8, sorted desc) ────────────
  const byProject = projects
    .filter((p) => p.vehicle_count > 0)
    .sort((a, b) => b.vehicle_count - a.vehicle_count)
    .slice(0, 8)
    .map((p) => ({
      name: lang === 'ar' ? p.name_ar : p.name_en,
      count: p.vehicle_count,
    }))

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={t('fleet.map.onsite')}
          value={onSiteCount}
          icon={<Truck className="h-5 w-5" />}
          hint={t('fleet.map.kpi_onsite_hint')}
          accent="primary"
        />
        <KpiCard
          label={t('fleet.map.projects_active')}
          value={activeProjectCount}
          icon={<Activity className="h-5 w-5" />}
          hint={t('fleet.map.kpi_active_hint')}
          accent="success"
        />
        <KpiCard
          label={t('fleet.map.masterplans')}
          value={masterplanCount}
          icon={<Layers className="h-5 w-5" />}
          hint={t('fleet.map.kpi_masterplan_hint')}
          accent="accent"
        />
        <KpiCard
          label={t('fleet.map.vehicles_total')}
          value={totalOnMap}
          icon={<MapPin className="h-5 w-5" />}
          hint={t('fleet.map.kpi_total_hint')}
          accent="info"
        />
      </div>

      {/* ── Map Card ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={t('fleet.map.title')}
          icon={<MapPin className="h-4 w-4" />}
          action={
            /* Legend row */
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {/* Vehicle status dots */}
              {(['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                    style={{ background: STATUS_COLOR[s] }}
                  />
                  {t(`fleet.map.legend.${s.toLowerCase()}`)}
                </span>
              ))}
              <span className="mx-1 text-slate-200">|</span>
              {/* Project kind markers */}
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ background: PROJECT_KIND_COLOR.ACTIVE }}
                />
                {t('fleet.map.legend.site')}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ background: PROJECT_KIND_COLOR.MASTERPLAN }}
                />
                {t('fleet.map.legend.masterplan')}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ background: PROJECT_KIND_COLOR.BASE }}
                />
                {t('fleet.map.legend.hq')}
              </span>
            </div>
          }
        />

        {canEdit && (
          <div className="border-b border-slate-100 bg-primary/5 px-5 py-2 text-xs font-medium text-primary">
            {t('fleet.map.drag_hint')}
          </div>
        )}

        {/* Map container — direction:ltr so Leaflet tile layout is unaffected by RTL */}
        <div className="p-0" style={{ direction: 'ltr' }}>
          {data ? (
            <LeafletMap data={data} height={500} editable={canEdit} onVehicleMove={onVehicleMove} />
          ) : (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              {t('fleet.map.no_data')}
            </div>
          )}
        </div>
      </Card>

      {/* ── Vehicles by Project — bar chart (nice-to-have) ──────────────── */}
      {byProject.length > 0 && (
        <Card>
          <CardHeader
            title={t('fleet.map.by_project_chart')}
            subtitle={t('fleet.map.by_project_chart_sub')}
            icon={<Truck className="h-4 w-4" />}
          />
          <div className="p-4" style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byProject} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontFamily: 'Cairo,Inter,sans-serif', fontSize: 11, fill: '#64748b' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontFamily: 'Cairo,Inter,sans-serif', fontSize: 11, fill: '#64748b' }}
                  width={28}
                />
                <Tooltip
                  contentStyle={{ fontFamily: 'Cairo,Inter,sans-serif', fontSize: 12, borderRadius: 8 }}
                  formatter={(value: number) => [
                    value,
                    lang === 'ar' ? 'آلية' : 'vehicles',
                  ]}
                />
                <Bar dataKey="count" fill="#1a5f7a" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

    </div>
  )
}
