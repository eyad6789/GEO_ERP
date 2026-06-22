// ============================================================================
// GEO ERP — Global type contract.
// Authored once in the foundation phase. Module agents IMPORT from here and may
// add module-local types inside their own folder, but must NOT edit this file.
// All money is a number (demo-grade). All ids are strings. Dates are ISO strings.
// ============================================================================

export type ID = string
export type ISODate = string // 'YYYY-MM-DD' or full ISO timestamp

export type Currency = 'IQD' | 'USD' | 'EUR' | 'SAR' | 'TRY'

export const CURRENCIES: Currency[] = ['IQD', 'USD', 'EUR', 'SAR', 'TRY']

// ---- Companies -------------------------------------------------------------
export type CompanyType = 'PARENT' | 'SUBSIDIARY'
export type CompanyStatus = 'ACTIVE' | 'INACTIVE'

export interface Company {
  id: ID
  code: string
  name_ar: string
  name_en: string
  type: CompanyType
  parent_id: ID | null
  registration_number: string
  tax_number: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website: string
  established_date: ISODate
  currency_primary: Currency
  currency_secondary: Currency | null
  status: CompanyStatus
  logo_color: string // hex used for the avatar tint
  created_at?: string
}

// ---- Departments -----------------------------------------------------------
export interface Department {
  id: ID
  company_id: ID
  name_ar: string
  name_en: string
  parent_id: ID | null
  manager_id: ID | null
  created_at?: string
}

// ---- Employees -------------------------------------------------------------
export type EmploymentType = 'FULL' | 'PART' | 'CONTRACT' | 'TEMP'
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'

export interface Employee {
  id: ID
  employee_number: string
  national_id: string
  full_name_ar: string
  full_name_en: string
  photo_color: string
  dob: ISODate
  place_of_birth: string
  nationality: string
  religion: string
  gender: 'MALE' | 'FEMALE'
  marital_status: string
  children_count: number
  phone_primary: string
  phone_secondary: string
  email_work: string
  email_personal: string
  address: string
  emergency_name: string
  emergency_phone: string
  company_id: ID
  department_id: ID | null
  job_title: string
  employment_type: EmploymentType
  hire_date: ISODate
  contract_end_date: ISODate | null
  status: EmployeeStatus
  manager_id: ID | null
  basic_salary: number
  salary_currency: Currency
  bank_name: string
  bank_account: string
  iban: string
  created_at?: string
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MISSION' | 'HOLIDAY'
export interface Attendance {
  id: ID
  employee_id: ID
  date: ISODate
  status: AttendanceStatus
  check_in: string | null
  check_out: string | null
  notes: string
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export interface LeaveRequest {
  id: ID
  employee_id: ID
  type: string
  start_date: ISODate
  end_date: ISODate
  days_count: number
  reason: string
  status: LeaveStatus
  approved_by: ID | null
}

export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'REPAYING' | 'SETTLED'
export interface Advance {
  id: ID
  employee_id: ID
  date: ISODate
  amount: number
  currency: Currency
  reason: string
  monthly_deduction: number
  status: AdvanceStatus
  balance_remaining: number
}

export interface Payroll {
  id: ID
  employee_id: ID
  period: string // YYYY-MM
  basic_salary: number
  housing_allowance: number
  transport_allowance: number
  phone_allowance: number
  overtime: number
  deductions_absence: number
  deductions_advance: number
  other_deductions: number
  net_salary: number
  currency: Currency
  status: string
}

export interface Gift {
  id: ID
  employee_id: ID
  date: ISODate
  occasion: string
  type: 'CASH' | 'IN_KIND' | 'VOUCHER'
  value: number
  currency: Currency
  description: string
  given_by: ID | null
}

export interface PerformanceReview {
  id: ID
  employee_id: ID
  period: string
  rating_overall: number
  ratings_json: string // JSON map of category -> 1..5
  manager_comments: string
  goals: string
}

// ---- Projects --------------------------------------------------------------
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export interface Project {
  id: ID
  code: string
  name_ar: string
  name_en: string
  company_id: ID
  client: string
  contract_number: string
  contract_value: number
  currency: Currency
  start_date: ISODate
  end_date: ISODate
  actual_end_date: ISODate | null
  status: ProjectStatus
  manager_id: ID | null
  location: string
  lat?: number | null // map coordinate (drives the Fleet map)
  lng?: number | null
  description: string
  progress: number // 0..100
  created_at?: string
}

export interface ProjectMilestone {
  id: ID
  project_id: ID
  name_ar: string
  start_date: ISODate
  end_date: ISODate
  percent_complete: number
  depends_on: ID | null
}

export interface ProjectMachinery {
  id: ID
  project_id: ID
  code: string
  name_ar: string
  type: string
  operator_id: ID | null
  assigned_date: ISODate
  return_date: ISODate | null
  hours_worked: number
  fuel_consumed: number
  status: string
}

export interface ProjectStaff {
  id: ID
  project_id: ID
  employee_id: ID
  project_role: string
  start_date: ISODate
  end_date: ISODate | null
  status: string
}

export interface ProjectExpenditure {
  id: ID
  project_id: ID
  serial_number: string
  doc_number: string
  date: ISODate
  category: string
  description: string
  amount: number
  currency: Currency
  paid_to: string
  payment_method: string
  approved_by: ID | null
}

export interface ProjectDiagram {
  id: ID
  project_id: ID
  name_ar: string
  version: string
  file_type: string
  comments_count: number
  uploaded_at: ISODate
}

// ---- Warehouse -------------------------------------------------------------
export interface Warehouse {
  id: ID
  name_ar: string
  location: string
}

export interface Item {
  id: ID
  code: string
  name_ar: string
  name_en: string
  category: string
  sub_category: string
  uom: string
  min_stock: number
  max_stock: number
  shelf_location: string
  description: string
  unit_cost: number
  currency: Currency
  created_at?: string
}

export interface Stock {
  id: ID
  item_id: ID
  warehouse_id: ID
  quantity: number
}

export type InventoryTxnType = 'IN' | 'OUT' | 'TRANSFER' | 'RETURN' | 'ADJUST'
export interface InventoryTransaction {
  id: ID
  serial_number: string
  doc_number: string
  date: ISODate
  type: InventoryTxnType
  warehouse_id: ID
  from_warehouse_id: ID | null
  company_id: ID | null
  project_id: ID | null
  currency: Currency
  total_value: number
  approved_by: ID | null
  notes: string
  created_at?: string
}

export interface InventoryLine {
  id: ID
  transaction_id: ID
  item_id: ID
  quantity: number
  uom: string
  unit_price: number
  total: number
}

// ---- Accounting ------------------------------------------------------------
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
export interface Account {
  code: string // PK
  name_ar: string
  name_en: string
  type: AccountType
  normal_balance: 'DEBIT' | 'CREDIT'
  parent_code: string | null
  level: number // 1..4
  is_posting: number // 0/1 — leaf accounts you can post to
  sort_order?: number // manual ordering (drag & drop)
  archived?: number // 0/1 — soft-deleted (hidden but kept in DB)
}

export type JournalStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'
export interface JournalEntry {
  id: ID
  serial_number: string
  doc_number: string
  company_id: ID | null
  project_id: ID | null
  date: ISODate
  description: string
  currency: Currency
  exchange_rate?: number
  status: JournalStatus
  total_debit: number
  total_credit: number
  created_at?: string
}

export interface JournalLine {
  id: ID
  entry_id: ID
  account_code: string
  company_id: ID | null
  project_id: ID | null
  description: string
  currency: Currency
  price: number
  value: number
  debit: number
  credit: number
}

// A full entry with its lines (used by the journal create dialog)
export interface JournalEntryWithLines extends Omit<JournalEntry, 'id' | 'total_debit' | 'total_credit'> {
  lines: Array<Omit<JournalLine, 'id' | 'entry_id'>>
}

// ---- Banks (cash & bank management; dual-currency balances) ----------------
export interface Bank {
  id: ID
  name_ar: string
  name_en: string
  account_number: string
  branch: string
  company_id: ID | null
  opening_balance_iqd: number
  opening_balance_usd: number
  balance_iqd: number
  balance_usd: number
  status: string
  account_code?: string | null // linked GL account under 183 المصارف
  created_at?: string
}

// ---- Archive ---------------------------------------------------------------
export type ArchiveDocType =
  | 'CV'
  | 'MESSAGE'
  | 'EMAIL_EXT'
  | 'EMAIL_INT'
  | 'NEWS'
  | 'FINANCIAL'

export interface ArchiveDocument {
  id: ID
  doc_type: ArchiveDocType
  title: string
  ref_number: string
  date: ISODate
  company_id: ID | null
  project_id: ID | null
  from_party: string
  to_party: string
  cc: string
  subject: string
  body: string
  category: string
  author: string
  amount: number | null
  currency: Currency | null
  doc_status: string
  tags: string // csv
  attachments_count: number
  created_at?: string
}

// ---- Notes (global widget) -------------------------------------------------
export type NoteVisibility = 'PUBLIC' | 'RESTRICTED' | 'PRIVATE'
export interface Note {
  id: ID
  module_id: string
  record_type: string
  record_id: string
  content: string
  visibility: NoteVisibility
  author: string
  pinned: number
  created_at: string
}

// ---- Event Logs ------------------------------------------------------------
export type LogAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'EXPORT'
  | 'PRINT'
  | 'LOGIN'
  | 'LOGOUT'
export type LogStatus = 'SUCCESS' | 'FAILED' | 'WARNING'

export interface EventLog {
  id: ID
  timestamp: string
  user_name: string
  user_role: string
  company_id: ID | null
  module: string
  action: LogAction
  record_type: string
  record_id: string
  record_description: string
  ip_address: string
  device: string
  browser: string
  status: LogStatus
  old_values: string | null
  new_values: string | null
  error_message: string | null
}

// ---- Dashboard aggregate ---------------------------------------------------
export interface DashboardData {
  counts: {
    companies: number
    projects: number
    active_projects: number
    employees: number
    items: number
    journal_entries: number
  }
  finance: {
    total_revenue: number
    total_expense: number
    net_profit: number
    total_assets: number
    total_liabilities: number
    contract_value_total: number
    total_revenue_usd: number
    total_expense_usd: number
    net_profit_usd: number
    total_assets_usd: number
    total_liabilities_usd: number
    fleet_spend_iqd: number
    fleet_spend_usd: number
  }
  alerts: {
    low_stock: number
    pending_leaves: number
  }
  projects_by_status: Array<{ status: ProjectStatus; count: number }>
  revenue_expense_by_month: Array<{ month: string; revenue: number; expense: number }>
  employees_by_company: Array<{ company: string; count: number }>
  recent_logs: EventLog[]
}

// ---- Fleet / Vehicles (الآليات) -------------------------------------------
export type VehicleType =
  | 'CAR' | 'PICKUP' | 'MIXER' | 'EXCAVATOR' | 'LOADER' | 'BULLDOZER' | 'CRANE'
  | 'DUMP_TRUCK' | 'LIFT' | 'ROLLER' | 'DUMPER' | 'TANKER' | 'PUMP' | 'MISC'
export type VehicleStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'RETIRED'
export type VehicleCostCategory = 'PURCHASE' | 'MAINTENANCE' | 'FUEL' | 'PARTS'

export interface Vehicle {
  id: ID
  code: string
  vehicle_type: VehicleType
  type_group: string // original Arabic fleet-sheet group
  name_ar: string
  name_en: string
  emoji: string
  plate_number: string
  model_year: number | null
  owner_name: string
  owner_company_id: ID | null
  registration_expiry: ISODate | null
  oil_change_date: ISODate | null
  status: VehicleStatus
  location: string
  project_id: ID | null
  driver_name: string
  driver_id: ID | null
  company_id: ID
  last_odometer: number | null
  lat: number | null
  lng: number | null
  notes: string
  account_code?: string | null // linked asset account under اليات (5)
  created_at?: string
}

export interface VehicleCost {
  id: ID
  vehicle_id: ID
  category: VehicleCostCategory
  amount: number
  currency: Currency
  date: ISODate
  note: string
  created_at?: string
}

// /api/fleet/summary — read-only KPI + rollup endpoint
export interface FleetSummary {
  counts: { total: number; active: number; inactive: number; maintenance: number; retired: number }
  by_type: Array<{ vehicle_type: VehicleType; name_en: string; emoji: string; count: number }>
  by_project: Array<{ project_id: ID | null; name_ar: string; name_en: string; count: number }>
  by_status: Array<{ status: VehicleStatus; count: number }>
  registration_alerts: { expired: number; soon: number; ok: number }
  oil_alerts: { due: number }
}

// /api/fleet/map — projects + positioned vehicles for Leaflet
export interface FleetMapData {
  projects: Array<{
    id: ID; name_ar: string; name_en: string; location: string
    lat: number; lng: number; status: ProjectStatus; kind: 'ACTIVE' | 'MASTERPLAN' | 'BASE'; vehicle_count: number
  }>
  vehicles: Array<{
    id: ID; code: string; plate_number: string; name_ar: string; name_en: string; emoji: string
    vehicle_type: VehicleType; status: VehicleStatus; lat: number; lng: number
    project_id: ID | null; project_name: string; location: string; driver_name: string
  }>
}

// /api/fleet/costs — read-only finance preview (IQD and USD kept separate)
export interface FleetCosts {
  totals: { iqd: number; usd: number }
  by_category: Array<{ category: VehicleCostCategory; iqd: number; usd: number }>
  by_type: Array<{ vehicle_type: VehicleType; name_en: string; iqd: number; usd: number }>
  by_project: Array<{ project_id: ID | null; name_ar: string; iqd: number; usd: number; vehicles: number }>
  by_month: Array<{ month: string; iqd: number; usd: number }>
}
