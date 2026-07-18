// Shared warehouse seeding logic: real Abu Ghraib + Al Dora inventory, plus
// project-linked warehouses fed by real transfer evidence (جلولاء / خان ضاري /
// اليرموك). Used by both the full `npm run seed` (server/seed/seed.ts) and the
// standalone `npm run seed:warehouse` (seedWarehouseOnly.ts) so both produce
// identical warehouse data. Deterministic: no Date.now()/Math.random().
import { db } from '../db/connection.js'
import { WAREHOUSE_ITEMS, type WarehouseSource } from './warehouseData.js'
import { WAREHOUSE_TRANSFERS, type TransferDestination } from './warehouseTransfers.js'
import { ITEM_CLASSIFICATION } from './warehouseClassification.js'
import { ITEM_CONDITIONS } from './warehouseConditions.js'
import { ITEM_LOCATIONS } from './warehouseLocations.js'

const ANCHOR = '2026-06-01T00:00:00.000Z'
// Fallback date for the handful of transfer notes with no parseable date —
// roughly the midpoint of the real dates found across both source workbooks.
const UNKNOWN_TRANSFER_DAY = '2025-06-01'

const pad = (n: number, w = 4) => String(n).padStart(w, '0')

function ins(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row)
  db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((k) => '@' + k).join(',')})`).run(row)
}

const MAIN_WH_BY_SOURCE: Record<WarehouseSource, string> = {
  ABU_GHRAIB: 'WH-01',
  AL_DORA: 'WH-02',
}

const PROJECT_WH_BY_DEST: Partial<Record<Exclude<TransferDestination, null>, string>> = {
  JALAWLA: 'WH-03',
  KHAN_DHARI: 'WH-04',
  YARMOUK: 'WH-05',
  ABU_GHRAIB_WAREHOUSE: 'WH-01',
}

/** Seeds warehouses, items, opening stock, and the transfer audit trail. `projectIds` must be
 * in the stable order [جلولاء, خان ضاري, اليرموك] (PROJECT_DEFS order in seed.ts). */
export function seedWarehouseData(projectIds: string[], parentCompanyId: string) {
  const [jalawlaId, khanDhariId, yarmoukId] = projectIds
  const PROJECT_ID_BY_DEST: Partial<Record<Exclude<TransferDestination, null>, string | null>> = {
    JALAWLA: jalawlaId,
    KHAN_DHARI: khanDhariId,
    YARMOUK: yarmoukId,
    ABU_GHRAIB_WAREHOUSE: null,
  }

  ins('warehouses', {
    id: 'WH-01', name_ar: 'مستودع أبو غريب', name_en: 'Abu Ghraib Warehouse',
    location: 'أبو غريب', type: 'MAIN', project_id: null, created_at: ANCHOR,
  })
  ins('warehouses', {
    id: 'WH-02', name_ar: 'مستودع الدورة', name_en: 'Al-Dora Warehouse',
    location: 'الدورة - بغداد', type: 'MAIN', project_id: null, created_at: ANCHOR,
  })
  ins('warehouses', {
    id: 'WH-03', name_ar: 'مستودع مشروع جلولاء', name_en: 'Jalawla Project Warehouse',
    location: 'جلولاء - ديالى', type: 'PROJECT', project_id: jalawlaId, created_at: ANCHOR,
  })
  ins('warehouses', {
    id: 'WH-04', name_ar: 'مستودع مشروع خان ضاري', name_en: 'Khan Dhari Project Warehouse',
    location: 'خان ضاري - بغداد', type: 'PROJECT', project_id: khanDhariId, created_at: ANCHOR,
  })
  ins('warehouses', {
    id: 'WH-05', name_ar: 'مستودع مشروع اليرموك', name_en: 'Al-Yarmouk Project Warehouse',
    location: 'اليرموك - بغداد', type: 'PROJECT', project_id: yarmoukId, created_at: ANCHOR,
  })

  // ---- Items + opening stock (Main List balance = final, written once) ----
  const itemIdByCode = new Map<string, string>()
  const homeWarehouseByCode = new Map<string, string>()
  let stkSeq = 0
  for (const it of WAREHOUSE_ITEMS) {
    const id = 'itm-' + it.code.toLowerCase().replace(/^itm-/, '')
    itemIdByCode.set(it.code, id)
    const homeWh = MAIN_WH_BY_SOURCE[it.warehouse]
    homeWarehouseByCode.set(it.code, homeWh)

    // Categories come from the curated taxonomy mapping, not the raw Excel column
    // (the Excel categories were mostly junk-drawer: pipes filed under صحيات,
    // fittings/valves under قطع غيار). Falls back to the raw category for any
    // code the mapping doesn't know (e.g. future regenerated data).
    const cls = ITEM_CLASSIFICATION[it.code]
    // Physical location: room/container from the workbooks' per-location sheets,
    // combined with the original shelf note when both exist («حاوية 8 · الرف الثاني»).
    const mappedLoc = ITEM_LOCATIONS[it.code]
    const shelf = [mappedLoc, it.location_note].filter(Boolean).join(' · ')
    ins('items', {
      id, code: it.code, name_ar: it.name_ar, name_en: '',
      category: cls?.[0] ?? it.category, sub_category: cls?.[1] ?? '',
      size_label: cls?.[2] ?? '', size_mm: cls?.[3] ?? null,
      condition: ITEM_CONDITIONS[it.code] ?? null,
      spec: it.spec ?? '', uom: it.uom ?? '', min_stock: 0, max_stock: 0,
      shelf_location: shelf, description: it.raw_balance_text ?? '',
      unit_cost: 0, currency: 'IQD', created_at: ANCHOR,
    })
    stkSeq++
    ins('stock', { id: `stk-wh-${pad(stkSeq)}`, item_id: id, warehouse_id: homeWh, quantity: it.quantity })
  }

  // ---- Transfer audit trail + project-warehouse stock accumulation ----
  // Main-warehouse (WH-01/WH-02) stock is already final from the Main List above —
  // transfers never adjust it again. Only the 3 project warehouses accumulate stock,
  // purely additively, since they have no Main List of their own.
  const projectStock: Record<string, Record<string, number>> = {}
  let txnSeq = 0
  for (const t of WAREHOUSE_TRANSFERS) {
    const itemId = itemIdByCode.get(t.item_code)
    if (!itemId) continue
    const sourceWh = homeWarehouseByCode.get(t.item_code)!

    let type: 'IN' | 'OUT' | 'TRANSFER'
    let warehouseId: string
    let fromWarehouseId: string | null
    let projectId: string | null

    if (t.direction === 'IN') {
      type = 'IN'
      warehouseId = sourceWh
      fromWarehouseId = null
      projectId = t.destination ? PROJECT_ID_BY_DEST[t.destination] ?? null : null
    } else if (t.destination && PROJECT_WH_BY_DEST[t.destination]) {
      type = 'TRANSFER'
      warehouseId = PROJECT_WH_BY_DEST[t.destination]!
      fromWarehouseId = sourceWh
      projectId = PROJECT_ID_BY_DEST[t.destination] ?? null
    } else {
      type = 'OUT'
      warehouseId = sourceWh
      fromWarehouseId = null
      projectId = null
    }

    txnSeq++
    const txnId = `inv-wh-${pad(txnSeq)}`
    const qty = t.quantity ?? 0
    ins('inventory_transactions', {
      id: txnId, serial_number: `WHT-${pad(txnSeq)}`, doc_number: '', date: t.date ?? UNKNOWN_TRANSFER_DAY,
      type, warehouse_id: warehouseId, from_warehouse_id: fromWarehouseId, company_id: parentCompanyId,
      project_id: projectId, currency: 'IQD', total_value: 0, approved_by: null, notes: t.notes, created_at: ANCHOR,
    })
    ins('inventory_lines', {
      id: `invl-wh-${pad(txnSeq)}`, transaction_id: txnId, item_id: itemId,
      quantity: qty, uom: t.uom ?? '', unit_price: 0, total: 0,
    })

    if (type === 'TRANSFER' && warehouseId !== 'WH-01' && warehouseId !== 'WH-02') {
      projectStock[warehouseId] ??= {}
      projectStock[warehouseId][itemId] = (projectStock[warehouseId][itemId] ?? 0) + qty
    }
  }

  for (const [whId, byItem] of Object.entries(projectStock)) {
    for (const [itemId, qty] of Object.entries(byItem)) {
      stkSeq++
      ins('stock', { id: `stk-wh-${pad(stkSeq)}`, item_id: itemId, warehouse_id: whId, quantity: qty })
    }
  }

  return { warehouses: 5, items: WAREHOUSE_ITEMS.length, transfers: WAREHOUSE_TRANSFERS.length }
}
