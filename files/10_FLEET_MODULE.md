# Fleet Module (الآليات) — Build & Changelog

> Hand-off doc for the team. Explains **everything that was added or changed** to
> turn the `vehicle-en.html` prototype into a real, wired-in module inside the
> live GEO_ERP (Al‑Qabas) app. The prototype was only a *structural* reference —
> the real module is rebuilt in the app's own design system (teal `#1a5f7a` +
> amber `#e8a838`, Cairo font, RTL, shared component library, Recharts), seeded
> with the **real fleet** (116 vehicles from the maintenance Excel).

---

## 1. What was built

A new **Fleet** module at `/fleet` (sidebar key `fleet`, unlocked) with one page
and four tabs, matching the prototype's structure:

| Tab | Purpose |
|---|---|
| **Vehicles** | KPIs, status & per‑project charts, mini‑map, inventory with a By‑Type / By‑Project toggle, expandable vehicle cards, Add‑Vehicle dialog |
| **Accounting** | **Read‑only** finance preview (cost KPIs/charts/table), IQD & USD always separate |
| **Map & Tracking** | Full Leaflet map of Iraq — project pins + live vehicle markers with popups |
| **Archive** | Registration papers, driver documents, sold/retired vehicles |

### How each of the client's notes was implemented
1. **KPI block change** — the four Vehicles‑tab KPIs are **Total / Active / Inactive / In‑Maintenance** (the prototype's "Fuel Alert" block is gone). Source: `GET /fleet/summary`.
2. **Real projects on the map** — 3 active sites that hold vehicles (**جلولاء Jalawla / ديالى**, **خان ضاري Khan Dari**, **اليرموك Al‑Yarmouk / بغداد**) + 3 master‑plan pins with no vehicles (**واسط Wasit**, **المثنى Muthanna**, **ميسان Maysan**). A vehicle is tied to a project **by its `location`** (e.g. a vehicle at `خان ضاري` shows under the Khan Dari project). Clicking a vehicle marker opens a popup with plate, type, status, project, driver and "heading to".
3. **New projects auto‑appear on the map** — `projects` now has `lat`/`lng`. The Fleet map reads the `projects` table, so when the future **Projects** section creates a project with coordinates, it shows on the Fleet map automatically — **no Fleet‑side change needed**.
4. **Universal finance law** — money is **edited only in Accounting**. The Fleet module *displays* costs read‑only (`vehicle_costs` → `GET /fleet/costs`); the Accounting tab carries a visible "view‑only" banner; the **Add‑Vehicle form contains no money fields**. (Project finance remains the noted future exception.)
5. **By‑Type / By‑Project toggle** — the inventory has a segmented toggle; By‑Type shows category chips + a card grid, By‑Project groups cards under project headings. Each **card expands on click** to a detailed, organized view.
6. **Add‑Vehicle fields** — exactly: type, plate number, model year, registration‑expiry date, owner, project (optional — dropdown / auto‑by‑location), driver, oil‑change date. The registration expiry drives **red (expired) / amber (≤90 days) / green (valid)** chips on the cards.

---

## 2. Data model (new)

### `vehicles` (new table — `server/db/schema.sql`)
`id, code, vehicle_type` (CAR | PICKUP | MIXER | EXCAVATOR | LOADER | BULLDOZER | CRANE | DUMP_TRUCK | LIFT | ROLLER | DUMPER | TANKER | PUMP | MISC)`, type_group` (original Arabic group), `name_ar, name_en, emoji, plate_number, model_year, owner_name` (free text — owners are a mix of companies & individuals), `owner_company_id, registration_expiry, oil_change_date, status` (ACTIVE | INACTIVE | MAINTENANCE | RETIRED)`, location, project_id` (FK projects, nullable), `driver_name, driver_id, company_id, last_odometer, lat, lng, notes, created_at`.

### `vehicle_costs` (new table — finance‑owned, read‑only in Fleet)
`id, vehicle_id, category` (PURCHASE | MAINTENANCE | FUEL | PARTS)`, amount, currency` (IQD | USD)`, date, note, created_at`. **IQD and USD are kept as separate rows and never summed together** (the app's existing currency rule).

### `projects` (extended)
Added `lat REAL, lng REAL`. This is the mechanism for note 3.

### Registry
`vehicles` and `vehicle_costs` are registered in `server/routes/resource.ts` (module `FLEET`), so they get full generic CRUD at `/api/vehicles` and `/api/vehicle_costs` **plus immutable audit logging for free** (verified: a create writes a `FLEET / CREATE / vehicles` row to `event_logs`).

---

## 3. Backend

### `server/routes/fleet.ts` (new — read‑only computed router)
Mounted before the generic router in `server/index.ts`. Three endpoints (shapes are typed in `src/types/index.ts` as `FleetSummary`, `FleetMapData`, `FleetCosts`):

- `GET /api/fleet/summary` — counts {total, active, inactive, maintenance, retired}, by_type, by_project, by_status, **registration_alerts** {expired, soon (≤90d), ok} via `date('now')`, **oil_alerts** {due (>180d)}. Filters: `company_id`, `project_id`, `status`.
- `GET /api/fleet/map` — every project that has coordinates (kind = ACTIVE | MASTERPLAN), a synthetic **BASE** pin for HQ (المقر) when vehicles are unassigned, and all vehicles with positions (status, type, plate, driver, project name).
- `GET /api/fleet/costs` — totals, by_category, by_type, by_project, by_month (`YYYY-MM`). **IQD and USD in separate columns** (`SUM(CASE WHEN currency='IQD' …)`).

### Seed — `server/seed/seed.ts` + `server/seed/fleetData.ts`
- `server/seed/fleetData.ts` (**auto‑generated**) holds the **116 real vehicles** extracted from `جدول_صيانة_الاليات_الرئيسي_31_5_2026.xlsx` (master sheet `الاليات`): type, plate, model year, owner, registration‑expiry (Excel serial → ISO), location, driver, last odometer, and the IQD/USD spend amounts. Regenerate it from the Excel if the sheet changes.
- `seed.ts` now seeds the **6 real projects** with coordinates + correct names/statuses, then seeds vehicles: it maps each vehicle's `location` → a project + base coordinates (`خان ضاري`→Khan Dari, `جلولاء`→Jalawla, `اليرموك`→Al‑Yarmouk, HQ/Dora/Abu‑Ghraib/Thermstone → unassigned), applies a deterministic jitter for map spread, derives `status` and `oil_change_date`, and creates `vehicle_costs` rows (MAINTENANCE/FUEL/PARTS for IQD, MAINTENANCE for USD) from the sheet amounts.
- Seeded counts: **116 vehicles, 287 vehicle_costs, 6 projects**.

### Location → project map (auto‑linking)
| location in the sheet | project / pin |
|---|---|
| خان ضاري | Khan Dari (active) |
| جلولاء | Jalawla / Diyala (active) |
| اليرموك (via add form) | Al‑Yarmouk / Baghdad (active) |
| المقر / المنصور | HQ base pin (unassigned) |
| الدورة, مخزن الدورة, أبو غريب, معمل الثيرمستون | Baghdad/Babil sites (unassigned) |

---

## 4. Frontend — `src/modules/vehicles/`

```
routes.tsx            route: /fleet  (imports ./strings to register i18n)
strings.ts            all bilingual fleet.* keys (the shared string contract)
fleetUtils.ts         regState()+REG_CHIP/REG_LABEL_KEY, TYPE_EMOJI, STATUS_COLOR, VEHICLE_TYPES
leaflet-cdn.d.ts      ambient type for the CDN-loaded window.L
FleetPage.tsx         PageHeader + Tabs shell
VehicleCard.tsx       expandable card (note 5/6 — reg-expiry chip, oil-change chip, no money inputs)
AddVehicleDialog.tsx  FormDialog — 8 fields, no money (note 6)
LeafletMap.tsx        reusable Leaflet map (props: data, height, compact, className)
tabs/VehiclesTab.tsx  KPIs + charts + mini-map + toggle + grid + add (note 1/5)
tabs/MapTab.tsx       full map + KPIs + by-project chart (note 2)
tabs/AccountingTab.tsx read-only finance preview (note 4)
tabs/ArchiveTab.tsx   registration papers / driver docs / sold-retired
```

All data flows through the existing hooks (`useApi`, `useResource`) and shared
components (`KpiCard`, `ChartCard`+Recharts, `ArabicTable`, `StatusBadge`,
`FormDialog`, `Card`). Every string is bilingual via `useT()` and the keys in
`strings.ts`. RTL/AR‑EN toggling works throughout.

### Leaflet via CDN (important)
Leaflet is **not** an npm dependency. The CSS + JS are loaded from a CDN
`<script>`/`<link>` in `index.html` (exactly like the prototype), so `window.L`
is available at runtime; `LeafletMap.tsx` builds the map imperatively. This keeps
the bundle small and needs no install. The map tiles (OpenStreetMap) and the
Leaflet library require **internet at runtime** in the user's browser. To switch
to the bundled npm package instead, run `npm i leaflet @types/leaflet`, remove
the two CDN tags from `index.html`, `import 'leaflet/dist/leaflet.css'` in
`src/main.tsx`, and `import L from 'leaflet'` in `LeafletMap.tsx`.

---

## 5. Wiring & shared‑file edits
- `src/config/nav.ts` — added the `fleet` nav item (Truck icon, after Projects) and added `'fleet'` to `UNLOCKED_MODULES`.
- `src/App.tsx` — imported `vehiclesRoutes` and added `...gate('fleet', vehiclesRoutes)`.
- `src/i18n/strings.ts` — added `nav.fleet`, `status.MAINTENANCE`, `status.RETIRED`.
- `src/components/shared/StatusBadge.tsx` — mapped `MAINTENANCE` → amber, `RETIRED` → gray.
- `src/types/index.ts` — added `Vehicle`, `VehicleCost`, `VehicleType`, `VehicleStatus`, `FleetSummary`, `FleetMapData`, `FleetCosts`, and `lat/lng` on `Project`.
- `index.html` — added the Leaflet CDN `<link>` + `<script>`.

### Full file list
**New:** `server/routes/fleet.ts`, `server/seed/fleetData.ts`,
`src/modules/vehicles/{routes.tsx, strings.ts, fleetUtils.ts, leaflet-cdn.d.ts, FleetPage.tsx, VehicleCard.tsx, AddVehicleDialog.tsx, LeafletMap.tsx}`,
`src/modules/vehicles/tabs/{VehiclesTab,MapTab,AccountingTab,ArchiveTab}.tsx`,
`files/10_FLEET_MODULE.md`.
**Modified:** `server/db/schema.sql`, `server/routes/resource.ts`, `server/index.ts`,
`server/seed/seed.ts`, `src/types/index.ts`, `src/config/nav.ts`, `src/App.tsx`,
`src/i18n/strings.ts`, `src/components/shared/StatusBadge.tsx`, `index.html`.

---

## 6. Run & verify
```bash
npm install          # (leaflet is via CDN; nothing new to install)
npm run seed         # → 116 vehicles, 287 vehicle_costs, 6 projects
npm run typecheck    # clean
npm run dev          # API :4000 + Vite :5173  → open /fleet
```
Verified during build: typecheck (exit 0), production build (exit 0), all three
`/api/fleet/*` endpoints return correct data with IQD/USD separated, generic
`POST /api/vehicles` creates a record **and writes a FLEET audit row**, and
location→project auto‑linking is correct (Jalawla project = 31 vehicles).

> **Note for visual QA:** the Map tab needs internet (Leaflet CDN + OSM tiles).
> The other three tabs work offline. Real driver/vehicle document files for the
> Archive tab are to be supplied later by the client.
