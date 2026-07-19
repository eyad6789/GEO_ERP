// Warehouse: stock summary, low-stock, and transaction creation that actually
// moves stock. Endpoints under /api. POST /inventory-transactions overrides the
// generic router (mounted before it) so stock deltas are applied atomically.
import { Router } from 'express'
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'
import { WAREHOUSE_TAXONOMY } from '../seed/warehouseTaxonomy.js'

export const warehouseRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
// Runtime photo uploads (storekeeper's camera) — survives reseeds, gitignored.
const PHOTO_UPLOAD_DIR = join(__dirname, '..', 'data', 'item-images')
if (!existsSync(PHOTO_UPLOAD_DIR)) mkdirSync(PHOTO_UPLOAD_DIR, { recursive: true })
// Photos extracted from the source workbooks ship in public/ (dist/ in prod).
const STATIC_PHOTO_DIRS = [
  join(__dirname, '..', '..', 'public', 'item-images'),
  join(__dirname, '..', '..', 'dist', 'item-images'),
]

/** All photo URLs for an item code: workbook-extracted (static) + camera uploads. */
function photosFor(code: string): string[] {
  const urls: string[] = []
  const seen = new Set<string>()
  for (const dir of STATIC_PHOTO_DIRS) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if ((f.startsWith(`${code}.`) || f.startsWith(`${code}-`)) && !seen.has(f)) {
        seen.add(f)
        urls.push(`/item-images/${f}`)
      }
    }
  }
  for (const f of readdirSync(PHOTO_UPLOAD_DIR)) {
    if (f.startsWith(`${code}-u`)) urls.push(`/api/warehouse/item-photos/${f}`)
  }
  return urls
}

// GET /api/warehouse/item-photos/:file — serve a camera-uploaded photo.
warehouseRouter.get('/warehouse/item-photos/:file', (req, res) => {
  const file = req.params.file
  if (file.includes('/') || file.includes('..')) return res.status(400).end()
  const path = join(PHOTO_UPLOAD_DIR, file)
  if (!existsSync(path)) return res.status(404).end()
  res.sendFile(path)
})

// POST /api/warehouse/item-photo/:id — { data: base64 | dataURL, mime } camera upload.
warehouseRouter.post('/warehouse/item-photo/:id', (req, res) => {
  const item = db.prepare('SELECT id, code FROM items WHERE id = ?').get(req.params.id) as
    | { id: string; code: string }
    | undefined
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود / Item not found' })
  const b = (req.body ?? {}) as { data?: string; mime?: string }
  const raw = String(b.data ?? '')
  if (!raw) return res.status(400).json({ error: 'no image data' })
  const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  const buf = Buffer.from(base64, 'base64')
  if (buf.length < 100) return res.status(400).json({ error: 'empty image' })
  const ext = String(b.mime ?? '').includes('png') ? 'png' : 'jpg'
  const n = readdirSync(PHOTO_UPLOAD_DIR).filter((f) => f.startsWith(`${item.code}-u`)).length + 1
  const file = `${item.code}-u${n}.${ext}`
  writeFileSync(join(PHOTO_UPLOAD_DIR, file), buf)
  logEvent({
    module: 'WAREHOUSE',
    action: 'UPDATE',
    record_type: 'items',
    record_id: item.id,
    record_description: `صورة جديدة للصنف ${item.code}`,
    company_id: null,
    new_values: { photo: file, bytes: buf.length },
  })
  res.status(201).json({ url: `/api/warehouse/item-photos/${file}` })
})

// GET /api/warehouse/photo-coverage — codes that have at least one photo.
warehouseRouter.get('/warehouse/photo-coverage', (_req, res) => {
  const codes = new Set<string>()
  for (const dir of [...STATIC_PHOTO_DIRS, PHOTO_UPLOAD_DIR]) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      const m = /^(ITM-[A-Z]+-\d+)/.exec(f)
      if (m) codes.add(m[1])
    }
  }
  res.json([...codes])
})

// POST /api/warehouse/set-min-stock — { item_ids: string[], min_stock: number }
// Bulk alert-threshold setter (per item, per filtered category/size selection).
warehouseRouter.post('/warehouse/set-min-stock', (req, res) => {
  const b = (req.body ?? {}) as { item_ids?: string[]; min_stock?: number }
  const ids = Array.isArray(b.item_ids) ? b.item_ids.filter((x) => typeof x === 'string') : []
  const min = Number(b.min_stock)
  if (ids.length === 0 || !Number.isFinite(min) || min < 0) {
    return res.status(400).json({ error: 'item_ids and a non-negative min_stock are required' })
  }
  const stmt = db.prepare('UPDATE items SET min_stock = ? WHERE id = ?')
  const tx = db.transaction(() => {
    for (const id of ids) stmt.run(min, id)
  })
  tx()
  logEvent({
    module: 'WAREHOUSE',
    action: 'UPDATE',
    record_type: 'items',
    record_id: ids[0],
    record_description: `تعيين حد التنبيه ${min} لـ ${ids.length} صنف`,
    company_id: null,
    new_values: { min_stock: min, count: ids.length },
  })
  res.json({ updated: ids.length })
})

// ---- Custody (عهدة) ---------------------------------------------------------

// GET /api/warehouse/custody — open loans (is_loan, not yet returned) with item summaries.
warehouseRouter.get('/warehouse/custody', (_req, res) => {
  const txns = db
    .prepare(
      `SELECT t.id, t.serial_number, t.date, t.type, t.received_by, t.warehouse_id, t.notes, t.returned_at
       FROM inventory_transactions t
       WHERE t.is_loan = 1
       ORDER BY (t.returned_at IS NULL) DESC, t.date DESC`,
    )
    .all() as Array<{ id: string } & Record<string, unknown>>
  if (txns.length === 0) return res.json([])
  const ids = txns.map((t) => t.id)
  const lines = db
    .prepare(
      `SELECT l.transaction_id, i.name_ar, l.quantity, l.uom
       FROM inventory_lines l JOIN items i ON i.id = l.item_id
       WHERE l.transaction_id IN (${ids.map(() => '?').join(',')})`,
    )
    .all(...ids) as Array<{ transaction_id: string; name_ar: string; quantity: number; uom: string }>
  const byTxn = new Map<string, string[]>()
  for (const l of lines) {
    const arr = byTxn.get(l.transaction_id) ?? []
    arr.push(`${l.name_ar} ×${l.quantity}`)
    byTxn.set(l.transaction_id, arr)
  }
  res.json(txns.map((t) => ({ ...t, items_text: (byTxn.get(t.id) ?? []).join('؛ ') })))
})

// POST /api/warehouse/loan-returned/:id — closes a loan: stamps returned_at and
// posts the mirroring RETURN movement (stock goes back into the source warehouse).
warehouseRouter.post('/warehouse/loan-returned/:id', (req, res) => {
  const txn = db
    .prepare('SELECT * FROM inventory_transactions WHERE id = ? AND is_loan = 1')
    .get(req.params.id) as Record<string, unknown> | undefined
  if (!txn) return res.status(404).json({ error: 'العهدة غير موجودة / Loan not found' })
  if (txn.returned_at) return res.status(400).json({ error: 'أُرجعت سابقاً / Already returned' })
  const lines = db
    .prepare('SELECT item_id, quantity, uom FROM inventory_lines WHERE transaction_id = ?')
    .all(txn.id as string) as Array<{ item_id: string; quantity: number; uom: string }>
  const retId = genId('inv')
  const now = nowISO()
  const tx = db.transaction(() => {
    db.prepare('UPDATE inventory_transactions SET returned_at = ? WHERE id = ?').run(now, txn.id)
    db.prepare(
      `INSERT INTO inventory_transactions (id, serial_number, doc_number, date, type, warehouse_id, from_warehouse_id, company_id, project_id, currency, total_value, approved_by, received_by, is_loan, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      retId, `RET-${String(txn.serial_number ?? '').replace(/^WHT-/, '') || retId.slice(-4)}`, '',
      now.slice(0, 10), 'RETURN', txn.warehouse_id, null, txn.company_id ?? null, txn.project_id ?? null,
      'IQD', 0, null, (txn.received_by as string) ?? null, 0,
      `إرجاع عهدة ${txn.serial_number ?? ''}`, now,
    )
    for (const l of lines) {
      db.prepare(
        'INSERT INTO inventory_lines (id, transaction_id, item_id, quantity, uom, unit_price, total) VALUES (?,?,?,?,?,0,0)',
      ).run(genId('invl'), retId, l.item_id, l.quantity, l.uom ?? '')
      upsertStock(l.item_id, txn.warehouse_id as string, l.quantity)
    }
  })
  tx()
  logEvent({
    module: 'WAREHOUSE',
    action: 'UPDATE',
    record_type: 'inventory_transactions',
    record_id: txn.id as string,
    record_description: `إرجاع عهدة ${txn.serial_number ?? ''} — ${txn.received_by ?? ''}`,
    company_id: null,
    new_values: { returned_at: now, return_txn: retId },
  })
  res.json({ ok: true, return_id: retId })
})

// POST /api/warehouse/txn-signature/:id — { data: base64 png } receiver signature.
warehouseRouter.post('/warehouse/txn-signature/:id', (req, res) => {
  const txn = db.prepare('SELECT id FROM inventory_transactions WHERE id = ?').get(req.params.id)
  if (!txn) return res.status(404).json({ error: 'الحركة غير موجودة / Movement not found' })
  const raw = String((req.body ?? {}).data ?? '')
  if (!raw) return res.status(400).json({ error: 'no signature data' })
  const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  const buf = Buffer.from(base64, 'base64')
  if (buf.length < 100) return res.status(400).json({ error: 'empty signature' })
  const file = `SIG-${req.params.id}.png`
  writeFileSync(join(PHOTO_UPLOAD_DIR, file), buf)
  db.prepare('UPDATE inventory_transactions SET signature_file = ? WHERE id = ?').run(file, req.params.id)
  res.status(201).json({ url: `/api/warehouse/item-photos/${file}` })
})

// ---- Duplicate catalog cleanup ---------------------------------------------

const normalizeName = (s: string) =>
  (s || '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

// GET /api/warehouse/duplicate-candidates — groups of items with the same
// normalized name + size within a category (Excel-import leftovers).
warehouseRouter.get('/warehouse/duplicate-candidates', (_req, res) => {
  const items = db
    .prepare(
      `SELECT i.id, i.code, i.name_ar, i.category, i.sub_category, i.size_label, i.uom, i.spec,
              COALESCE(SUM(s.quantity),0) quantity
       FROM items i LEFT JOIN stock s ON s.item_id = i.id
       GROUP BY i.id`,
    )
    .all() as Array<{ id: string; code: string; name_ar: string; category: string; size_label: string; quantity: number } & Record<string, unknown>>
  const groups = new Map<string, typeof items>()
  for (const it of items) {
    const key = `${it.category}|${normalizeName(it.name_ar)}|${it.size_label ?? ''}`
    const arr = groups.get(key) ?? []
    arr.push(it)
    groups.set(key, arr)
  }
  res.json([...groups.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length))
})

// POST /api/warehouse/merge-items — { survivor_id, merged_ids[] }. Moves stock
// (summed per warehouse) and movement lines onto the survivor, deletes the rest.
warehouseRouter.post('/warehouse/merge-items', (req, res) => {
  const b = (req.body ?? {}) as { survivor_id?: string; merged_ids?: string[] }
  const survivor = b.survivor_id
  const merged = (b.merged_ids ?? []).filter((x) => typeof x === 'string' && x !== survivor)
  if (!survivor || merged.length === 0) {
    return res.status(400).json({ error: 'survivor_id and merged_ids required' })
  }
  const exists = db.prepare('SELECT id, code FROM items WHERE id = ?')
  const surv = exists.get(survivor) as { id: string; code: string } | undefined
  if (!surv) return res.status(404).json({ error: 'survivor not found' })
  const tx = db.transaction(() => {
    for (const mid of merged) {
      if (!exists.get(mid)) continue
      const cells = db
        .prepare('SELECT warehouse_id, quantity FROM stock WHERE item_id = ?')
        .all(mid) as Array<{ warehouse_id: string; quantity: number }>
      for (const c of cells) upsertStock(survivor, c.warehouse_id, c.quantity)
      db.prepare('DELETE FROM stock WHERE item_id = ?').run(mid)
      db.prepare('UPDATE inventory_lines SET item_id = ? WHERE item_id = ?').run(survivor, mid)
      db.prepare('DELETE FROM items WHERE id = ?').run(mid)
    }
  })
  tx()
  logEvent({
    module: 'WAREHOUSE',
    action: 'UPDATE',
    record_type: 'items',
    record_id: survivor,
    record_description: `دمج ${merged.length} صنف مكرر في ${surv.code}`,
    company_id: null,
    new_values: { merged_ids: merged },
  })
  res.json({ ok: true, merged: merged.length })
})

// GET /api/warehouse/reorder-radar — items whose threshold is set (>0) and breached.
warehouseRouter.get('/warehouse/reorder-radar', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT i.id item_id, i.code, i.name_ar, i.name_en, i.category, i.sub_category, i.size_label, i.uom, i.min_stock,
              COALESCE(SUM(s.quantity),0) quantity
       FROM items i LEFT JOIN stock s ON s.item_id = i.id
       WHERE i.min_stock > 0
       GROUP BY i.id HAVING quantity <= i.min_stock
       ORDER BY (i.min_stock - quantity) DESC`,
    )
    .all()
  res.json(rows)
})

// GET /api/warehouse/categories — the category taxonomy (ids + AR/EN names) that
// drives the visual explorer. Single source of truth: server/seed/warehouseTaxonomy.ts.
warehouseRouter.get('/warehouse/categories', (_req, res) => {
  res.json(WAREHOUSE_TAXONOMY)
})

// GET /api/warehouse/stock-matrix — every non-zero stock cell (item × warehouse).
// Lets the explorer filter by warehouse and show per-item distribution without
// one request per item (~1.2k rows total).
warehouseRouter.get('/warehouse/stock-matrix', (_req, res) => {
  res.json(db.prepare('SELECT item_id, warehouse_id, quantity FROM stock WHERE quantity != 0').all())
})

// GET /api/warehouse/transfer-flows — movement routes aggregated by (type, from, to)
// for the visual flow map. IN rows have from_warehouse_id = null (external supply);
// OUT rows target their own warehouse (issued/consumed outside the group).
warehouseRouter.get('/warehouse/transfer-flows', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT t.type, t.from_warehouse_id, t.warehouse_id,
              COUNT(DISTINCT t.id) txn_count, COALESCE(SUM(l.quantity),0) total_qty, MAX(t.date) last_date
       FROM inventory_transactions t LEFT JOIN inventory_lines l ON l.transaction_id = t.id
       GROUP BY t.type, t.from_warehouse_id, t.warehouse_id`,
    )
    .all()
  res.json(rows)
})

// GET /api/warehouse/recent-activity — the last 60 movements WITH their line items
// (names + quantities), newest first. Powers the human-readable activity feed.
warehouseRouter.get('/warehouse/recent-activity', (_req, res) => {
  const txns = db
    .prepare(
      `SELECT id, serial_number, date, type, notes, warehouse_id, from_warehouse_id
       FROM inventory_transactions
       ORDER BY date DESC, created_at DESC
       LIMIT 60`,
    )
    .all() as Array<Record<string, unknown>>
  if (txns.length === 0) return res.json([])
  const ids = txns.map((t) => t.id as string)
  const lines = db
    .prepare(
      `SELECT l.transaction_id, l.quantity, l.uom, i.name_ar, i.name_en
       FROM inventory_lines l JOIN items i ON i.id = l.item_id
       WHERE l.transaction_id IN (${ids.map(() => '?').join(',')})`,
    )
    .all(...ids) as Array<{ transaction_id: string } & Record<string, unknown>>
  const byTxn = new Map<string, unknown[]>()
  for (const l of lines) {
    const arr = byTxn.get(l.transaction_id) ?? []
    arr.push({ name_ar: l.name_ar, name_en: l.name_en, quantity: l.quantity, uom: l.uom })
    byTxn.set(l.transaction_id, arr)
  }
  res.json(txns.map((t) => ({ ...t, items: byTxn.get(t.id as string) ?? [] })))
})

// GET /api/warehouse/movement-lines-summary — per-transaction "item ×qty" summary
// (Arabic names, «؛ »-joined) + total quantity. Powers the movements table's Excel
// export, which otherwise has no line-item data to show.
warehouseRouter.get('/warehouse/movement-lines-summary', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT l.transaction_id, i.name_ar, l.quantity
       FROM inventory_lines l JOIN items i ON i.id = l.item_id
       ORDER BY l.transaction_id, i.name_ar`,
    )
    .all() as Array<{ transaction_id: string; name_ar: string; quantity: number }>
  const byTxn = new Map<string, { parts: string[]; total: number }>()
  for (const r of rows) {
    const entry = byTxn.get(r.transaction_id) ?? { parts: [], total: 0 }
    entry.parts.push(`${r.name_ar} ×${r.quantity}`)
    entry.total += r.quantity
    byTxn.set(r.transaction_id, entry)
  }
  res.json(
    [...byTxn.entries()].map(([transaction_id, v]) => ({
      transaction_id,
      items_text: v.parts.join('؛ '),
      total_qty: v.total,
    })),
  )
})

// GET /api/warehouse/item/:id — full item card: per-warehouse stock + recent movements + photos.
warehouseRouter.get('/warehouse/item/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as
    | ({ code: string } & Record<string, unknown>)
    | undefined
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود / Item not found' })
  const stock = db
    .prepare(
      `SELECT s.warehouse_id, w.name_ar, w.name_en, w.type, s.quantity
       FROM stock s JOIN warehouses w ON w.id = s.warehouse_id
       WHERE s.item_id = ? AND s.quantity != 0
       ORDER BY w.type, w.id`,
    )
    .all(req.params.id)
  const moves = db
    .prepare(
      `SELECT t.id, t.date, t.type, t.serial_number, t.notes, t.warehouse_id, t.from_warehouse_id,
              l.quantity, l.uom
       FROM inventory_lines l JOIN inventory_transactions t ON t.id = l.transaction_id
       WHERE l.item_id = ?
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 100`,
    )
    .all(req.params.id)
  res.json({ item, stock, moves, photos: photosFor(item.code) })
})

// GET /api/warehouse/stock-summary?warehouse_id=
warehouseRouter.get('/warehouse/stock-summary', (req, res) => {
  const wh = req.query.warehouse_id as string | undefined
  const rows = wh
    ? db
        .prepare(
          `SELECT i.id item_id, i.code, i.name_ar, i.name_en, i.category, i.sub_category, i.size_label, i.size_mm, i.condition, i.shelf_location, i.spec, i.uom, i.min_stock, i.max_stock, i.unit_cost,
                  COALESCE(s.quantity,0) quantity
           FROM items i LEFT JOIN stock s ON s.item_id = i.id AND s.warehouse_id = ?
           ORDER BY i.code`,
        )
        .all(wh)
    : db
        .prepare(
          `SELECT i.id item_id, i.code, i.name_ar, i.name_en, i.category, i.sub_category, i.size_label, i.size_mm, i.condition, i.shelf_location, i.spec, i.uom, i.min_stock, i.max_stock, i.unit_cost,
                  COALESCE(SUM(s.quantity),0) quantity
           FROM items i LEFT JOIN stock s ON s.item_id = i.id
           GROUP BY i.id ORDER BY i.code`,
        )
        .all()

  const withStatus = (rows as Array<Record<string, number>>).map((r) => {
    const status = r.quantity <= 0 ? 'OUT' : r.quantity <= r.min_stock ? 'LOW' : 'IN_STOCK'
    return { ...r, value: r.quantity * (r.unit_cost || 0), stock_status: status }
  })
  res.json(withStatus)
})

// GET /api/warehouse/low-stock
warehouseRouter.get('/warehouse/low-stock', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT i.id item_id, i.code, i.name_ar, i.name_en, i.category, i.uom, i.min_stock,
              COALESCE(SUM(s.quantity),0) quantity
       FROM items i LEFT JOIN stock s ON s.item_id = i.id
       GROUP BY i.id HAVING quantity <= i.min_stock
       ORDER BY quantity ASC`,
    )
    .all()
  res.json(rows)
})

function upsertStock(itemId: string, warehouseId: string, delta: number) {
  const existing = db
    .prepare('SELECT id, quantity FROM stock WHERE item_id = ? AND warehouse_id = ?')
    .get(itemId, warehouseId) as { id: string; quantity: number } | undefined
  if (existing) {
    db.prepare('UPDATE stock SET quantity = quantity + ? WHERE id = ?').run(delta, existing.id)
  } else {
    db.prepare('INSERT INTO stock (id, item_id, warehouse_id, quantity) VALUES (?,?,?,?)').run(
      genId('stk'),
      itemId,
      warehouseId,
      delta,
    )
  }
}

interface TxnLine {
  item_id: string
  quantity: number
  uom?: string
  unit_price?: number
  total?: number
}

// POST /api/inventory_transactions — insert txn + lines and apply stock deltas.
// (Overrides the generic POST for the same resource path.)
warehouseRouter.post('/inventory_transactions', (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  const lines = (b.lines as TxnLine[]) ?? []
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'الحركة بدون أصناف / Transaction has no items' })
  }
  const type = String(b.type ?? 'IN') as 'IN' | 'OUT' | 'TRANSFER' | 'RETURN' | 'ADJUST'
  const warehouseId = b.warehouse_id as string
  const fromWarehouseId = (b.from_warehouse_id as string) ?? null
  if (!warehouseId) return res.status(400).json({ error: 'warehouse_id required' })
  if (type === 'TRANSFER' && !fromWarehouseId) {
    return res.status(400).json({ error: 'التحويل يتطلب مستودع المصدر / Transfer needs a source warehouse' })
  }
  if (type === 'TRANSFER' && fromWarehouseId === warehouseId) {
    return res.status(400).json({ error: 'مستودع المصدر والوجهة متطابقان / Source and destination warehouse are the same' })
  }

  // Guard: OUT/TRANSFER must not drive on-hand stock negative.
  if (type === 'OUT' || type === 'TRANSFER') {
    const srcWh = type === 'TRANSFER' ? fromWarehouseId! : warehouseId
    const readQty = db.prepare('SELECT quantity FROM stock WHERE item_id = ? AND warehouse_id = ?')
    for (const l of lines) {
      const onHand = Number((readQty.get(l.item_id, srcWh) as { quantity: number } | undefined)?.quantity ?? 0)
      const qty = Number(l.quantity) || 0
      if (qty > onHand) {
        return res.status(400).json({
          error: `الكمية المطلوبة (${qty}) تتجاوز المتوفر (${onHand}) في المخزون / Requested quantity exceeds available stock`,
        })
      }
    }
  }

  const txnId = genId('inv')
  const totalValue = lines.reduce(
    (s, l) => s + (Number(l.total) || Number(l.quantity) * (Number(l.unit_price) || 0)),
    0,
  )

  const insertTxn = db.prepare(`
    INSERT INTO inventory_transactions (id, serial_number, doc_number, date, type, warehouse_id, from_warehouse_id, company_id, project_id, currency, total_value, approved_by, received_by, is_loan, notes, created_at)
    VALUES (@id,@serial_number,@doc_number,@date,@type,@warehouse_id,@from_warehouse_id,@company_id,@project_id,@currency,@total_value,@approved_by,@received_by,@is_loan,@notes,@created_at)
  `)
  const insertLine = db.prepare(`
    INSERT INTO inventory_lines (id, transaction_id, item_id, quantity, uom, unit_price, total)
    VALUES (@id,@transaction_id,@item_id,@quantity,@uom,@unit_price,@total)
  `)

  const tx = db.transaction(() => {
    insertTxn.run({
      id: txnId,
      serial_number: (b.serial_number as string) ?? `INV-${Date.now().toString().slice(-6)}`,
      doc_number: (b.doc_number as string) ?? '',
      date: (b.date as string) ?? nowISO().slice(0, 10),
      type,
      warehouse_id: warehouseId,
      from_warehouse_id: fromWarehouseId,
      company_id: (b.company_id as string) ?? null,
      project_id: (b.project_id as string) ?? null,
      currency: (b.currency as string) ?? 'IQD',
      total_value: totalValue,
      approved_by: (b.approved_by as string) ?? null,
      received_by: (b.received_by as string) ?? null,
      is_loan: b.is_loan ? 1 : 0,
      notes: (b.notes as string) ?? '',
      created_at: nowISO(),
    })
    for (const l of lines) {
      const qty = Number(l.quantity) || 0
      insertLine.run({
        id: genId('invl'),
        transaction_id: txnId,
        item_id: l.item_id,
        quantity: qty,
        uom: l.uom ?? '',
        unit_price: Number(l.unit_price) || 0,
        total: Number(l.total) || qty * (Number(l.unit_price) || 0),
      })
      // Apply stock movement.
      if (type === 'IN' || type === 'RETURN') {
        upsertStock(l.item_id, warehouseId, qty)
      } else if (type === 'OUT') {
        upsertStock(l.item_id, warehouseId, -qty)
      } else if (type === 'ADJUST') {
        upsertStock(l.item_id, warehouseId, qty) // qty may be negative for a downward correction
      } else if (type === 'TRANSFER') {
        upsertStock(l.item_id, fromWarehouseId!, -qty)
        upsertStock(l.item_id, warehouseId, qty)
      }
    }
  })

  try {
    tx()
    logEvent({
      module: 'WAREHOUSE',
      action: 'CREATE',
      record_type: 'inventory_transactions',
      record_id: txnId,
      record_description: `${type} — ${lines.length} صنف`,
      company_id: (b.company_id as string) ?? null,
      new_values: { type, total: totalValue, lines: lines.length },
    })
    const row = db.prepare('SELECT * FROM inventory_transactions WHERE id = ?').get(txnId)
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// DELETE /api/inventory_transactions/:id — remove a transaction, its lines, and
// REVERSE the stock movement it applied. (The generic DELETE would orphan the
// lines and leave stock permanently drifted.)
warehouseRouter.delete('/inventory_transactions/:id', (req, res) => {
  const id = req.params.id
  const txn = db.prepare('SELECT * FROM inventory_transactions WHERE id = ?').get(id) as
    | { id: string; type: string; warehouse_id: string; from_warehouse_id: string | null; company_id: string | null }
    | undefined
  if (!txn) return res.status(404).json({ error: 'Not found' })
  const lines = db
    .prepare('SELECT item_id, quantity FROM inventory_lines WHERE transaction_id = ?')
    .all(id) as { item_id: string; quantity: number }[]

  const tx = db.transaction(() => {
    for (const l of lines) {
      const qty = Number(l.quantity) || 0
      // Inverse of the deltas applied at create time.
      if (txn.type === 'IN' || txn.type === 'RETURN') upsertStock(l.item_id, txn.warehouse_id, -qty)
      else if (txn.type === 'OUT') upsertStock(l.item_id, txn.warehouse_id, qty)
      else if (txn.type === 'ADJUST') upsertStock(l.item_id, txn.warehouse_id, -qty)
      else if (txn.type === 'TRANSFER') {
        if (txn.from_warehouse_id) upsertStock(l.item_id, txn.from_warehouse_id, qty)
        upsertStock(l.item_id, txn.warehouse_id, -qty)
      }
    }
    db.prepare('DELETE FROM inventory_lines WHERE transaction_id = ?').run(id)
    db.prepare('DELETE FROM inventory_transactions WHERE id = ?').run(id)
  })

  try {
    tx()
    logEvent({
      module: 'WAREHOUSE',
      action: 'DELETE',
      record_type: 'inventory_transactions',
      record_id: id,
      record_description: `حذف حركة ${txn.type} — عكس أثر المخزون`,
      company_id: txn.company_id ?? null,
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
