// ============================================================================
// MapTab — Map & Tracking tab for the Fleet module.
// Fetches /fleet/map, shows KPI row, big Leaflet map, legend, and a
// optional vehicles-by-project bar chart.
// ============================================================================
import { MapPin, Truck } from 'lucide-react'
import { useState } from 'react'
import { useApi, useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { useCompany } from '../../../context/CompanyContext'
import { Spinner, useToast } from '../../../components/ui'
import { KpiCard } from '../../../components/shared/KpiCard'
import { Card, CardHeader } from '../../../components/ui/Card'
import { LeafletMap } from '../LeafletMap'
import { VehicleModule } from '../VehicleModule'
import { STATUS_COLOR, canEditFleet } from '../fleetUtils'
import { apiPut } from '../../../lib/api'
import type { FleetMapData, Vehicle } from '../../../types'
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
  // Full vehicle records (the map data is a lightweight subset) — needed so the
  // popup's "see more" can open the complete module.
  const { data: fullVehicles, refetch: refetchVehicles } = useResource<Vehicle>('vehicles')
  const [openVehicle, setOpenVehicle] = useState<Vehicle | null>(null)
  const onVehicleOpen = (id: string) => {
    const v = fullVehicles.find((x) => x.id === id)
    if (v) setOpenVehicle(v)
  }

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
  const totalOnMap = vehicles.length

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <KpiCard
          label={t('fleet.map.onsite')}
          value={onSiteCount}
          icon={<Truck className="h-5 w-5" />}
          hint={t('fleet.map.kpi_onsite_hint')}
          accent="primary"
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
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
          <div className="border-b border-slate-100 dark:border-slate-700/70 bg-primary/5 px-5 py-2 text-xs font-medium text-primary">
            {t('fleet.map.drag_hint')}
          </div>
        )}

        {/* Map container — direction:ltr so Leaflet tile layout is unaffected by RTL */}
        <div className="p-0" style={{ direction: 'ltr' }}>
          {data ? (
            <LeafletMap data={data} height={500} editable={canEdit} onVehicleMove={onVehicleMove} onVehicleOpen={onVehicleOpen} />
          ) : (
            <div className="flex items-center justify-center py-20 text-slate-400 dark:text-slate-400 text-sm">
              {t('fleet.map.no_data')}
            </div>
          )}
        </div>
      </Card>

      {/* "See more" from a map popup → the full vehicle module. */}
      {openVehicle && (
        <VehicleModule
          vehicle={openVehicle}
          onClose={() => setOpenVehicle(null)}
          onChanged={() => { refetchVehicles(); refetch(); setOpenVehicle(null) }}
        />
      )}
    </div>
  )
}
