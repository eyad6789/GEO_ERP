# 🚀 ERP System — Quick Start Guide
## دليل البدء السريع

---

## 📦 What's in this Package

| File | What it is |
|------|------------|
| `00_ERP_OVERVIEW.md` | Architecture, tech stack, module map |
| `01_ARCHIVE_MODULE.md` | Archive: CVs, messages, emails, news, money |
| `02_WAREHOUSE_MODULE.md` | Warehouse: أبو غريب & الدورة locations |
| `03_PROJECTS_MODULE.md` | Projects with 8 sub-modules each |
| `04_HR_MODULE.md` | Full HR: employees, hierarchy, gifts, payroll |
| `05_ACCOUNTING_MODULE.md` | **Complete chart of accounts (from your PDF)** + journal entries |
| `06_COMPANIES_LOGS_DEBUG.md` | 11 companies + event logs + debug window |
| `08_CLAUDE_CODE_PROMPTS.md` | **12 sequential prompts to build the entire system** |
| `09_SKILLS_GUIDE.md` | Reusable components and design system |

---

## ⚡ How to Use with Claude Code

### Option A: Full Build (Recommended)
Open Claude Code and run the prompts from `08_CLAUDE_CODE_PROMPTS.md` **in order**:
1. PROMPT 0 — Project setup
2. PROMPT 1 — Note widget (global)
3. PROMPTS 2–10 — Each module
4. PROMPT 11 — Integration
5. PROMPT 12 — Seed data

### Option B: Build One Module at a Time
Go to the specific module file, copy the **Claude Code Prompt** section at the bottom, and paste into Claude Code.

### Option C: Quick Preview
If you just want to see a working sample, start with PROMPT 0 + PROMPT 6 (Accounting) as it's the most complete module with the full chart of accounts from your PDF.

---

## 📋 The Accounting Chart (from your PDF)

Your PDF (الدليل المحاسبي) has been fully extracted and structured in `05_ACCOUNTING_MODULE.md`:
- **Class 1:** الأصول (Assets) — accounts 1000–1399
- **Class 2:** الخصوم (Liabilities) — accounts 2000–2299
- **Class 3:** حقوق الملكية (Equity) — accounts 3000–3599
- **Class 4:** الإيرادات (Revenue) — accounts 4000–4399
- **Class 5:** المصروفات (Expenses) — accounts 5000–5599

PROMPT 5 in `08_CLAUDE_CODE_PROMPTS.md` will build this into a TypeScript constants file that all modules can use.

---

## 🔑 Key System Features

- ✅ **11 companies** under 1 parent — all manageable from one login
- ✅ **Private notes** on every single page/record
- ✅ **Full double-entry accounting** with your exact chart of accounts
- ✅ **Two warehouses**: أبو غريب + الدورة
- ✅ **Projects** with their own accounting, warehouse, staff, expenses
- ✅ **Complete HR** with hierarchy, gifts, leave, payroll
- ✅ **Immutable event logs** — audit trail for everything
- ✅ **Debug window** for admins only
- ✅ **Arabic RTL** throughout

---

## 🛠️ Suggested Build Order for a Demo

If time is limited, build in this priority order:

1. **Layout + Navigation** (30 min) — PROMPT 0
2. **Accounting** (1 hour) — PROMPTS 5 + 6  ← most critical for business
3. **Companies** (30 min) — PROMPT 8  ← needed by all modules
4. **Projects** (1 hour) — PROMPT 4
5. **HR** (1 hour) — PROMPT 7
6. **Warehouse** (45 min) — PROMPT 3
7. **Archive** (30 min) — PROMPT 2
8. **Logs + Debug** (30 min) — PROMPTS 9 + 10
9. **Integration** (1 hour) — PROMPT 11

**Total estimated time with Claude Code: ~7 hours of prompting**
