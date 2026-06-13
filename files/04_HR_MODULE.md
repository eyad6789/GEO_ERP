# 👥 Module 04 — HR (الموارد البشرية)

---

## Overview
Complete employee lifecycle management — from hiring to exit — with hierarchy, gifts, payroll, and personal records.

---

## 👤 Employee Master Record

```
Employee {
  // Identity
  id: auto
  employee_number: string       // الرقم الوظيفي
  national_id: string           // رقم الهوية الوطنية
  full_name_ar: string          // الاسم الكامل بالعربي
  full_name_en: string
  photo: Image
  date_of_birth: Date
  place_of_birth: string
  nationality: string
  religion: string
  gender: Male|Female
  marital_status: string
  children_count: number
  
  // Contact
  phone_primary: string
  phone_secondary: string
  email_work: string
  email_personal: string
  address: string
  emergency_contact: { name, relation, phone }
  
  // Employment
  company: Company
  department: Department
  job_title: string             // المسمى الوظيفي
  employment_type: Full|Part|Contract|Temp
  hire_date: Date
  probation_end_date: Date
  contract_end_date?: Date
  status: ACTIVE|ON_LEAVE|SUSPENDED|TERMINATED
  manager: Employee             // المدير المباشر (hierarchy)
  
  // Financial
  basic_salary: number
  salary_currency: string
  bank_name: string
  bank_account: string
  iban: string
  
  // Documents
  cv_file: File
  id_copy: File
  contract_file: File
  certificates: File[]
  
  notes: string (private)
}
```

---

## 📊 Sub-Sections

### 1. Employee List (قائمة الموظفين)
- Full searchable table
- Filter by: company, department, status, employment type
- Quick view card + full detail view
- Export to Excel

### 2. Organizational Hierarchy (الهيكل التنظيمي)
- Visual tree/org chart
- Drag to reorganize
- Shows: Photo, Name, Title, Department
- Zoom in/out
- Export as image

### 3. Departments (الأقسام)
```
Department {
  id, name_ar, name_en
  parent_department?: Department   // for sub-departments
  manager: Employee
  company: Company
  employee_count: (auto-calc)
  notes (private)
}
```

### 4. Attendance (الحضور والغياب)
- Daily attendance tracking
- Types: حاضر / غائب / إجازة / مأمورية / عطلة رسمية
- Monthly summary per employee
- Late arrivals / early departures

### 5. Leave Management (الإجازات)
```
Leave {
  employee
  type: سنوية|مرضية|أمومة|بدون راتب|اضطرارية|...
  start_date, end_date
  days_count: auto
  reason
  status: PENDING|APPROVED|REJECTED
  approved_by: Employee
  notes (private)
}
```

### 6. Gifts & Benefits (الهدايا والمزايا)
```
Gift {
  employee
  date
  occasion: عيد|رمضان|ترقية|سنوي|مناسبة خاصة|...
  type: نقدي|عيني|قسيمة|...
  value: number
  currency
  description
  given_by: Employee
  notes (private)
}
```

### 7. Payroll (الرواتب)
- Monthly payroll run
- Per employee: basic + allowances - deductions
- Fields: الراتب الأساسي, بدل سكن, بدل نقل, بدل هاتف, ساعات إضافية, غيابات, سلف, اقتطاعات, الصافي
- Print payslip per employee
- Bank transfer file export

### 8. Advances (السلف)
```
Advance {
  employee
  date
  amount
  currency
  reason
  repayment_plan: { monthly_deduction, start_month }
  status: PENDING|APPROVED|REPAYING|SETTLED
  balance_remaining: auto-calc
  notes (private)
}
```

### 9. Performance (التقييم)
- Annual/semi-annual reviews
- Rating: 1–5 per category
- Manager comments
- Employee self-assessment
- Goals for next period

---

## Hierarchy Tree Structure
```
CEO
├── Company A Manager
│   ├── Department Head
│   │   ├── Team Lead
│   │   │   ├── Employee
│   │   │   └── Employee
│   │   └── Team Lead
│   └── Department Head
└── Company B Manager
    └── ...
```

---

## UI Layout
```
┌──────────────────────────────────────────────────────┐
│  الموارد البشرية                    [+ موظف جديد]    │
├──────────┬───────────────────────────────────────────┤
│ قائمة   │ الهيكل| الأقسام| الحضور| الإجازات|       │
│ الموظفين│ الهدايا| الرواتب| السلف| التقييم           │
├──────────┤                                           │
│ 🔍Filter │  Content Area                             │
│ شركة    │  + Private Note Widget on every record     │
│ قسم     │                                           │
│ الحالة  │                                           │
└──────────┴───────────────────────────────────────────┘
```

---

## Claude Code Prompt (HR Module)

```
Build the HR module for an Arabic RTL ERP system using React + TypeScript + Tailwind CSS.

Requirements:
- RTL layout, Arabic labels
- Main view: employee cards grid with photo placeholder, name, title, department, status badge
- Left sidebar filters: by company, department, employment type, status
- Employee detail page (full-screen dialog or dedicated route) with tabs:
  1. البيانات الشخصية: all personal fields in a 2-column form layout
  2. التوظيف: hire date, company, department, manager, contract type, salary
  3. الحضور: monthly calendar with daily status color coding (حاضر=green, غياب=red, إجازة=blue)
  4. الإجازات: table of leave requests + "طلب إجازة جديدة" button
  5. الهدايا والمزايا: table of gifts: التاريخ, المناسبة, النوع, القيمة, ملاحظة
  6. الراتب: monthly payslip breakdown table + print button
  7. السلف: advances table with balance remaining + new advance form
  8. التقييم: rating form with 5 categories, each 1-5 stars
- Org chart tab in the main HR view: visual tree using nested boxes/cards
- Department management tab: list of departments with manager and count
- Private note widget on every record and every tab
- Mock 8 employees across 3 departments
- Use shadcn/ui components, Avatar for photos
```
