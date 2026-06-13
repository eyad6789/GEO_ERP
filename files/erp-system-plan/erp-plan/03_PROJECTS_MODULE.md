# 📊 Module 03 — Projects (المشاريع)

---

## Overview
Each project is a self-contained mini-ERP with its own sub-modules. Projects are linked to companies and can span multiple warehouses.

---

## 🗂️ Project Sub-Modules

Each project contains:
1. **Accounting** — محاسبة المشروع
2. **Timeline** — الجدول الزمني
3. **Schedules** — الجداول
4. **Machinery / Equipment** — الآليات
5. **Warehouse** — مستودع المشروع
6. **Staff** — طاقم العمل
7. **Expenditures** — الصرفيات
8. **Diagrams** — المخططات

---

## 📋 Project Master Record

```
Project {
  id: auto
  code: string              // رمز المشروع
  name_ar: string           // اسم المشروع بالعربي
  name_en: string
  company: Company          // الشركة المنفذة
  client: string            // جهة العقد
  contract_number: string   // رقم العقد
  contract_value: number    // قيمة العقد
  currency: string
  start_date: Date
  end_date: Date
  actual_end_date?: Date
  status: PLANNING|ACTIVE|ON_HOLD|COMPLETED|CANCELLED
  manager: Employee         // مدير المشروع
  location: string          // موقع المشروع
  description: string
  notes: string (private)
}
```

---

## Sub-Module Details

### 1. Project Accounting (محاسبة المشروع)
- Uses the same chart of accounts from the main accounting module
- Filtered by project
- Shows: Budget vs Actual
- Fields per transaction: same as main accounting (مدين, دائن, شركة, مشروع, الحساب, البيان, العملة, السعر, القيمة, رقم التسلسلي, رقم الوثيقة)

### 2. Timeline (الجدول الزمني)
- Gantt chart view
- Milestones (معالم)
- Dependencies between tasks
- Actual vs Planned progress bar

### 3. Schedules (الجداول)
- Work schedules / shifts
- Weekly/Monthly calendar view
- Assign employees to shifts
- Track attendance against schedule

### 4. Machinery / Equipment (الآليات)
```
Equipment {
  code, name, type
  assigned_date, return_date
  operator: Employee
  hours_worked
  fuel_consumed
  maintenance_log[]
  location (GPS optional)
  notes (private)
}
```

### 5. Project Warehouse (مستودع المشروع)
- Items assigned/issued to this project
- Pull from WH-01 or WH-02
- Track consumption per task/phase
- Return unused materials

### 6. Staff (طاقم العمل)
- Employees assigned to project
- Role on project (not company role)
- Start/End assignment date
- Daily attendance
- Linked to HR module

### 7. Expenditures (الصرفيات)
```
Expenditure {
  serial_number             // رقم التسلسلي
  doc_number                // رقم الوثيقة
  date
  category: (مواد/عمالة/معدات/إداري/أخرى)
  description
  amount
  currency
  paid_to: string
  payment_method
  approved_by: Employee
  receipt_attachment: File
  notes (private)
}
```

### 8. Diagrams (المخططات)
- Upload/view engineering drawings
- CAD files, PDFs, images
- Version control (v1, v2...)
- Comments/markup per diagram
- Notes (private)

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  المشاريع                           [+ مشروع جديد]  │
├─────────────────────────────────────────────────────┤
│  Projects Grid Cards (status badge, progress bar)   │
└─────────────────────────────────────────────────────┘

When project selected:
┌────────────┬────────────────────────────────────────┐
│ Project    │  Sub-module Tabs:                       │
│ Info Panel │  محاسبة | جدول زمني | جداول | آليات   │
│            │  مستودع | طاقم | صرفيات | مخططات      │
│            ├────────────────────────────────────────┤
│            │  Sub-module Content Area               │
│            │  + Note Widget (private)               │
└────────────┴────────────────────────────────────────┘
```

---

## Claude Code Prompt (Projects Module)

```
Build the Projects module for an Arabic RTL ERP system using React + TypeScript + Tailwind CSS.

Requirements:
- RTL layout, Arabic labels
- Projects list page: grid of project cards showing: name, company, status badge (تخطيط/نشط/متوقف/منجز), progress bar, manager, start/end date
- Clicking a project opens the project detail page with 8 sub-module tabs:
  1. محاسبة: accounting table with columns: رقم التسلسلي, رقم الوثيقة, التاريخ, الحساب, البيان, مدين, دائن, العملة, الشركة
  2. الجدول الزمني: simple Gantt-style list with task name, start, end, % complete, progress bar
  3. الجداول: weekly calendar grid showing staff assignments
  4. الآليات: table of equipment: الكود, الاسم, النوع, المشغل, ساعات العمل, الحالة
  5. المستودع: items issued to project: الصنف, الكمية, التاريخ, المستودع المصدر
  6. طاقم العمل: assigned staff table: الاسم, الدور, تاريخ الانتداب, الحالة
  7. الصرفيات: expenditures table: رقم التسلسلي, رقم الوثيقة, التاريخ, الفئة, البيان, المبلغ, العملة, المعتمد من
  8. المخططات: file/image grid with upload button, version tag, comments count
- Every sub-module page has a private Note widget
- Mock 3 projects with sample data in each sub-module
- "+ مشروع جديد" button opens creation form
- Use shadcn/ui components
```
