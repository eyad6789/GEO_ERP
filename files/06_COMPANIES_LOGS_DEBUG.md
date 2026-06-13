# 🏢 Module 06 — Companies + Logs + Debug

---

## PART A: Companies (الشركات)

### Overview
The parent company contains 11 sub-companies. Each sub-company has its own identity, users, and data — but all are visible to the super admin.

---

### Company Master Record

```
Company {
  id: auto (1–11 + parent)
  code: string              // رمز الشركة
  name_ar: string           // اسم الشركة بالعربي
  name_en: string
  logo: Image
  type: PARENT|SUBSIDIARY
  parent?: Company
  registration_number: string
  tax_number: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  website?: string
  established_date: Date
  currency_primary: string
  currency_secondary?: string
  status: ACTIVE|INACTIVE
  
  // Financial Summary (auto-calculated from accounting)
  total_assets: number
  total_liabilities: number
  net_equity: number
  
  // Relationships
  projects: Project[]       // owned projects
  employees: Employee[]     // assigned employees
  warehouses: Warehouse[]   // assigned warehouses
  
  notes: string (private)
}
```

---

### Company List View
```
┌──────────────────────────────────────────────────────┐
│  الشركات                                              │
├──────────────────────────────────────────────────────┤
│  Parent Company Card (large, at top)                 │
│  ┌────────────────────────────────────────────────┐  │
│  │ [Logo] Company Name     ACTIVE                  │  │
│  │ المدير: ...  | الموظفون: xx | المشاريع: xx     │  │
│  │ الأصول: xxx,xxx | الخصوم: xxx | الصافي: xxx   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Sub-Companies Grid (11 companies)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Co. 1    │ │ Co. 2    │ │ Co. 3    │             │
│  │ [logo]   │ │ [logo]   │ │ [logo]   │             │
│  │ status   │ │ status   │ │ status   │             │
│  └──────────┘ └──────────┘ └──────────┘             │
└──────────────────────────────────────────────────────┘
```

### Company Detail Page Tabs
1. **المعلومات الأساسية** — All fields above
2. **الموظفون** — Employees list filtered to this company
3. **المشاريع** — Projects list filtered to this company
4. **المحاسبة** — Accounting summary + link to full accounting module
5. **المستودع** — Warehouse items assigned to this company
6. **الأرشيف** — Archive records for this company

---

### Claude Code Prompt (Companies Module)

```
Build the Companies module for an Arabic RTL ERP system using React + TypeScript + Tailwind.

Requirements:
- RTL layout, Arabic labels
- One parent company displayed prominently at top with summary stats cards
- 11 sub-company cards in a responsive grid below
- Each card shows: logo placeholder, Arabic name, status badge, employee count, project count
- Clicking a company opens detail page with 6 tabs:
  1. المعلومات: all company fields in form layout (view mode + edit button)
  2. الموظفون: filtered employee table (name, title, status)
  3. المشاريع: filtered project table (name, status, progress, manager)
  4. المحاسبة: 4 KPI cards (إجمالي الأصول, إجمالي الخصوم, صافي حقوق الملكية, صافي الربح), mini chart
  5. المستودع: items assigned to this company
  6. الأرشيف: documents and comms for this company
- Consolidated view tab: compare all 11 companies side by side
- Private note on each company record
- Mock data for parent + 3 sample sub-companies
```

---

## PART B: Event Logs (سجل الأحداث)

### Overview
Immutable audit trail of everything that happens in the system.

### Log Entry Structure
```
EventLog {
  id: auto
  timestamp: DateTime (precise)
  user: User
  user_role: string
  company: Company
  
  module: ARCHIVE|WAREHOUSE|PROJECTS|HR|ACCOUNTING|COMPANIES|SETTINGS
  action: CREATE|READ|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT|PRINT|APPROVE|REJECT
  
  record_type: string       // e.g., "JournalEntry", "Employee", "WarehouseIN"
  record_id: string
  record_description: string
  
  ip_address: string
  device: string
  browser: string
  
  old_values?: JSON         // before change (for updates)
  new_values?: JSON         // after change
  
  status: SUCCESS|FAILED|WARNING
  error_message?: string
}
```

### Log Filters
- Date range
- User
- Company
- Module
- Action type
- Status (success/failed)

### Log Features
- **Cannot be deleted or edited** (immutable)
- Export to Excel/PDF
- Auto-archive logs older than 1 year to cold storage
- Real-time streaming (new logs appear without refresh)
- Diff view for UPDATE actions (before vs after)

---

### Claude Code Prompt (Event Logs)

```
Build the Event Logs module for an Arabic RTL ERP system using React + TypeScript + Tailwind.

Requirements:
- RTL layout, Arabic labels
- Header: "سجل الأحداث" with live indicator (green dot + "مباشر")
- Filters bar: date range picker, user dropdown, module selector, action type, status
- Main table with virtual scrolling (for large datasets):
  Columns: الوقت, المستخدم, الشركة, الوحدة, الإجراء, السجل, الحالة
- Status badges: نجاح (green) / فشل (red) / تحذير (yellow)
- Module badges with colors (محاسبة=blue, مستودع=orange, مشاريع=teal, etc.)
- Clicking a row expands to show full detail including old/new values diff
- Diff view: two-column comparison old (red background) vs new (green background)
- "تصدير" button: exports filtered results to Excel
- Stats bar at top: total today, successful, failed, warnings
- Mock 50 log entries with variety of actions
- Logs are read-only (no edit/delete buttons anywhere)
```

---

## PART C: Debug Window (نافذة التصحيح)

### Overview
Developer/admin tool for monitoring system health and debugging issues. Only visible to Super Admin and system users.

### Features

#### 1. System Status Panel
```
├── API Response Times (last 24h chart)
├── Database Connection Status
├── Memory Usage
├── Active Sessions Count
├── Pending Jobs Queue
└── Last Backup Time
```

#### 2. Error Console
- Real-time error stream
- Error levels: ERROR / WARN / INFO / DEBUG
- Stack traces (collapsible)
- Copy to clipboard
- Clear console
- Filter by level

#### 3. API Inspector
- Recent API calls
- Request/Response headers and body
- Response time histogram
- Failed calls highlighted

#### 4. Database Query Inspector
- Slow queries (>500ms) highlighted
- Query count per minute graph
- Most expensive queries list

#### 5. Active Users
- Who is logged in right now
- What page they're on
- Session duration
- Force logout button (admin)

#### 6. System Actions
- Clear cache
- Rebuild indexes
- Run health check
- Download full system log
- Toggle maintenance mode

---

### Claude Code Prompt (Debug Window)

```
Build the Debug Window module for an Arabic RTL ERP system using React + TypeScript + Tailwind.

Requirements:
- RTL layout with Arabic labels, BUT console/technical content in English/mixed
- Dark theme for this module (bg-gray-900 with green/amber text for terminal feel)
- Only visible to users with role "Super Admin" or "Developer"
- 6 panel tabs:
  1. حالة النظام: status cards grid showing API health (green/red), DB connection, memory %, sessions, queue size, last backup
  2. سجل الأخطاء: scrollable console log with color-coded entries (ERROR=red, WARN=yellow, INFO=blue, DEBUG=gray), clear button, filter by level
  3. مفتش API: table of recent API calls with method badge, endpoint, status code, response time (highlight >1000ms in red), timestamp
  4. استعلامات DB: list of recent queries, execution time bar, "بطيء" badge if >500ms
  5. المستخدمون النشطون: table showing username, role, current page, login time, IP, with "إنهاء الجلسة" button
  6. إجراءات النظام: buttons grid: مسح الكاش, إعادة بناء الفهارس, فحص الصحة, تحميل السجل الكامل, وضع الصيانة (toggle)
- Auto-refreshing every 10 seconds (show countdown)
- Mock real-time data that changes each refresh
- Warning: "هذه النافذة للمطورين والمديرين فقط" banner at top
```
