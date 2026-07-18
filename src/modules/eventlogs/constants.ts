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
  ACCOUNTING: { icon: Calculator, className: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15' },
  HR: { icon: Users, className: 'text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/15' },
  WAREHOUSE: { icon: Warehouse, className: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15' },
  PROJECTS: { icon: HardHat, className: 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/15' },
  COMPANIES: { icon: Building2, className: 'text-primary bg-primary/10' },
  ARCHIVE: { icon: Archive, className: 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15' },
  LOGS: { icon: ScrollText, className: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' },
  GENERAL: { icon: Layers, className: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800' },
}

export function moduleMeta(module: string) {
  return MODULE_META[module] ?? MODULE_META.GENERAL
}
