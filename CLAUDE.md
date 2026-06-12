# GEO_ERP_System

Arabic-first (RTL, AR/EN toggle) demo ERP for an Iraqi construction/engineering group (1 parent + 11 subsidiaries). Active demo build — no auth, role switcher is cosmetic.

## Stack
- TypeScript end-to-end; Node 18+ run via `tsx` (no compile step for server)
- Frontend: React 18 + Vite 5 + Tailwind CSS 3 (RTL), React Router 6, Recharts, lucide-react
- Backend: Express 4 + better-sqlite3 (DB file `server/data/erp.db`, gitignored)
- `@` path alias → `./src` (vite.config.ts + tsconfig.json)

## Structure
- `server/index.ts` — backend entry: Express API, serves `dist/` SPA in prod
- `server/routes/` — `resource.ts` = generic `/api/:resource` CRUD; plus dashboard/accounting/reports/warehouse computed endpoints
- `server/db/` — `schema.sql` (all tables) + `connection.ts`
- `server/seed/` — `seed.ts` deterministic data generator + `chartOfAccounts.ts`
- `server/lib/eventLog.ts` — every write appends an immutable audit row
- `src/main.tsx` — frontend entry; `src/App.tsx` assembles router from module routes
- `src/modules/<name>/` — one folder per module (dashboard, companies, projects, hr, accounting, warehouse, archive, eventlogs, debug), each exports `routes.tsx`
- `src/components/{ui,shared,layout,notes}` — hand-rolled component library
- `src/i18n/strings.ts` + `src/context/LangContext.tsx` — lightweight i18n; `src/config/nav.ts` — nav + module locking (`isModuleLocked`) + `LANDING_PATH`
- `deploy/deploy.sh` — one-shot Ubuntu deploy (systemd + nginx); `files/` — original planning/spec markdown docs

## Commands
- Install: `npm install`
- Seed DB (reproducible, resets demo): `npm run seed`
- Dev (API :4000 + Vite :5173 together): `npm run dev`
- Build frontend: `npm run build`
- Prod (single process, serves dist + API): `npm run start`
- Typecheck: `npm run typecheck`
- No tests exist

## Conventions & Gotchas
- Ports: API 4000, Vite dev 5173 (proxies `/api` → 4000). Env var NAMES: `PORT`, `HOST`; deploy script: `SERVER_NAME`, `APP_PORT`, `RUN_USER`, `FORCE_SEED`
- Journal entries must balance (Σdebit = Σcredit) — server rejects unbalanced; warehouse transactions actually move stock
- Special API routers mount BEFORE generic `resourceRouter` in server/index.ts — order matters
- Locked modules keep their URL paths but render `LockedPage` (see `gate()` in App.tsx)
- Server runs devDeps at runtime (tsx, vite) — do NOT set NODE_ENV=production for install
- Not a git repo (has .gitignore but no .git initialized)
- All UI text is bilingual via `src/i18n/strings.ts` — add both AR and EN keys

## Do NOT read (large/irrelevant; also denied in .claude/settings.json)
- `node_modules/`, `dist/` (built bundle, ~1 MB JS), `package-lock.json`
- `server/data/` (SQLite db + WAL files)
- `Pasted image*.png` in root (~11 MB of screenshots), `public/qeg-logo.png`, any `*.png`
- `files/erp-system-plan/` (duplicate copy of the `files/*.md` planning docs)
