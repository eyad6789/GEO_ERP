# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# GEO_ERP_System

Arabic-first (RTL, AR/EN toggle) demo ERP for an Iraqi construction/engineering group (1 parent + 11 subsidiaries). Active demo build — no auth, role switcher is cosmetic. The backend is intentionally simple but operations are *real*: data persists, journals must balance, stock moves, reports compute live, every write is audit-logged.

## Stack
- TypeScript end-to-end; Node run via `tsx` (no compile step for server)
- Frontend: React 18 + Vite 5 + Tailwind CSS 3 (RTL), React Router 6, Recharts, lucide-react
- Backend: Express 4 + better-sqlite3 (DB file `server/data/erp.db`, gitignored); `exceljs` for fleet Excel import
- `@` path alias → `./src` (vite.config.ts + tsconfig.json)

## Structure
- `server/index.ts` — backend entry: Express API, serves `dist/` SPA in prod
- `server/routes/` — `resource.ts` = generic `/api/:resource` CRUD; plus computed endpoints: `dashboard.ts`, `accounting.ts`, `reports.ts`, `warehouse.ts`, `fleet.ts`, `vehicleAccounting.ts`, `vehicleDocs.ts`
- `server/db/` — `schema.sql` (all tables) + `connection.ts`
- `server/seed/` — `seed.ts` deterministic generator + `chartOfAccounts.ts`; fleet seeding split out: `fleetData.ts`, `fleetCosts.ts`, `seedFleetOnly.ts`
- `server/lib/eventLog.ts` — every write appends an immutable audit row; `ids.ts` — id generation
- `src/main.tsx` — frontend entry; `src/App.tsx` assembles router from per-module routes
- `src/modules/<name>/` — one folder per module (dashboard, companies, projects, hr, accounting, warehouse, vehicles, archive, eventlogs, debug), each exports `routes.tsx`
- `src/components/{ui,shared,layout,notes}` — hand-rolled component library; `src/hooks/` — `useResource` data hook
- `src/i18n/strings.ts` + `src/context/LangContext.tsx` — lightweight i18n; `src/config/nav.ts` — nav + module locking (`isModuleLocked`) + `LANDING_PATH`
- `deploy/deploy.sh` — one-shot Ubuntu deploy (systemd + nginx); `files/` — original planning/spec markdown docs; `AUDIT.md` — prior audit notes

## Commands
- Install: `npm install`
- Seed DB (reproducible, resets demo): `npm run seed`
- Seed only the fleet/vehicle data + costs: `npm run seed:fleet`
- Dev (API :4000 + Vite :5173 together): `npm run dev` (runs `npm:server` + `npm:client` via concurrently)
- Build frontend: `npm run build`
- Prod (single process, serves dist + API): `npm run start`
- Typecheck: `npm run typecheck`
- No tests exist

## Conventions & Gotchas
- **Local dev needs Node 20.** The machine default is Node 26, which can't build the `better-sqlite3` native module — put `node@20` on PATH before `npm install` / `npm run dev`.
- Ports: API 4000, Vite dev 5173 (proxies `/api` → 4000). Env var NAMES: `PORT`, `HOST`; deploy script: `SERVER_NAME`, `APP_PORT`, `RUN_USER`, `FORCE_SEED`
- Journal entries must balance (Σdebit = Σcredit) — server rejects unbalanced; warehouse transactions actually move stock
- Special API routers mount BEFORE generic `resourceRouter` in `server/index.ts` — order matters
- Locked modules keep their URL paths but render `LockedPage` (see `gate()` in App.tsx)
- Server runs devDeps at runtime (tsx, vite) — do NOT set NODE_ENV=production for install
- All UI text is bilingual via `src/i18n/strings.ts` (and per-module `strings.ts`) — add both AR and EN keys
- Companies/projects/chart-of-accounts in prod are REAL data — never delete, overwrite, or reseed prod `server/data`

## Do NOT read (large/irrelevant; also denied in .claude/settings.json)
- `node_modules/`, `dist/` (built bundle, ~1 MB JS), `package-lock.json`
- `server/data/` (SQLite db + WAL files)
- Root binaries: `QEG 2024.pdf` (~95 MB), `*.xlsx` (~600 KB fleet maintenance ledger), `*.jpeg`/`*.png` screenshots, `public/qeg-logo.png`
- `files/erp-system-plan/` (duplicate copy of the `files/*.md` planning docs)
