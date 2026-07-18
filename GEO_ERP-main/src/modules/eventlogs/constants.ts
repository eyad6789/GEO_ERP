import type { BadgeColor } from '../../components/ui'
import {
  Calculator,
  Users,
  Warehouse,
  HardHat,
  Building2,
  Archive,
  ScrollText,
  Layers,
  type LucideIcon,
} from 'lucide-react'

// Module options for the filter Select (value = real column value, label via i18n key)
export const MODULE_OPTIONS = [
  'ACCOUNTING',
  'HR',
  'WAREHOUSE',
  'PROJECTS',
  'COMPANIES',
  'ARCHIVE',
  'LOGS',
  'GENERAL',
] as const

export const ACTION_OPTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'EXPORT',
  'PRINT',
  'LOGIN',
  'LOGOUT',
] as const

export const STATUS_OPTIONS = ['SUCCESS', 'FAILED', 'WARNING'] as const

// Colored Badge per action (the colored action chip in the table)
export const ACTION_COLOR: Record<string, BadgeColor> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  APPROVE: 'primary',
  REJECT: 'red',
  EXPORT: 'sky',
  PRINT: 'purple',
  LOGIN: 'gray',
  LOGOUT: 'gray',
}

// Icon + tint per module (used in the module cell + detail dialog)
export const MODULE_META: Record<string, { icon: LucideIcon; className: string }> = {
  ACCOUNTING: { icon: Calculator, className: 'text-emerald-600 bg-emerald-50' },
  HR: { icon: Users, className: 'text-violet-600 bg-violet-50' },
  WAREHOUSE: { icon: Warehouse, className: 'text-amber-600 bg-amber-50' },
  PROJECTS: { icon: HardHat, className: 'text-sky-600 bg-sky-50' },
  COMPANIES: { icon: Building2, className: 'text-primary bg-primary/10' },
  ARCHIVE: { icon: Archive, className: 'text-rose-600 bg-rose-50' },
  LOGS: { icon: ScrollText, className: 'text-slate-600 bg-slate-100' },
  GENERAL: { icon: Layers, className: 'text-slate-500 bg-slate-100' },
}

export function moduleMeta(module: string) {
  return MODULE_META[module] ?? MODULE_META.GENERAL
}
