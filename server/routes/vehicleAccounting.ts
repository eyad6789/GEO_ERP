// Vehicle spending analytics — connects the vehicles to the accounting.
// Cost source is UNIFIED:
//   1) REAL journal lines tagged to a vehicle (jl.vehicle_id), category derived
//      from the expense account (351 الوقود→FUEL, 3202/3203→MAINTENANCE, …)
//   2) the legacy/demo vehicle_costs table (so existing data still shows)
// IQD and USD are ALWAYS kept separate — never summed together.
import { Router, type Request } from 'express'
import { db } from '../db/connection.js'

export const vehicleAccountingRouter = Router()

// Unified cost stream (journal lines tagged to a vehicle  ∪  vehicle_costs).
// account_code → category mirrors vehicleCostCategory() on the client.
const COSTS_SRC = `(
  SELECT jl.vehicle_id            AS vehicle_id,
         je.date                  AS date,
         jl.currency              AS currency,
         jl.debit                 AS amount,
         je.id                    AS entry_id,
         je.serial_number         AS serial_number,
         jl.description           AS note,
         CASE
           WHEN jl.account_code LIKE '351%'           THEN 'FUEL'
           WHEN jl.account_code IN ('3202','3203')    THEN 'MAINTENANCE'
           WHEN jl.account_code LIKE '352%'           THEN 'MATERIALS'
           WHEN jl.account_code = '3531'              THEN 'WATER'
           WHEN jl.account_code = '3532'              THEN 'ELECTRICITY'
           WHEN jl.account_code LIKE '353%'           THEN 'UTILITIES'
           WHEN jl.account_code = '3211'              THEN 'RENT'
           ELSE 'OTHER'
         END                      AS category
  FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.entry_id
  WHERE jl.vehicle_id IS NOT NULL AND je.status != 'CANCELLED' AND jl.debit > 0
  UNION ALL
  SELECT vc.vehicle_id, vc.date, vc.currency, vc.amount, NULL, NULL, vc.note, vc.category
  FROM vehicle_costs vc
)`

const SUMS = `SUM(CASE WHEN c.currency='USD' THEN 0 ELSE c.amount END) iqd,
              SUM(CASE WHEN c.currency='USD' THEN c.amount ELSE 0 END) usd`

function vehicleFilter(req: Request): { where: string; params: unknown[] } {
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (req.query.company_id) {
    where.push('v.company_id = ?')
    params.push(req.query.company_id)
  }
  if (req.query.project_id) {
    where.push('v.project_id = ?')
    params.push(req.query.project_id)
  }
  return { where: where.join(' AND '), params }
}

const pair = (row: { iqd?: number; usd?: number } | undefined) => ({
  iqd: Number(row?.iqd) || 0,
  usd: Number(row?.usd) || 0,
})

// GET /api/accounting/vehicle-spending
vehicleAccountingRouter.get('/accounting/vehicle-spending', (req, res) => {
  try {
    const { where, params } = vehicleFilter(req)
    const base = `FROM ${COSTS_SRC} c JOIN vehicles v ON v.id = c.vehicle_id WHERE ${where}`

    const totals = pair(db.prepare(`SELECT ${SUMS} ${base}`).get(...params) as never)
    const this_month = pair(db.prepare(`SELECT ${SUMS} ${base} AND strftime('%Y-%m', c.date) = strftime('%Y-%m','now')`).get(...params) as never)
    const this_year = pair(db.prepare(`SELECT ${SUMS} ${base} AND strftime('%Y', c.date) = strftime('%Y','now')`).get(...params) as never)

    const by_month = db.prepare(`SELECT strftime('%Y-%m', c.date) month, ${SUMS} ${base} AND c.date IS NOT NULL GROUP BY month ORDER BY month ASC`).all(...params) as Array<{ month: string; iqd: number; usd: number }>
    const by_year = db.prepare(`SELECT strftime('%Y', c.date) year, ${SUMS} ${base} AND c.date IS NOT NULL GROUP BY year ORDER BY year ASC`).all(...params) as Array<{ year: string; iqd: number; usd: number }>
    const by_category = db.prepare(`SELECT c.category, ${SUMS}, COUNT(*) count ${base} GROUP BY c.category ORDER BY iqd DESC`).all(...params) as Array<{ category: string; iqd: number; usd: number; count: number }>

    const by_company = db
      .prepare(
        `SELECT v.company_id,
                COALESCE(co.name_ar,'—') name_ar, COALESCE(co.name_en,'') name_en,
                ${SUMS}, COUNT(DISTINCT v.id) vehicles
         FROM ${COSTS_SRC} c
         JOIN vehicles v ON v.id = c.vehicle_id
         LEFT JOIN companies co ON co.id = v.company_id
         WHERE ${where}
         GROUP BY v.company_id ORDER BY iqd DESC`,
      )
      .all(...params) as Array<{ company_id: string | null; name_ar: string; name_en: string; iqd: number; usd: number; vehicles: number }>

    // Every vehicle (even with no costs yet) + its total spend.
    const by_vehicle = db
      .prepare(
        `SELECT v.id, v.code, v.name_ar, v.name_en, v.plate_number, v.driver_name,
                v.owner_name, v.vehicle_type, v.status, v.model_year,
                v.registration_expiry, v.location,
                COALESCE(SUM(CASE WHEN c.currency='USD' THEN 0 ELSE c.amount END),0) iqd,
                COALESCE(SUM(CASE WHEN c.currency='USD' THEN c.amount ELSE 0 END),0) usd
         FROM vehicles v
         LEFT JOIN ${COSTS_SRC} c ON c.vehicle_id = v.id
         WHERE ${where}
         GROUP BY v.id
         ORDER BY iqd DESC, v.code ASC`,
      )
      .all(...params)

    // Connection to accounting: total company EXPENSE spend (IQD) from the journal.
    const expWhere = ["je.status != 'CANCELLED'", "a.type = 'EXPENSE'", "jl.currency != 'USD'"]
    const expParams: unknown[] = []
    if (req.query.company_id) {
      expWhere.push('jl.company_id = ?')
      expParams.push(req.query.company_id)
    }
    const expBase = `FROM journal_lines jl JOIN journal_entries je ON je.id = jl.entry_id JOIN accounts a ON a.code = jl.account_code WHERE ${expWhere.join(' AND ')}`
    const expVal = (clause: string) =>
      Number((db.prepare(`SELECT COALESCE(SUM(jl.debit - jl.credit),0) v ${expBase} ${clause}`).get(...expParams) as { v: number }).v) || 0
    const expenses = {
      month: expVal(`AND strftime('%Y-%m', je.date) = strftime('%Y-%m','now')`),
      year: expVal(`AND strftime('%Y', je.date) = strftime('%Y','now')`),
      total: expVal(''),
    }

    res.json({ totals, this_month, this_year, by_month, by_year, by_category, by_company, by_vehicle, expenses })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/accounting/vehicle-spending/:id — full detail for one vehicle:
// vehicle fields + cost breakdown by category (with counts) + cost rows.
// Journal-sourced rows carry entry_id so the UI can open/edit the journal.
vehicleAccountingRouter.get('/accounting/vehicle-spending/:id', (req, res) => {
  try {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id)
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' })
    const by_category = db
      .prepare(
        `SELECT c.category, ${SUMS}, COUNT(*) count
         FROM ${COSTS_SRC} c WHERE c.vehicle_id = ? GROUP BY c.category ORDER BY iqd DESC`,
      )
      .all(req.params.id)
    const costs = db
      .prepare(
        `SELECT c.date, c.category, c.amount, c.currency, c.note, c.entry_id, c.serial_number
         FROM ${COSTS_SRC} c WHERE c.vehicle_id = ? ORDER BY c.date DESC LIMIT 300`,
      )
      .all(req.params.id)
    res.json({ vehicle, by_category, costs })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
