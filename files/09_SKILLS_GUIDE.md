# 🛠️ Skills & Reusable Components Guide

> These are the shared "skills" (reusable patterns) across all ERP modules.
> Build each once, reuse everywhere.

---

## 🔧 SKILL 01 — Arabic Data Table (RTL)

**Used in:** All modules  
**File:** `src/components/shared/ArabicTable.tsx`

```tsx
// Features:
// - RTL column order
// - Arabic pagination ("السابق" / "التالي")
// - Column sort with Arabic headers
// - Search input with Arabic placeholder
// - Row selection with checkbox
// - Action buttons per row (تعديل / حذف / عرض)
// - Export button (Excel / PDF)
// - Responsive: collapses to cards on mobile

interface ArabicTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchable?: boolean
  exportable?: boolean
  selectable?: boolean
  onRowClick?: (row: T) => void
  actions?: ActionDef<T>[]
  emptyMessage?: string
}
```

**Claude Code Prompt for this skill:**
```
Create a reusable ArabicTable component for an RTL Arabic ERP system.
[Full props above, implement with shadcn/ui Table, TanStack Table for sorting/pagination]
Arabic pagination labels, RTL-aware column ordering, Excel export via SheetJS
```

---

## 🔧 SKILL 02 — Arabic Form Builder

**Used in:** All create/edit forms  
**File:** `src/components/shared/ArabicForm.tsx`

```
Features:
- 2-column grid layout (RTL)
- Field types: text, textarea, number, date, select, multi-select, file upload, currency
- Arabic validation messages: "هذا الحقل مطلوب", "يجب أن يكون رقماً", etc.
- Auto-saves draft to localStorage
- Dirty state detection (warn before leaving)
- Print-friendly mode
```

---

## 🔧 SKILL 03 — Currency Input

**Used in:** Accounting, Warehouse, HR  
**File:** `src/components/shared/CurrencyInput.tsx`

```
Features:
- Currency selector: IQD / USD / EUR
- Auto-formats with thousand separators
- Arabic number display option (٠١٢٣ vs 0123)
- Exchange rate conversion (mock rates)
- Shows value in both currencies
```

---

## 🔧 SKILL 04 — Status Badge System

**Used in:** All modules  
**File:** `src/components/shared/StatusBadge.tsx`

```typescript
// Universal status types:
type Status = 
  // Projects
  | 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  // HR
  | 'ACTIVE_EMP' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'
  // Documents
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'
  // Warehouse
  | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  // Event Logs
  | 'SUCCESS' | 'FAILED' | 'WARNING'

// Arabic labels + color mapping built-in
```

---

## 🔧 SKILL 05 — Document Number Generator

**Used in:** Accounting, Warehouse, Archive  
**File:** `src/utils/docNumber.ts`

```typescript
// Format: [MODULE]-[COMPANY]-[YEAR]-[SEQUENCE]
// Examples:
//   ACC-CO1-2024-00001  (accounting)
//   WH-ABG-2024-00023   (warehouse أبو غريب)
//   PRJ-CO3-2024-00005  (project expense)

function generateDocNumber(module: string, company: string): string
function getNextSequence(module: string, company: string, year: number): number
```

---

## 🔧 SKILL 06 — Note Widget (Private Notes)

**Used in:** Every single page  
**File:** `src/components/notes/NoteWidget.tsx`  
*(Built in PROMPT 1 — reference it everywhere)*

---

## 🔧 SKILL 07 — Print Layout

**Used in:** Accounting reports, payslips, receipts  
**File:** `src/components/shared/PrintLayout.tsx`

```
Features:
- Company header with logo
- Arabic title and reference numbers
- Print-specific CSS (hides nav/sidebar)
- Page numbering in Arabic: "الصفحة ١ من ٣"
- Footer with date and user
- A4 / Letter size options
- Watermark option: "نسخة طباعة" / "سري"
```

---

## 🔧 SKILL 08 — File Upload & Preview

**Used in:** Archive, HR, Projects Diagrams, Warehouse  
**File:** `src/components/shared/FileUpload.tsx`

```
Features:
- Drag & drop zone (Arabic: "اسحب وأفلت الملفات هنا")
- Multiple file support
- Preview: images inline, PDF with page count, other files with icon
- File size display in Arabic: "١.٢ ميغابايت"
- Remove button
- Accepts: images, PDF, Word, Excel, CAD files
```

---

## 🔧 SKILL 09 — Company Context Selector

**Used in:** All modules (header)  
**File:** `src/components/layout/CompanySelector.tsx`

```
Features:
- Dropdown showing all 11 companies + "الكل" option
- Current selection persisted in Zustand + localStorage
- Switching company filters ALL data across ALL modules
- Shows company logo + name
- Quick switch keyboard shortcut
- "الكل" shows consolidated view
```

---

## 🔧 SKILL 10 — Dual-Language Field

**Used in:** Companies, Projects, Items  
**File:** `src/components/shared/BilingualField.tsx`

```
Features:
- Side-by-side Arabic + English inputs
- Arabic input: RTL, Arabic font
- English input: LTR, Latin font
- Both required or either required (configurable)
```

---

## 📐 Design System

### Colors (CSS Variables)
```css
--primary: #1a5f7a;       /* Navy blue - main brand */
--primary-light: #2d9cdb;  /* Lighter blue */
--accent: #e8a838;         /* Gold - Iraqi flag inspired */
--success: #27ae60;        /* Green */
--danger: #e74c3c;         /* Red */
--warning: #f39c12;        /* Orange */
--info: #3498db;           /* Blue */
--bg-dark: #0f172a;        /* Debug window bg */
```

### Typography
```css
--font-arabic: 'Cairo', 'Noto Sans Arabic', sans-serif;
--font-mono: 'Fira Code', monospace;  /* For debug window */
```

### Module Icon Map
```
Archive      → 📁 FolderOpen
Warehouse    → 🏭 Warehouse
Projects     → 📊 BarChart3
HR           → 👥 Users
Accounting   → 💰 Calculator
Companies    → 🏢 Building2
Event Logs   → 📋 ScrollText
Debug        → 🐛 Bug
```

---

## 🗂️ TypeScript Types (Global)

```typescript
// src/types/index.ts

export type UserRole = 
  'super_admin' | 'company_admin' | 'project_manager' | 
  'accountant' | 'hr_manager' | 'warehouse_manager' | 
  'employee' | 'viewer'

export type Currency = 'IQD' | 'USD' | 'EUR' | 'SAR' | 'TRY'

export type ModuleId = 
  'archive' | 'warehouse' | 'projects' | 'hr' | 
  'accounting' | 'companies' | 'eventlogs' | 'debug'

export type ActionType = 
  'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 
  'APPROVE' | 'REJECT' | 'EXPORT' | 'PRINT' |
  'LOGIN' | 'LOGOUT' | 'TRANSFER'

export interface User {
  id: string
  name_ar: string
  name_en: string
  email: string
  role: UserRole
  company_id: string
  permissions: string[]
  avatar?: string
}

export interface Company {
  id: string
  code: string
  name_ar: string
  name_en: string
  logo?: string
  type: 'PARENT' | 'SUBSIDIARY'
  parent_id?: string
  status: 'ACTIVE' | 'INACTIVE'
}
```

---

## 📝 Claude Code Skill Prompts

### For each skill, use this prompt pattern:

```
Create [SKILL NAME] for an Arabic RTL ERP system.

It should be:
- A reusable React TypeScript component
- Fully RTL with Arabic text
- Following Tailwind CSS + shadcn/ui patterns
- Exported with proper TypeScript props interface
- Tested with mock data
- Saved to src/components/shared/[ComponentName].tsx

[Specific requirements for this skill]
```
