import { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, User, Calendar, Gauge, Building2, Truck } from 'lucide-react'
import { StatusBadge } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, formatNumber, pickName } from '../../lib/format'
import { regState, REG_CHIP, REG_LABEL_KEY, TYPE_ICON } from './fleetUtils'
import type { Vehicle } from '../../types'

// ---------------------------------------------------------------------------
// VehicleCard — expandable vehicle card in the house design system.
// ---------------------------------------------------------------------------

function DetailRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value || value === '—') return null
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="min-w-0 shrink-0 text-xs text-slate-400">{label}</span>
      <span className={`text-end text-xs font-medium text-slate-700 ${mono ? 'tabular-nums' : ''}`}>{value}</span>
    </div>
  )
}

export function VehicleCard({
  vehicle,
  selected = false,
  onSelect,
}: {
  vehicle: Vehicle
  selected?: boolean
  onSelect?: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const [expanded, setExpanded] = useState(false)

  // One tap both locates the vehicle on the map and toggles the detail panel.
  const handleActivate = () => {
    onSelect?.()
    setExpanded((p) => !p)
  }

  const rs = regState(vehicle.registration_expiry)
  const TypeIcon = TYPE_ICON[vehicle.vehicle_type] ?? Truck
  const displayName = pickName(vehicle, lang)

  // Oil-change freshness hint
  const oilState = (() => {
    if (!vehicle.oil_change_date) return 'none'
    const d = new Date(vehicle.oil_change_date)
    if (Number.isNaN(d.getTime())) return 'none'
    const days = Math.floor((new Date().getTime() - d.getTime()) / 86400000)
    if (days > 180) return 'overdue'
    if (days > 90) return 'soon'
    return 'ok'
  })()

  const OIL_CHIP: Record<string, string> = {
    overdue: 'bg-danger/10 text-danger',
    soon: 'bg-warning/10 text-warning',
    ok: 'bg-success/10 text-success',
    none: 'bg-slate-100 text-slate-500',
  }
  const OIL_LABEL: Record<string, string> = {
    overdue: t('fleet.oil.overdue'),
    soon: t('fleet.oil.soon'),
    ok: t('fleet.oil.ok'),
    none: '—',
  }

  return (
    <div
      className={`card group cursor-pointer transition-all duration-200 hover:shadow-card-hover ${expanded ? 'shadow-card-hover' : ''} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleActivate()
        }
      }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Type icon badge */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <TypeIcon className="h-5 w-5" />
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold tracking-wide text-slate-800 tabular-nums" dir="ltr">
              {vehicle.plate_number}
            </span>
            {vehicle.model_year && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs tabular-nums text-slate-500">
                {vehicle.model_year}
              </span>
            )}
            <StatusBadge status={vehicle.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{displayName}</p>
        </div>

        {/* Chevron */}
        <div className="mt-0.5 shrink-0 text-slate-300 transition-transform duration-200 group-hover:text-slate-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* ── Summary row (always visible) ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-2.5">
        {/* Registration chip */}
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REG_CHIP[rs]}`}>
          {t(REG_LABEL_KEY[rs])}
          {vehicle.registration_expiry && rs !== 'none' && (
            <span className="ms-1 tabular-nums opacity-70">{formatDate(vehicle.registration_expiry, lang)}</span>
          )}
        </span>

        {/* Location */}
        {vehicle.location && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            {vehicle.location}
          </span>
        )}

        {/* Driver */}
        {vehicle.driver_name && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <User className="h-3 w-3 shrink-0 text-slate-400" />
            {vehicle.driver_name}
          </span>
        )}
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div
          className="border-t border-slate-100 px-4 pb-4 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
            {/* Left column */}
            <div className="divide-y divide-slate-50">
              <DetailRow label={t('fleet.field.type')} value={t(`fleet.type.${vehicle.vehicle_type}`)} />
              <DetailRow label={t('fleet.field.owner')} value={vehicle.owner_name} />
              <DetailRow label={t('fleet.field.driver')} value={vehicle.driver_name} />
              <DetailRow label={t('fleet.field.location')} value={vehicle.location} />
              <DetailRow label={t('fleet.field.project')} value={vehicle.project_id ? undefined : t('fleet.card.no_project')} />
            </div>

            {/* Right column */}
            <div className="divide-y divide-slate-50">
              <DetailRow label={t('fleet.field.model_year')} value={vehicle.model_year?.toString()} mono />
              <DetailRow label={t('fleet.field.odometer')} value={vehicle.last_odometer !== null && vehicle.last_odometer !== undefined ? formatNumber(vehicle.last_odometer, lang) + ' km' : undefined} mono />
              <DetailRow label={t('fleet.field.registration_expiry')} value={formatDate(vehicle.registration_expiry, lang)} mono />

              {/* Oil change row with its own freshness chip */}
              {vehicle.oil_change_date && (
                <div className="flex items-start justify-between gap-2 py-1">
                  <span className="text-xs text-slate-400">{t('fleet.field.oil_change')}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium tabular-nums text-slate-700">
                      {formatDate(vehicle.oil_change_date, lang)}
                    </span>
                    {oilState !== 'none' && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${OIL_CHIP[oilState]}`}>
                        {OIL_LABEL[oilState]}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <DetailRow label={t('fleet.field.company')} value={vehicle.company_id} />
            </div>
          </div>

          {/* Finance note */}
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            <Calendar className="me-1 inline h-3.5 w-3.5" />
            {t('fleet.acc.readonly')}
          </div>
        </div>
      )}
    </div>
  )
}
