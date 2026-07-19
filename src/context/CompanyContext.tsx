import { createContext, useContext, useState, type ReactNode } from 'react'

export interface RoleOption {
  key: string
  label_ar: string
  label_en: string
}

// Cosmetic only — no real auth. Lets the demo show the RBAC concept.
export const ROLES: RoleOption[] = [
  { key: 'super_admin', label_ar: 'مسؤول عام', label_en: 'Super Admin' },
  { key: 'company_admin', label_ar: 'مسؤول شركة', label_en: 'Company Admin' },
  { key: 'project_manager', label_ar: 'مدير مشروع', label_en: 'Project Manager' },
  { key: 'fleet_manager', label_ar: 'مدير الآليات', label_en: 'Fleet Manager' },
  { key: 'accountant', label_ar: 'محاسب', label_en: 'Accountant' },
  { key: 'hr_manager', label_ar: 'مدير الموارد البشرية', label_en: 'HR Manager' },
  { key: 'warehouse_manager', label_ar: 'مدير المستودع', label_en: 'Warehouse Manager' },
  { key: 'employee', label_ar: 'موظف', label_en: 'Employee' },
  { key: 'viewer', label_ar: 'عارض', label_en: 'Viewer' },
]

/** The person currently using the app ("acting as"). No real auth — lets each
 *  person see only their own private notes and own leaves/attendance. */
export interface AppUser {
  id: string
  name: string
}

export const DEFAULT_USER: AppUser = { id: 'ahmed', name: 'أحمد المدير' }

interface CompanyContextValue {
  /** Currently selected company id, or null for "all companies". */
  companyId: string | null
  setCompanyId: (id: string | null) => void
  role: RoleOption
  setRole: (r: RoleOption) => void
  currentUser: AppUser
  setCurrentUser: (u: AppUser) => void
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [role, setRole] = useState<RoleOption>(ROLES[0])
  const [currentUser, setCurrentUser] = useState<AppUser>(DEFAULT_USER)
  return (
    <CompanyContext.Provider value={{ companyId, setCompanyId, role, setRole, currentUser, setCurrentUser }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
