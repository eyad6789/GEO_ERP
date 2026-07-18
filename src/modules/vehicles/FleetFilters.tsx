// ============================================================================
// FleetFilters — shared register controls (group toggle + type chips) used by
// both the Vehicles register (VehiclesTab) and the Finance register
// (AccountingTab) so they look and behave identically.
// ============================================================================
import { LayoutGrid, FolderOpen } from 'lucide-react'
import { useT } from '../../context/LangContext'
import { VEHICLE_TYPES, TYPE_ICON } from './fleetUtils'

export type GroupMode = 'by_type' | 'by_project'

// ──────────────────────────────────────────────
// Toggle segmented control (By Type / By Project)
// ──────────────────────────────────────────────
export function ToggleControl({
  value,
  onChange,
}: {
  value: GroupMode
  onChange: (v: GroupMode) => void
}) {
  const t = useT()
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-0.5">
      {(['by_type', 'by_project'] as GroupMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            value === mode
              ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          {mode === 'by_type' ? (
            <LayoutGrid className="h-3.5 w-3.5" />
          ) : (
            <FolderOpen className="h-3.5 w-3.5" />
          )}
          {t(`fleet.toggle.${mode}`)}
        </button>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Type filter chips (used in by_type mode)
// ──────────────────────────────────────────────
export function TypeChips({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<string, number>
  selected: string
  onSelect: (t: string) => void
}) {
  const t = useT()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect('ALL')}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selected === 'ALL'
            ? 'bg-primary text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
        }`}
      >
        {t('fleet.filter.all')}
        <span className={`rounded-full px-1.5 py-0.5 text-xs ${selected === 'ALL' ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {totalCount}
        </span>
      </button>
      {VEHICLE_TYPES.filter((k) => (counts[k] ?? 0) > 0).map((k) => {
        const Icon = TYPE_ICON[k]
        return (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selected === k
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(`fleet.type.${k}`)}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${selected === k ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              {counts[k]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
