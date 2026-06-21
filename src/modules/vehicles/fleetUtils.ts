// ============================================================================
// Shared Fleet helpers — used by every tab so behaviour stays consistent.
// ============================================================================
import type { VehicleType } from '../../types'

/** Registration-expiry alarm state (note 6.4). */
export type RegState = 'expired' | 'soon' | 'ok' | 'none'

/** Days within which a registration counts as "expiring soon". */
export const REG_SOON_DAYS = 90

/** Classify a registration-expiry ISO date relative to today. */
export function regState(expiry: string | null | undefined, now: Date = new Date()): RegState {
  if (!expiry) return 'none'
  const d = new Date(expiry)
  if (Number.isNaN(d.getTime())) return 'none'
  const days = Math.floor((d.getTime() - now.getTime()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= REG_SOON_DAYS) return 'soon'
  return 'ok'
}

/** Tailwind chip classes per registration state. */
export const REG_CHIP: Record<RegState, string> = {
  expired: 'bg-danger/10 text-danger',
  soon: 'bg-warning/10 text-warning',
  ok: 'bg-success/10 text-success',
  none: 'bg-slate-100 text-slate-500',
}

/** i18n key per registration state. */
export const REG_LABEL_KEY: Record<RegState, string> = {
  expired: 'fleet.reg.expired',
  soon: 'fleet.reg.soon',
  ok: 'fleet.reg.ok',
  none: 'fleet.reg.none',
}

/** Fallback emoji per vehicle type (vehicles carry their own `emoji`, this backs it up). */
export const TYPE_EMOJI: Record<VehicleType, string> = {
  CAR: '🚗', PICKUP: '🛻', MIXER: '🚚', EXCAVATOR: '⛏️', LOADER: '🔄', BULLDOZER: '🚜',
  CRANE: '🏗️', DUMP_TRUCK: '🚛', LIFT: '🚜', ROLLER: '〰️', DUMPER: '🚜', TANKER: '🚛',
  PUMP: '🔩', MISC: '🚜',
}

export const VEHICLE_TYPES: VehicleType[] = [
  'CAR', 'PICKUP', 'MIXER', 'EXCAVATOR', 'LOADER', 'BULLDOZER', 'CRANE',
  'DUMP_TRUCK', 'LIFT', 'ROLLER', 'DUMPER', 'TANKER', 'PUMP', 'MISC',
]

/** Marker color per vehicle status (map + legends). */
export const STATUS_COLOR: Record<string, string> = {
  ACTIVE: '#27ae60',
  MAINTENANCE: '#f39c12',
  INACTIVE: '#64748b',
  RETIRED: '#94a3b8',
}
