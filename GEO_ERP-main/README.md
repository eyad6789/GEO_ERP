# GEO ERP System — نظام تخطيط موارد المؤسسة

A **demo** ERP for an Iraqi construction/engineering group (1 parent + 11 subsidiary companies).
Arabic-first (RTL) with a one-click **AR/EN** toggle. No login — it opens straight on the dashboard.

> This is a sample build to showcase the full vision. The backend is intentionally simple
> (Express + SQLite) but the operations are **real**: data persists, journals must balance,
> stock moves, reports are computed live, and every write is audit-logged.

## Run it

```bash
npm install
npm run seed     # builds server/data/erp.db with deterministic dummy data
npm run dev      # Express API on :4000 + Vite app on :5173
```

Then open **http://localhost:5173** — lands on the Arabic dashboard. Use the **EN** button in the
header to flip the whole UI to English (LTR). Use the company selector to scope data to one company.

`npm run seed` is reproducible — re-run it any time to reset the demo to a clean state.

## What's inside (9 modules)

| Module | الوحدة | Highlights |
|---|---|---|
| Dashboard | لوحة التحكم | KPI cards, alerts, revenue/expense + status + headcount charts, activity feed |
| Companies | الشركات | Parent hero + 11 subsidiary cards, 6-tab company detail with live P&L |
| Projects | المشاريع | Project cards + detail shell with 8 sub-tabs (Gantt timeline, machinery, staff, expenditures, diagrams…) |
| HR | الموارد البشرية | 9 sections: employees, **org chart**, departments, attendance, leave, payroll, advances, gifts, performance |
| Accounting | المحاسبة | Journal (balanced double-entry), full chart of accounts tree, Trial Balance, Income Statement, Balance Sheet |
| Warehouse | المستودع | Items with live stock, IN/OUT/TRANSFER/RETURN/ADJUST transactions that move stock, low-stock alerts |
| Archive | الأرشيف | 6 document types (CVs, messages, emails, news, financial), search, private notes |
| Event Logs | سجل الأحداث | Immutable audit trail with diff view, filters, export |
| Debug | نافذة التصحيح | Dark ops panel: live API latency, error console, API inspector, system actions |

Every record supports a private **note widget**. Statuses, currencies (IQD/USD/EUR/SAR/TRY), and
dates are formatted per the active language.

## Real operations (try them)

- **Accounting → قيد جديد:** add a journal entry. An unbalanced entry (Σdebit ≠ Σcredit) is rejected.
- **Warehouse → حركة جديدة:** an OUT/TRANSFER actually decrements/moves stock; low-stock alerts update.
- Any create/update/delete writes an immutable row to **Event Logs** automatically.
- Trial Balance, Income Statement and Balance Sheet are computed live and **balance**.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (RTL), React Router, Recharts, lucide-react.
  Hand-rolled component library, lightweight i18n + one `useResource` data hook.
- **Backend:** Node + Express + better-sqlite3. One generic `/api/:resource` CRUD router + a few
  computed endpoints (dashboard, accounting reports, warehouse stock). DB: `server/data/erp.db`.

## Project layout

```
server/
  db/schema.sql            all tables
  routes/                  resource.ts (generic CRUD) + dashboard/accounting/reports/warehouse
  seed/                    chartOfAccounts.ts + seed.ts (deterministic generator)
src/
  components/{ui,shared,layout,notes}   shared component library
  hooks/ context/ i18n/ lib/ config/ types/
  modules/<name>/          one folder per module (dashboard, companies, projects, hr,
                           accounting, warehouse, archive, eventlogs, debug)
```

_Demo build — not production. No authentication; the role switcher in the header is cosmetic._
