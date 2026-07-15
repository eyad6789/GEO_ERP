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
  StickyNote,
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
  { key: 'notes', path: '/notes', labelKey: 'nav.notes', icon: StickyNote },
  // 'logs' (سجل الأحداث) removed from the sidebar per the accounting manager's
  // request — the event log itself keeps recording; /logs stays reachable by URL.
  { key: 'debug', path: '/debug', labelKey: 'nav.debug', icon: Bug, variant: 'debug' },
]

// Demo gating: only these modules are usable; the rest render a locked screen.
// 'companies' is intentionally locked again — the module isn't finished; the
// accountant creates companies/projects from temporary buttons in Accounting.
export const UNLOCKED_MODULES = new Set<string>(['dashboard', 'accounting', 'fleet', 'notes', 'warehouse', 'hr'])
export function isModuleLocked(key: string): boolean {
  return !UNLOCKED_MODULES.has(key)
}
/** The landing route the app opens on. */
export const LANDING_PATH = '/dashboard'
