# Frontend UI/UX Audit — Accounting & Fleet

**Date:** 2026-07-02
**Scope:** Frontend only (UI/UX + client-side functional correctness) for the **Accounting** (`src/modules/accounting/`) and **Fleet/Vehicles** (`src/modules/vehicles/`) modules, plus the header notification.
**Method:** Code-level review of every in-scope component against RTL, i18n, state/interaction, currency/number/date formatting, accessibility, layout/responsive, and consistency. Every finding was verified by reading the code (file:line cited). No backend/security/performance items included, per request.

| Module | Grade | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Accounting | **B** | 0 | 3 | 5 | 8 |
| Fleet / Vehicles | **B−** | 0 | 2 | 4 | 11 |

No crash-level (Critical) bugs. Both modules are cohesive, keep IQD and USD correctly separated, and use `t()`/`pickName`/`formatCurrency` consistently. The issues below are real but fixable.

---

## 🔴 Highest-impact fixes (do these first)

1. **Map legend shows a raw i18n key** — `vehicles/tabs/MapTab.tsx:118‑124` looks up `fleet.map.legend.inactive`, but `strings.ts:84` only registers `…idle`, so the third legend chip literally displays the text `fleet.map.legend.inactive` (map is live). *One-line fix.*
2. **New entry/voucher default date is off by a day** — `accounting/NewEntryDialog.tsx:85` & `NewVoucherDialog.tsx:39` use `new Date().toISOString()` (UTC); in Iraq (UTC+3) between 00:00–02:59 entries default to *yesterday*. Ledger dates matter.
3. **Editing line 0's description overwrites all lines** — `accounting/NewEntryDialog.tsx:487‑489`: in edit mode, typing in the first line's البيان wipes every other line's distinct description (silent data loss).
4. **View-mode identifiers lack `dir="ltr"`** — `vehicles/VehicleModule.tsx:288‑298`: plate, phone, IDs, license no., odometer render with bidi reordering in RTL (only the *edit* inputs get `dir="ltr"`).
5. **USD-only entry shows dinar totals** — `accounting/NewEntryDialog.tsx:534‑535,566‑587`: line inputs show `100` (USD) but the totals/balance chip show the IQD value — reads as an error. `EntryViewDialog`/`printEntry` already do this correctly via a `singleCurrency` check.

---

## Accounting Module

### High
- **UTC default date** — `NewEntryDialog.tsx:85`, `NewVoucherDialog.tsx:39`. `toISOString()` → wrong day in UTC+3. Build the default from local date parts (as `AccountingPage.defaultRange` already does).
- **Hardcoded Arabic placeholder** — `NewAccountDialog.tsx:136` `placeholder="مثال: 1151"`. Shows Arabic even in EN. Add `accounting.add.code_ph` (AR/EN) and use `t()`.
- **Line-0 description propagation destroys per-line descriptions in edit mode** — `NewEntryDialog.tsx:487‑489`. Only auto-fill blank lines, or disable propagation when `isEdit`.

### Medium
- **Editor totals always in IQD** — `NewEntryDialog.tsx:534‑535, 566‑571, 587`. Mirror the `singleCurrency` pattern from `EntryViewDialog.tsx:36‑39`.
- **Trial-balance "Balanced" pill ignores USD** — `TrialBalanceTab.tsx:178`. Pill uses IQD-only `balanced`; if USD is unbalanced the header still says "متوازن". Reflect `balanced && (!hasUsd || balancedUsd)` or add a second USD pill.
- **Duplicate مدين/دائن columns show the same number** — `JournalTab.tsx:255‑269`. Both accessors return `r.amount`; every row is identical. Collapse to one "amount" column.
- **DateField year range too narrow** — `DateField.tsx:23‑25` only spans `thisYear+1 … thisYear‑10`; older entries render a blank year and can't be reselected. Widen (e.g. to 2000) or inject the current value's year.
- **FilterBar uses native `<input type="date">`** — `FilterBar.tsx:29‑40`. Reintroduces the exact RTL problem `DateField` was built to fix; use `DateField` for from/to.

### Low
- Voucher filter pills lack `aria-pressed` (`VouchersTab.tsx:157‑168`; `JournalTab` does it right).
- Dead components: `NewVoucherDialog.tsx`, `AdvanceCard.tsx` (unused; `NewVoucherDialog` also carries the UTC-date bug).
- No error state on failed report fetches (`TrialBalanceTab:67`, `ChartTab:73`, `PartiesTab:26`, `CashTab:38`, `VehiclesTab:109`) — "no data" is indistinguishable from "load failed".
- `NewAccountDialog` has no success toast and doesn't block close while submitting (`:95‑96, :107`).
- Submit enabled while a line has no account — `NewEntryDialog.tsx:168` (`canSubmit` omits the account-code check; errors only on click).
- CashTab USD detection via name regex — `CashTab.tsx:72`; a USD box without `$`/`دولار`/`usd` in its name is summed into IQD. Prefer a currency field.
- Print popup fails silently when blocked — `printEntry.ts:95‑98`. Surface a toast.
- Single-node collapse tooltip says "Collapse all" — `ChartTab.tsx:484`.
- Unused icon imports — `JournalTab.tsx:2` (`ArrowDownToLine, ArrowUpFromLine, FileText`).

### Verified healthy
- All 288 `t()` keys resolve; dynamic key families (`accounting.type.*`, `accounting.vehicles.cat.*`, `…st.*`) exist in both AR/EN — no parity gaps.
- RTL: chevrons use `rtl:rotate-180`, tables use logical `text-start`/`ps-`/`border-s`, tree uses `paddingInlineStart`.
- IQD/USD never summed (the one "converted" KPI is explicitly labeled).
- Mutations refetch via `useResource`; `formatCurrency/Number/Date` guard null/NaN → `—`.

---

## Fleet / Vehicles Module

### High
- **Map legend renders raw key `fleet.map.legend.inactive`** — `tabs/MapTab.tsx:118‑124` vs `strings.ts:84` (`…idle`). User-visible i18n break on the live map.
- **View-mode numeric identifiers lack `dir="ltr"`** — `VehicleModule.tsx:288‑298`. Plate/phone/national‑ID/license/odometer misorder in RTL. Add a `ltr` flag to `row()` (mirror `DriverDialog.tsx:160`).

### Medium
- **"Add vehicle → Save" closes the dialog, breaking the documented attach-docs step** — `tabs/VehiclesTab.tsx:436‑443` passes `onChanged={closeModule}`; the new vehicle's real `id` is never reloaded, so document upload (needs `vehicle.id`, `VehicleModule.tsx:511`) is impossible in the same flow. Keep it open by reloading the created vehicle; use a separate refetch on close.
- **DriverDialog viewer has no keyboard support** — `DriverDialog.tsx:235‑258` (no Esc/arrow handler, unlike `VehicleModule.tsx:200‑210`). Inconsistent, less accessible.
- **Viewer arrow/chevron direction hard-coded RTL** — `VehicleModule.tsx:205‑206` (and DriverDialog): `ArrowLeft→next`, `ArrowRight→prev` is backwards in EN/LTR; on-screen chevrons don't depend on `lang`.
- **"View all (N)" in the Archive registration card does nothing** — `tabs/ArchiveTab.tsx:195‑197`: styled like a link but no `onClick`, while the list is truncated to 7.

### Low
- Dead code: `AddVehicleDialog.tsx` is unused (its auto map-placement/`project_id`-from-location logic never runs → new vehicles get `lat/lng = null` and don't appear on the map until placed manually).
- Per-document delete tooltip says "Delete vehicle" — `VehicleModule.tsx:569`, `DriverDialog.tsx:221` (`fleet.mod.delete`). Add `fleet.mod.delete_doc`.
- AccountingTab project group headings show Arabic in EN — `tabs/AccountingTab.tsx:238‑242, 359`; also a duplicate `lang==='en' ? name_ar : name_ar` branch at `:154‑157`. Use `pickName`/`name_en`.
- DriverDialog delete swallows errors, no success toast — `DriverDialog.tsx:121‑124` (VehicleModule toasts on both).
- DriverDialog viewer renders `<iframe>` for any non-image with no PDF check/fallback — `DriverDialog.tsx:248‑252` (VehicleModule handles this at `:626‑636`).
- Viewer/nav icon buttons lack `title`/`aria-label` — `VehicleModule.tsx:620,638`, `DriverDialog.tsx:240‑241,246,254`.
- Archive "Documents" KPI counts vehicles+drivers, not documents — `tabs/ArchiveTab.tsx:155‑161` (misleading metric).
- License-alert badge goes stale after fixing a vehicle from the bell — `components/layout/Header.tsx:195‑202` never refetches `/fleet/license-alerts`. Expose `refetch` and call it in `onChanged`.
- Maintenance ledger currency inconsistency — `VehicleModule.tsx:459‑461`: USD rows carry the symbol, IQD rows use bare `formatNumber` (unlabeled). Use `formatCurrency(..,'IQD',lang)`.
- Hardcoded/duplicated map strings — `LeafletMap.tsx:410` literal "Leaflet not loaded…"; inline AR/EN status maps at `:247‑261` duplicate `strings.ts` and omit `SOLD` (a sold vehicle shows raw `SOLD` in Arabic).
- Dead chart scaffolding in AccountingTab — `tabs/AccountingTab.tsx:7‑18,44‑45,386` (unused Recharts imports, `DualCurrencyTooltip`, `byTypeData`, `EmptyChart`, etc.).
- Search can throw on null `driver_name` — `tabs/VehiclesTab.tsx:124‑127` calls `.toLowerCase()` without a guard. Use `(v.driver_name ?? '')`.

### Verified healthy
- Consistent `t()`/`pickName`/`formatCurrency`; IQD/USD kept separate across AccountingTab, FinanceVehicleCard, VehicleModule totals.
- RTL handled in most component classes (`ms-/ps-/start-/end-`, `rtl:rotate-180`).

---

## Suggested fix order

**Batch 1 — visible correctness (quick, ~1–2 hrs total)**
Map legend key · UTC default date (both dialogs) · line-0 description overwrite · `dir="ltr"` on view-mode identifiers · USD-only editor totals.

**Batch 2 — UX/consistency**
Add-then-attach flow · DriverDialog keyboard + PDF fallback · viewer direction by `lang` · Trial-balance USD pill · dead "View all" link · AccountingTab EN project names · notification badge refetch.

**Batch 3 — cleanup/a11y**
Remove dead files (`AddVehicleDialog`, `NewVoucherDialog`, `AdvanceCard`, AccountingTab chart scaffolding) · error states on report fetches · aria-labels/`aria-pressed` · delete-doc tooltip · CashTab currency field · duplicate journal columns · DateField year range.

*Report only — no code changed. Say the word and I'll implement any batch.*
