# 🏢 ERP System — Master Overview
## نظام تخطيط موارد المؤسسة

---

## 📌 System Identity

| Field | Value |
|-------|-------|
| System Name | Company ERP System |
| Version | 1.0.0 |
| Language | Arabic (RTL) + English |
| Architecture | Single Page Application (SPA) |
| Companies | 11 sub-companies under 1 parent |

---

## 🗂️ Module Map

```
ERP Root
├── 📁 Archive          (الأرشيف)
├── 🏭 Warehouse        (المستودع)
├── 📊 Projects         (المشاريع)
├── 👥 HR               (الموارد البشرية)
├── 💰 Accounting       (المحاسبة)
├── 🏢 Companies        (الشركات)
├── 📋 Event Logs       (سجل الأحداث)
└── 🐛 Debug Window     (نافذة التصحيح)
```

---

## 🧱 Tech Stack Recommendation (Claude Code)

```
Frontend:
  - React 18 + TypeScript
  - Tailwind CSS (RTL support)
  - shadcn/ui components
  - React Router v6
  - Zustand (state management)
  - React Query (data fetching)

Backend (future):
  - Node.js / Express  OR  Python / FastAPI
  - PostgreSQL (relational data)
  - Redis (caching / sessions)

Tooling:
  - Vite (bundler)
  - i18next (Arabic/English)
```

---

## 🔐 Access Control Levels

| Level | Role | Access |
|-------|------|--------|
| 1 | Super Admin | Everything + Debug + All Companies |
| 2 | Company Admin | Own company + sub-modules |
| 3 | Project Manager | Assigned projects + their accounting |
| 4 | Accountant | Accounting module only |
| 5 | HR Manager | HR module only |
| 6 | Warehouse Manager | Warehouse module only |
| 7 | Employee | View own data + notes |
| 8 | Viewer | Read-only on assigned modules |

---

## 📝 Global Note System
Every page/window in the system includes a **private note field**:
- Not visible to all users (permission-based)
- Each note has: author, timestamp, module, record ID
- Notes are searchable within the archive
- Supports attachments (files/images)

---

## 🏗️ File Structure (Claude Code Project)

```
/erp-system
├── /src
│   ├── /modules
│   │   ├── /archive
│   │   ├── /warehouse
│   │   ├── /projects
│   │   ├── /hr
│   │   ├── /accounting
│   │   ├── /companies
│   │   ├── /eventlogs
│   │   └── /debug
│   ├── /components
│   │   ├── /ui (shadcn)
│   │   ├── /layout
│   │   ├── /shared
│   │   └── /notes      ← global note widget
│   ├── /store          (Zustand)
│   ├── /hooks
│   ├── /utils
│   └── /types
├── /public
└── package.json
```

---

## 📄 Document Index

| File | Description |
|------|-------------|
| `00_ERP_OVERVIEW.md` | This file — master plan |
| `01_ARCHIVE_MODULE.md` | Archive module spec |
| `02_WAREHOUSE_MODULE.md` | Warehouse module spec |
| `03_PROJECTS_MODULE.md` | Projects module spec |
| `04_HR_MODULE.md` | HR module spec |
| `05_ACCOUNTING_MODULE.md` | Accounting + chart of accounts |
| `06_COMPANIES_MODULE.md` | Multi-company management |
| `07_EVENTLOGS_DEBUG.md` | Logs + debug window |
| `08_CLAUDE_CODE_PROMPTS.md` | Ready-to-use Claude Code prompts |
| `09_SKILLS_GUIDE.md` | Skills and reusable components |
