// ============================================================================
// Sidebar navigation registry. Authored once in the foundation phase; read-only
// for module agents. Order = sidebar order.
// ============================================================================
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Users,
  Calculator,
  Warehouse,
  FolderOpen,
  ScrollText,
  Bug,
  Truck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  key: string
  path: string
  labelKey: string // i18n key
  icon: LucideIcon
  /** debug item gets a distinct dark accent */
  variant?: 'default' | 'debug'
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { key: 'companies', path: '/companies', labelKey: 'nav.companies', icon: Building2 },
  { key: 'projects', path: '/projects', labelKey: 'nav.projects', icon: BarChart3 },
  { key: 'fleet', path: '/fleet', labelKey: 'nav.fleet', icon: Truck },
  { key: 'hr', path: '/hr', labelKey: 'nav.hr', icon: Users },
  { key: 'accounting', path: '/accounting', labelKey: 'nav.accounting', icon: Calculator },
  { key: 'warehouse', path: '/warehouse', labelKey: 'nav.warehouse', icon: Warehouse },
  { key: 'archive', path: '/archive', labelKey: 'nav.archive', icon: FolderOpen },
  { key: 'logs', path: '/logs', labelKey: 'nav.logs', icon: ScrollText },
  { key: 'debug', path: '/debug', labelKey: 'nav.debug', icon: Bug, variant: 'debug' },
]

// Demo gating: only these modules are usable; the rest render a locked screen.
export const UNLOCKED_MODULES = new Set<string>(['dashboard', 'accounting', 'fleet'])
export function isModuleLocked(key: string): boolean {
  return !UNLOCKED_MODULES.has(key)
}
/** The landing route the app opens on. */
export const LANDING_PATH = '/dashboard'
