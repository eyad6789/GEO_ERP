import { useState } from 'react'
import { ChevronDown, ChevronUp, Truck } from 'lucide-react'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber, formatCurrency, pickName } from '../../lib/format'
import { TYPE_ICON } from './fleetUtils'
import type { FleetCosts } from '../../types'

// ---------------------------------------------------------------------------
// FinanceVehicleCard — per-vehicle cost card for the Finance register.
// Mirrors VehicleCard: expandable on click; Total IQD/USD always visible,
// Maintenance & Fuel (IQD + USD) in the expandable detail.
// ---------------------------------------------------------------------------

export type VehFinRow = FleetCosts['by_vehicle'][number]

function IqdValue({ value }: { value: number }) {
  const { lang } = useLang()
  return <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">{formatNumber(value, lang)}</span>
}
function UsdValue({ value }: { value: number }) {
  const { lang } = useLang()
  return <span className="tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(value, 'USD', lang)}</span>
}

function DetailStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-slate-400 dark:text-slate-400">{label}</span>
      {children}
    </div>
  )
}

export function FinanceVehicleCard({ vehicle }: { vehicle: VehFinRow }) {
  const t = useT()
  const { lang } = useLang()
  const [expanded, setExpanded] = useState(false)

  const TypeIcon = TYPE_ICON[vehicle.vehicle_type] ?? Truck
  const displayName = pickName(vehicle, lang)
  const toggle = () => setExpanded((p) => !p)

  return (
    <div
      className={`card group cursor-pointer transition-all duration-200 hover:shadow-card-hover ${expanded ? 'shadow-card-hover' : ''}`}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
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
            <span className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100 tabular-nums" dir="ltr">
              {vehicle.plate_number}
            </span>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t(`fleet.type.${vehicle.vehicle_type}`)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{displayName}</p>
        </div>

        {/* Chevron */}
        <div className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600 transition-transform duration-200 group-hover:text-slate-400 dark:group-hover:text-slate-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* ── Totals row (always visible) ── */}
      <div className="grid grid-cols-2 gap-px border-t border-slate-100 dark:border-slate-700/70 bg-slate-100 dark:bg-slate-800">
        <div className="flex flex-col gap-0.5 bg-white dark:bg-slate-800 px-4 py-2.5">
          <span className="text-xs text-slate-400 dark:text-slate-400">{t('fleet.acc.col.total_iqd')}</span>
          <IqdValue value={vehicle.total_iqd} />
        </div>
        <div className="flex flex-col gap-0.5 bg-white dark:bg-slate-800 px-4 py-2.5">
          <span className="text-xs text-slate-400 dark:text-slate-400">{t('fleet.acc.col.total_usd')}</span>
          <UsdValue value={vehicle.total_usd} />
        </div>
      </div>

      {/* ── Expanded detail: maintenance + fuel ── */}
      {expanded && (
        <div
          className="border-t border-slate-100 dark:border-slate-700/70 px-4 pb-4 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <div className="divide-y divide-slate-50 dark:divide-slate-700/70">
              <DetailStat label={t('fleet.acc.col.maint_iqd')}><IqdValue value={vehicle.maint_iqd} /></DetailStat>
              <DetailStat label={t('fleet.acc.col.maint_usd')}><UsdValue value={vehicle.maint_usd} /></DetailStat>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/70">
              <DetailStat label={t('fleet.acc.col.fuel_iqd')}><IqdValue value={vehicle.fuel_iqd} /></DetailStat>
              <DetailStat label={t('fleet.acc.col.fuel_usd')}><UsdValue value={vehicle.fuel_usd} /></DetailStat>
            </div>
          </div>

          {/* Read-only finance note */}
          <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs text-slate-400 dark:text-slate-400">
            {t('fleet.acc.readonly')}
          </div>
        </div>
      )}
    </div>
  )
}
