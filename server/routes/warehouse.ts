// Warehouse: stock summary, low-stock, and transaction creation that actually
// moves stock. Endpoints under /api. POST /inventory-transactions overrides the
// generic router (mounted before it) so stock deltas are applied atomically.
import { Router } from 'express'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const warehouseRouter = Router()

// GET /api/warehouse/stock-summary?warehouse_id=
warehouseRouter.get('/warehouse/stock-summary', (req, res) => {
  const wh = req.query.warehouse_id as string | undefined
  const rows = wh
    ? db
        .prepare(
          `SELECT i.id item_id, i.code, i.name_ar, i.name_en, i.category, i.uom, i.min_stock, i.max_stock, i.unit_cost,
                  COALESCE(s.quantity,0) quantity
           FROM items i LEFT JOIN stock s ON s.item_id = i.id AND s.warehouse_id = ?
           ORDER BY i.code`,
        )
        .all(wh)
    : db
        .prepare(
          `SELECT i.id item_id, i.code, i.name_ar, i.name_en, i.category, i.uom, i.min_stock, i.max_stock, i.unit_cost,
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

  const txnId = genId('inv')
  const totalValue = lines.reduce(
    (s, l) => s + (Number(l.total) || Number(l.quantity) * (Number(l.unit_price) || 0)),
    0,
  )

  const insertTxn = db.prepare(`
    INSERT INTO inventory_transactions (id, serial_number, doc_number, date, type, warehouse_id, from_warehouse_id, company_id, project_id, currency, total_value, approved_by, notes, created_at)
    VALUES (@id,@serial_number,@doc_number,@date,@type,@warehouse_id,@from_warehouse_id,@company_id,@project_id,@currency,@total_value,@approved_by,@notes,@created_at)
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
