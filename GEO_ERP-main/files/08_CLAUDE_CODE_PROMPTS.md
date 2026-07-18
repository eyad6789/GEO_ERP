# 🤖 Claude Code Prompts — ERP Build Sequence

> Use these prompts **in order** inside Claude Code. Each builds on the previous.

---

## ⚡ PROMPT 0 — Project Initialization

```
Create a new React + TypeScript + Vite project called "erp-system" with:
- Tailwind CSS configured for RTL support
- shadcn/ui initialized with all components
- React Router v6
- Zustand for state management
- i18next for Arabic/English support (Arabic as default, RTL)
- Directory structure:
  src/
    modules/ (archive, warehouse, projects, hr, accounting, companies, eventlogs, debug)
    components/ (ui, layout, shared, notes)
    store/
    hooks/
    utils/
    types/

Configure Tailwind with:
  - dir="rtl" on html element
  - Arabic font (Noto Sans Arabic or Cairo) via Google Fonts
  - Custom CSS variables for brand colors

Create a base Layout component with:
  - Top navigation bar with logo and user menu
  - Left sidebar (in RTL = right side) with module icons and labels
  - Main content area
  - The 8 module links: الأرشيف, المستودع, المشاريع, الموارد البشرية, المحاسبة, الشركات, سجل الأحداث, نافذة التصحيح
  - Active state highlighting on current module
  - Notification bell icon
  - User avatar + company name in header
```

---

## ⚡ PROMPT 1 — Global Note Widget

```
Create a reusable NoteWidget component for the ERP system.

Location: src/components/notes/NoteWidget.tsx

Requirements:
- Shows a "📝 ملاحظة خاصة" button/trigger
- Opens a panel/popover with:
  * Textarea for note content (Arabic placeholder: "أضف ملاحظتك هنا...")
  * Visibility selector: عام (للجميع) / محدد (بحسب الصلاحية) / خاص (للمدير فقط)
  * Save button: "حفظ الملاحظة"
  * Previous notes list (if any) showing: author, date, content, visibility badge
- The visibility warning: "⚠️ الملاحظات الخاصة لا تظهر لجميع المستخدمين"
- Props: { moduleId, recordId, currentUser, userRole }
- TypeScript types: Note { id, content, visibility, author, timestamp, moduleId, recordId }
- Mock store using Zustand
- RTL layout throughout
```

---

## ⚡ PROMPT 2 — Archive Module

```
Build the Archive module at src/modules/archive/

[PASTE FULL CONTENT OF 01_ARCHIVE_MODULE.md Claude Code Prompt here]

Additional requirements:
- Import and use the NoteWidget component on every record detail view
- All mock data should be realistic Arabic company data
- Consistent with the base layout from PROMPT 0
```

---

## ⚡ PROMPT 3 — Warehouse Module

```
Build the Warehouse module at src/modules/warehouse/

[PASTE FULL CONTENT OF 02_WAREHOUSE_MODULE.md Claude Code Prompt here]

Additional requirements:
- Import and use the NoteWidget component
- Link warehouse transactions to company selector (use mock companies from PROMPT 0)
- The transfer form between WH-01 and WH-02 should update stock counts in real-time (mock)
```

---

## ⚡ PROMPT 4 — Projects Module

```
Build the Projects module at src/modules/projects/

[PASTE FULL CONTENT OF 03_PROJECTS_MODULE.md Claude Code Prompt here]

Additional requirements:
- Import and use the NoteWidget on every sub-module
- The project accounting sub-module should use the same chart of accounts constants (create src/constants/chartOfAccounts.ts)
- Project selection in warehouse/accounting modules should pull from this module's project list
```

---

## ⚡ PROMPT 5 — Chart of Accounts Constants

```
Create src/constants/chartOfAccounts.ts with the full Iraqi company chart of accounts.

The accounts should be structured as:
type Account = {
  code: string
  name_ar: string
  name_en: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  normal_balance: 'DEBIT' | 'CREDIT'
  parent_code?: string
  level: 1 | 2 | 3 | 4
  is_posting: boolean  // false for summary accounts, true for leaf accounts
}

Include ALL accounts from the chart below:
[PASTE THE FULL CHART OF ACCOUNTS FROM 05_ACCOUNTING_MODULE.md]

Also create:
- A helper function getAccountsByType(type)
- A helper function buildAccountTree() that returns nested structure
- A helper function searchAccounts(query) for the dropdown
- A helper function getAccountFullPath(code) that returns "أصول > أصول متداولة > النقدية"
```

---

## ⚡ PROMPT 6 — Accounting Module

```
Build the Accounting module at src/modules/accounting/

[PASTE FULL CONTENT OF 05_ACCOUNTING_MODULE.md Claude Code Prompt here]

Additional requirements:
- Import chartOfAccounts from src/constants/chartOfAccounts.ts
- The account selector in journal entries should be a searchable combobox showing full path
- Auto-validate: debit total must equal credit total before allowing save
- Entries linked to a project should be filterable in the project accounting sub-module
- The NoteWidget on every entry
- Currency selector: IQD (دينار عراقي), USD (دولار أمريكي), EUR (يورو)
```

---

## ⚡ PROMPT 7 — HR Module

```
Build the HR module at src/modules/hr/

[PASTE FULL CONTENT OF 04_HR_MODULE.md Claude Code Prompt here]

Additional requirements:
- Import and use NoteWidget everywhere
- The org chart should be a visual tree built with pure CSS/SVG (no external library needed)
- Employee records link to: accounting (salary accounts), projects (assigned projects), warehouse (no direct link)
- Leave balance auto-calculation: annual leave starts at 30 days/year, deducted per approved leave
```

---

## ⚡ PROMPT 8 — Companies Module

```
Build the Companies module at src/modules/companies/

[PASTE FULL CONTENT OF 06_COMPANIES_LOGS_DEBUG.md PART A prompt here]

Additional requirements:
- The 11 companies should be seeded in the Zustand store at app startup
- Company data is used in ALL other modules as a dropdown
- The consolidated view should show a comparison table: all 11 companies × key metrics
- NoteWidget on each company
```

---

## ⚡ PROMPT 9 — Event Logs Module

```
Build the Event Logs module at src/modules/eventlogs/

[PASTE FULL CONTENT OF 06_COMPANIES_LOGS_DEBUG.md PART B prompt here]

Additional requirements:
- Create a useEventLog() hook that other modules call to log their actions automatically:
  logEvent({ module, action, recordType, recordId, description, oldValues?, newValues? })
- Hook into the Zustand store so that any state change in any module creates a log entry
- The log viewer should support infinite scroll or virtualized list for performance
```

---

## ⚡ PROMPT 10 — Debug Window

```
Build the Debug Window module at src/modules/debug/

[PASTE FULL CONTENT OF 06_COMPANIES_LOGS_DEBUG.md PART C prompt here]

Additional requirements:
- Only render this route if user role === 'super_admin' or 'developer'
- The error console should pick up any JavaScript console.error() calls
- System status should pull real metrics: window.performance, navigator info
- The active users list comes from Zustand store
```

---

## ⚡ PROMPT 11 — Integration & Polish

```
Now integrate all modules of the ERP system:

1. ROUTING: Set up React Router with these routes:
   / → redirect to /dashboard
   /dashboard → overview page with stats from all modules
   /archive/* → Archive module
   /warehouse/* → Warehouse module  
   /projects/* → Projects module
   /hr/* → HR module
   /accounting/* → Accounting module
   /companies/* → Companies module
   /logs → Event Logs module
   /debug → Debug Window (protected, super_admin only)

2. DASHBOARD: Create a home dashboard with:
   - 8 KPI cards (one per module with key metric)
   - Recent activity feed (last 10 event log entries)
   - Quick action buttons: إضافة قيد, إضافة موظف, إضافة مشروع, طلب مستودع
   - Alerts: low stock items, pending leave requests, entries awaiting approval
   - Company selector at top (switches context for all modules)

3. CROSS-MODULE LINKS: Ensure:
   - Project accounting links back to main accounting
   - Employee records link to their payroll journal entries
   - Warehouse OUT transactions link to projects
   - Archive "Money" items link to accounting documents

4. GLOBAL SEARCH: Header search bar that searches across:
   - Employees (by name)
   - Projects (by name/code)
   - Accounting entries (by document number)
   - Archive items (by title/reference)
   Results grouped by module with icons

5. FINAL POLISH:
   - Loading skeletons for all tables
   - Empty states with helpful Arabic messages
   - Error boundaries with Arabic error messages
   - Toast notifications for save/delete/approve actions
   - Confirm dialogs for destructive actions
   - Print CSS for accounting reports
   - Keyboard shortcuts: Ctrl+N = new record, Ctrl+F = search, Esc = close dialog
```

---

## ⚡ PROMPT 12 — Sample Data Seed

```
Create src/data/seed.ts with comprehensive mock data for the entire ERP:

Companies (11 sub + 1 parent):
- الشركة الأم للإنشاءات
- شركة المشاريع الهندسية
- شركة التوريدات والمشتريات
- شركة الصيانة والتشغيل
- شركة الاستشارات الفنية
- [6 more with realistic Iraqi company names]

Employees: 25 employees across companies, with full data, different roles

Projects: 5 active projects with all sub-module data populated

Accounting: 30 journal entries properly balanced

Warehouse items: 20 items across both warehouses with movement history

Archive: 10 records per section

Event Logs: 100 historical log entries

Use realistic Iraqi Arabic names, Iraqi Dinar (IQD) as primary currency, Iraqi cities for locations.
```
