import { MapPin, User, Truck, ChevronLeft } from 'lucide-react'
import { StatusBadge } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, pickName } from '../../lib/format'
import { regState, REG_CHIP, REG_LABEL_KEY, TYPE_ICON } from './fleetUtils'
import type { Vehicle } from '../../types'

// ---------------------------------------------------------------------------
// VehicleCard — compact vehicle card. Clicking it selects the car on the map
// AND opens the full editable VehicleModule (no inline dropdown anymore).
// ---------------------------------------------------------------------------

export function VehicleCard({
  vehicle,
  selected = false,
  onSelect,
  onOpen,
}: {
  vehicle: Vehicle
  selected?: boolean
  onSelect?: () => void
  onOpen?: () => void
}) {
  const t = useT()
  const { lang } = useLang()

  // One tap locates the vehicle on the map and opens its detail module.
  const handleActivate = () => {
    onSelect?.()
    onOpen?.()
  }

  const rs = regState(vehicle.registration_expiry)
  const TypeIcon = TYPE_ICON[vehicle.vehicle_type] ?? Truck
  const displayName = pickName(vehicle, lang)

  return (
    <div
      className={`card group cursor-pointer transition-all duration-200 hover:shadow-card-hover ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleActivate()
        }
      }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <TypeIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100 tabular-nums" dir="ltr">
              {vehicle.plate_number}
            </span>
            {vehicle.model_year && (
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {vehicle.model_year}
              </span>
            )}
            <StatusBadge status={vehicle.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{displayName}</p>
        </div>

        {/* Open-affordance chevron */}
        <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-primary rtl:rotate-180" />
      </div>

      {/* ── Summary row ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 dark:border-slate-700/70 px-4 py-2.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REG_CHIP[rs]}`}>
          {t(REG_LABEL_KEY[rs])}
          {vehicle.registration_expiry && rs !== 'none' && (
            <span className="ms-1 tabular-nums opacity-70">{formatDate(vehicle.registration_expiry, lang)}</span>
          )}
        </span>

        {vehicle.location && (
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-400" />
            {vehicle.location}
          </span>
        )}

        {vehicle.driver_name && (
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <User className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-400" />
            {vehicle.driver_name}
          </span>
        )}
      </div>
    </div>
  )
}
