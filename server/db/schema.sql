-- ============================================================================
-- GEO ERP — SQLite schema. Authored once in the foundation phase.
-- All ids are TEXT, money is REAL, booleans are INTEGER (0/1), dates are TEXT.
-- Uses IF NOT EXISTS so the server can boot before seeding.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---- Companies -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  code TEXT,
  name_ar TEXT,
  name_en TEXT,
  type TEXT,                 -- PARENT | SUBSIDIARY
  parent_id TEXT,
  registration_number TEXT,
  tax_number TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  established_date TEXT,
  currency_primary TEXT,
  currency_secondary TEXT,
  status TEXT,               -- ACTIVE | INACTIVE
  logo_color TEXT,
  created_at TEXT
);

-- ---- Departments -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  name_ar TEXT,
  name_en TEXT,
  parent_id TEXT,
  manager_id TEXT,
  created_at TEXT
);

-- ---- Employees -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  national_id TEXT,
  full_name_ar TEXT,
  full_name_en TEXT,
  photo_color TEXT,
  dob TEXT,
  place_of_birth TEXT,
  nationality TEXT,
  religion TEXT,
  gender TEXT,
  marital_status TEXT,
  children_count INTEGER DEFAULT 0,
  phone_primary TEXT,
  phone_secondary TEXT,
  email_work TEXT,
  email_personal TEXT,
  address TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  company_id TEXT,
  department_id TEXT,
  job_title TEXT,
  employment_type TEXT,      -- FULL | PART | CONTRACT | TEMP
  hire_date TEXT,
  contract_end_date TEXT,
  status TEXT,               -- ACTIVE | ON_LEAVE | SUSPENDED | TERMINATED
  manager_id TEXT,
  basic_salary REAL DEFAULT 0,
  salary_currency TEXT,
  bank_name TEXT,
  bank_account TEXT,
  iban TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  date TEXT,
  status TEXT,               -- PRESENT | ABSENT | LEAVE | MISSION | HOLIDAY
  check_in TEXT,
  check_out TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  type TEXT,
  start_date TEXT,
  end_date TEXT,
  days_count INTEGER DEFAULT 0,
  hours_count REAL DEFAULT 0, -- hourly (زمنية) leave: > 0 with days_count = 0
  reason TEXT,
  status TEXT,               -- PENDING | APPROVED | REJECTED
  approved_by TEXT,
  decision_note TEXT,        -- why the manager approved/rejected
  manager_question TEXT,     -- manager's inquiry on a pending request (لماذا تريد الإجازة؟)
  question_answer TEXT,      -- the employee's reply to the inquiry
  summoned_at TEXT,          -- manager summoned the employee for a face-to-face talk
  recalled_at TEXT,          -- date an approved leave was cut short (عاد للعمل)
  recall_note TEXT,          -- why the employee was recalled from leave
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  date TEXT,
  amount REAL DEFAULT 0,
  currency TEXT,
  reason TEXT,
  monthly_deduction REAL DEFAULT 0,
  status TEXT,               -- PENDING | APPROVED | REPAYING | SETTLED
  balance_remaining REAL DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  period TEXT,               -- YYYY-MM
  basic_salary REAL DEFAULT 0,
  housing_allowance REAL DEFAULT 0,
  transport_allowance REAL DEFAULT 0,
  phone_allowance REAL DEFAULT 0,
  overtime REAL DEFAULT 0,
  deductions_absence REAL DEFAULT 0,
  deductions_advance REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  net_salary REAL DEFAULT 0,
  currency TEXT,
  status TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  date TEXT,
  occasion TEXT,
  type TEXT,                 -- CASH | IN_KIND | VOUCHER
  value REAL DEFAULT 0,
  currency TEXT,
  description TEXT,
  given_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  period TEXT,
  rating_overall REAL DEFAULT 0,
  ratings_json TEXT,
  manager_comments TEXT,
  goals TEXT,
  created_at TEXT
);

-- ---- Projects --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  code TEXT,
  name_ar TEXT,
  name_en TEXT,
  company_id TEXT,
  client TEXT,
  contract_number TEXT,
  contract_value REAL DEFAULT 0,
  currency TEXT,
  start_date TEXT,
  end_date TEXT,
  actual_end_date TEXT,
  status TEXT,               -- PLANNING | ACTIVE | ON_HOLD | COMPLETED | CANCELLED
  manager_id TEXT,
  location TEXT,
  lat REAL,                  -- map coordinate (drives the Fleet map; set when a project is created)
  lng REAL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name_ar TEXT,
  start_date TEXT,
  end_date TEXT,
  percent_complete INTEGER DEFAULT 0,
  depends_on TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS project_machinery (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  code TEXT,
  name_ar TEXT,
  type TEXT,
  operator_id TEXT,
  assigned_date TEXT,
  return_date TEXT,
  hours_worked REAL DEFAULT 0,
  fuel_consumed REAL DEFAULT 0,
  status TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS project_staff (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  employee_id TEXT,
  project_role TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS project_expenditures (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  serial_number TEXT,
  doc_number TEXT,
  date TEXT,
  category TEXT,
  description TEXT,
  amount REAL DEFAULT 0,
  currency TEXT,
  paid_to TEXT,
  payment_method TEXT,
  approved_by TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS project_diagrams (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name_ar TEXT,
  version TEXT,
  file_type TEXT,
  comments_count INTEGER DEFAULT 0,
  uploaded_at TEXT,
  created_at TEXT
);

-- ---- Warehouse -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  location TEXT,
  type TEXT,                 -- MAIN (physical store) | PROJECT (project site holding transferred stock)
  project_id TEXT,            -- FK -> projects.id; set only when type = PROJECT
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  code TEXT,
  name_ar TEXT,
  name_en TEXT,
  category TEXT,             -- canonical taxonomy id (see server/seed/warehouseTaxonomy.ts), e.g. 'PIPES'
  sub_category TEXT,         -- canonical sub id within the category, e.g. 'DUCTILE'
  spec TEXT,                 -- free-text size/dimension, e.g. "قطر 250ملم", "2 انج", "طول 12 م"
  size_label TEXT,           -- normalized diameter chip for pipes/fittings/valves, e.g. "DN 600", "2 انج"
  size_mm REAL,              -- numeric diameter in mm (inches converted) — sorts the size chips
  condition TEXT,            -- NEW | GOOD | USED | NEEDS_REPAIR | BROKEN (imported from workbook notes)
  uom TEXT,
  min_stock REAL DEFAULT 0,
  max_stock REAL DEFAULT 0,
  shelf_location TEXT,
  description TEXT,
  unit_cost REAL DEFAULT 0,
  currency TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  warehouse_id TEXT,
  quantity REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  serial_number TEXT,
  doc_number TEXT,
  date TEXT,
  type TEXT,                 -- IN | OUT | TRANSFER | RETURN | ADJUST
  warehouse_id TEXT,
  from_warehouse_id TEXT,
  company_id TEXT,
  project_id TEXT,
  currency TEXT,
  total_value REAL DEFAULT 0,
  approved_by TEXT,
  received_by TEXT,          -- من استلم المواد (custody name, free text)
  is_loan INTEGER DEFAULT 0, -- عهدة: outgoing loan expected back
  returned_at TEXT,          -- set when a loan is returned (one-tap from the custody board)
  signature_file TEXT,       -- on-screen receiver signature image (server/data/item-images sibling dir)
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS inventory_lines (
  id TEXT PRIMARY KEY,
  transaction_id TEXT,
  item_id TEXT,
  quantity REAL DEFAULT 0,
  uom TEXT,
  unit_price REAL DEFAULT 0,
  total REAL DEFAULT 0
);

-- ---- Accounting ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  code TEXT PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  type TEXT,                 -- ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
  normal_balance TEXT,       -- DEBIT | CREDIT
  parent_code TEXT,
  level INTEGER DEFAULT 1,
  is_posting INTEGER DEFAULT 0,
  sort_order REAL DEFAULT 0,  -- manual ordering (drag & drop in the tree)
  archived INTEGER DEFAULT 0 -- soft-delete: 1 = hidden but kept in DB
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  serial_number TEXT,
  doc_number TEXT,
  company_id TEXT,
  project_id TEXT,
  date TEXT,
  description TEXT,
  currency TEXT,
  exchange_rate REAL DEFAULT 1,  -- rate to the secondary currency (IQD<->USD)
  status TEXT,               -- APPROVED (all entries are approved; kept for compatibility)
  total_debit REAL DEFAULT 0,
  total_credit REAL DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT,
  account_code TEXT,
  company_id TEXT,
  project_id TEXT,
  description TEXT,
  currency TEXT,
  price REAL DEFAULT 0,
  value REAL DEFAULT 0,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  vehicle_id TEXT            -- FK -> vehicles.id; set when this line is a vehicle expense
);

-- ---- Banks (cash & bank management; dual-currency balances) -----------------
CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  account_number TEXT,
  branch TEXT,
  company_id TEXT,
  opening_balance_iqd REAL DEFAULT 0,
  opening_balance_usd REAL DEFAULT 0,
  balance_iqd REAL DEFAULT 0,
  balance_usd REAL DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  account_code TEXT,            -- linked GL account under 183 المصارف
  created_at TEXT
);

-- ---- Archive ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS archive_documents (
  id TEXT PRIMARY KEY,
  doc_type TEXT,             -- CV | MESSAGE | EMAIL_EXT | EMAIL_INT | NEWS | FINANCIAL
  title TEXT,
  ref_number TEXT,
  date TEXT,
  company_id TEXT,
  project_id TEXT,
  from_party TEXT,
  to_party TEXT,
  cc TEXT,
  subject TEXT,
  body TEXT,
  category TEXT,
  author TEXT,
  amount REAL,
  currency TEXT,
  doc_status TEXT,
  tags TEXT,
  attachments_count INTEGER DEFAULT 0,
  created_at TEXT
);

-- ---- Notes -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  record_type TEXT,
  record_id TEXT,
  content TEXT,
  visibility TEXT,           -- PUBLIC | RESTRICTED | PRIVATE
  author TEXT,
  pinned INTEGER DEFAULT 0,
  created_at TEXT
);

-- ---- Event Logs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  user_name TEXT,
  user_role TEXT,
  company_id TEXT,
  module TEXT,
  action TEXT,               -- CREATE | UPDATE | DELETE | APPROVE | ...
  record_type TEXT,
  record_id TEXT,
  record_description TEXT,
  ip_address TEXT,
  device TEXT,
  browser TEXT,
  status TEXT,               -- SUCCESS | FAILED | WARNING
  old_values TEXT,
  new_values TEXT,
  error_message TEXT
);

-- ---- Fleet / Vehicles (الآليات) -------------------------------------------
-- The Fleet module owns vehicle records. Money is NEVER edited here — costs live
-- in vehicle_costs (seeded from finance) and are shown read-only. project_id is
-- auto-derived from the vehicle's location, or set manually by an admin.
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  code TEXT,                 -- VEH-001 …
  vehicle_type TEXT,         -- CAR | PICKUP | MIXER | EXCAVATOR | LOADER | BULLDOZER | CRANE | DUMP_TRUCK | LIFT | ROLLER | DUMPER | TANKER | PUMP | MISC
  type_group TEXT,           -- original Arabic category group from the fleet sheet
  name_ar TEXT,              -- specific type label (e.g. حفارة كوماتسو)
  name_en TEXT,
  emoji TEXT,                -- marker/icon glyph
  plate_number TEXT,
  model_year INTEGER,
  owner_name TEXT,           -- free text (company or individual)
  owner_company_id TEXT,     -- optional FK -> companies.id
  registration_expiry TEXT,  -- ISO date; drives red/yellow/green alarms
  oil_change_date TEXT,      -- ISO date; last oil change
  status TEXT,               -- ACTIVE | INACTIVE | MAINTENANCE | RETIRED
  location TEXT,             -- site / governorate text
  project_id TEXT,           -- FK -> projects.id (nullable; auto by location or manual)
  driver_name TEXT,          -- free text
  driver_id TEXT,            -- optional FK -> employees.id
  company_id TEXT,           -- operating subsidiary
  last_odometer INTEGER,
  lat REAL,                  -- current map position (near its project)
  lng REAL,
  notes TEXT,
  created_at TEXT
);

-- Vehicle costs are finance-owned: the Fleet module READS these (read-only),
-- editing happens only in the Accounting/Finance section. IQD and USD are kept
-- as separate rows and are never summed together.
CREATE TABLE IF NOT EXISTS vehicle_costs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,           -- FK -> vehicles.id
  category TEXT,             -- PURCHASE | MAINTENANCE | FUEL | PARTS
  amount REAL DEFAULT 0,
  currency TEXT,             -- IQD | USD
  date TEXT,
  note TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicles_project ON vehicles(project_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_costs_vehicle ON vehicle_costs(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_inv_lines_txn ON inventory_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_stock_item ON stock(item_id);
CREATE INDEX IF NOT EXISTS idx_notes_record ON notes(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_logs_ts ON event_logs(timestamp);
