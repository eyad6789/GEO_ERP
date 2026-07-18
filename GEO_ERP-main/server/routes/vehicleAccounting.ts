// Vehicle spending analytics — connects the vehicles to the accounting.
// Cost source is UNIFIED:
//   1) REAL journal lines tagged to a vehicle (jl.vehicle_id), category derived
//      from the expense account (351 الوقود→FUEL, 3202/3203→MAINTENANCE, …)
//   2) the legacy/demo vehicle_costs table (so existing data still shows)
// IQD and USD are ALWAYS kept separate — never summed together.
import { Router, type Request } from 'express'
import { db, ensureVehicleAccounts } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const vehicleAccountingRouter = Router()

// POST /api/vehicles — override the generic create so a new vehicle immediately
// gets its asset account under «اليات» (5) and the link, no server restart needed.
vehicleAccountingRouter.post('/vehicles', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>
    const cols = (db.prepare(`PRAGMA table_info(vehicles)`).all() as Array<{ name: string }>).map((c) => c.name)
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) if (cols.includes(k)) data[k] = v
    if (!data.id) data.id = genId('veh')
    if (cols.includes('created_at') && !data.created_at) data.created_at = nowISO()
    const keys = Object.keys(data)
    if (!keys.length) return res.status(400).json({ error: 'No valid columns' })
    db.prepare(`INSERT INTO vehicles (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...keys.map((k) => data[k]))
    ensureVehicleAccounts() // create + link the 5xxx asset account for this vehicle
    logEvent({
      module: 'FLEET',
      action: 'CREATE',
      record_type: 'vehicles',
      record_id: String(data.id),
      record_description: String(data.name_ar ?? data.code ?? 'مركبة'),
      company_id: (data.company_id as string) ?? null,
      new_values: data,
    })
    res.status(201).json(db.prepare(`SELECT * FROM vehicles WHERE id = ?`).get(data.id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

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
         jl.company_id            AS company_id,
         jl.project_id            AS project_id,
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
)`

const SUMS = `SUM(CASE WHEN c.currency='USD' THEN 0 ELSE c.amount END) iqd,
              SUM(CASE WHEN c.currency='USD' THEN c.amount ELSE 0 END) usd`

// Company / project / date filter the COST (the journal line that paid), not the
// vehicle's registered company — so the spend matches the company that actually
// paid (and reconciles with the expenses baseline below). vehicle_id filters the
// car itself. Cost conditions and vehicle conditions are returned separately so
// the by_vehicle LEFT JOIN can keep every vehicle while still filtering costs.
function vehicleFilter(req: Request): { cost: string[]; costParams: unknown[]; veh: string[]; vehParams: unknown[] } {
  const cost: string[] = []
  const costParams: unknown[] = []
  const veh: string[] = []
  const vehParams: unknown[] = []
  if (req.query.company_id) { cost.push('c.company_id = ?'); costParams.push(req.query.company_id) }
  if (req.query.project_id) { cost.push('c.project_id = ?'); costParams.push(req.query.project_id) }
  if (req.query.from) { cost.push('c.date >= ?'); costParams.push(req.query.from) }
  if (req.query.to) { cost.push('c.date <= ?'); costParams.push(req.query.to) }
  if (req.query.vehicle_id) { veh.push('v.id = ?'); vehParams.push(req.query.vehicle_id) }
  return { cost, costParams, veh, vehParams }
}

const pair = (row: { iqd?: number; usd?: number } | undefined) => ({
  iqd: Number(row?.iqd) || 0,
  usd: Number(row?.usd) || 0,
})

// GET /api/accounting/vehicle-spending
vehicleAccountingRouter.get('/accounting/vehicle-spending', (req, res) => {
  try {
    const { cost, costParams, veh, vehParams } = vehicleFilter(req)
    const where = ['1=1', ...cost, ...veh].join(' AND ')
    const params = [...costParams, ...vehParams]
    const base = `FROM ${COSTS_SRC} c JOIN vehicles v ON v.id = c.vehicle_id WHERE ${where}`

    const totals = pair(db.prepare(`SELECT ${SUMS} ${base}`).get(...params) as never)
    const this_month = pair(db.prepare(`SELECT ${SUMS} ${base} AND strftime('%Y-%m', c.date) = strftime('%Y-%m','now')`).get(...params) as never)
    const this_year = pair(db.prepare(`SELECT ${SUMS} ${base} AND strftime('%Y', c.date) = strftime('%Y','now')`).get(...params) as never)

    const by_month = db.prepare(`SELECT strftime('%Y-%m', c.date) month, ${SUMS} ${base} AND c.date IS NOT NULL GROUP BY month ORDER BY month ASC`).all(...params) as Array<{ month: string; iqd: number; usd: number }>
    const by_year = db.prepare(`SELECT strftime('%Y', c.date) year, ${SUMS} ${base} AND c.date IS NOT NULL GROUP BY year ORDER BY year ASC`).all(...params) as Array<{ year: string; iqd: number; usd: number }>
    const by_category = db.prepare(`SELECT c.category, ${SUMS}, COUNT(*) count ${base} GROUP BY c.category ORDER BY iqd DESC`).all(...params) as Array<{ category: string; iqd: number; usd: number; count: number }>

    // Grouped by the PAYING company (c.company_id), matching the spend filter.
    const by_company = db
      .prepare(
        `SELECT c.company_id,
                COALESCE(co.name_ar,'—') name_ar, COALESCE(co.name_en,'') name_en,
                ${SUMS}, COUNT(DISTINCT v.id) vehicles
         FROM ${COSTS_SRC} c
         JOIN vehicles v ON v.id = c.vehicle_id
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE ${where}
         GROUP BY c.company_id ORDER BY iqd DESC`,
      )
      .all(...params) as Array<{ company_id: string | null; name_ar: string; name_en: string; iqd: number; usd: number; vehicles: number }>

    // Every vehicle (even with no costs in the filtered scope) + its spend. Cost
    // filters live in the JOIN's ON clause so the LEFT JOIN still lists all cars.
    const onClause = ['c.vehicle_id = v.id', ...cost].join(' AND ')
    const vehWhere = ['1=1', ...veh].join(' AND ')
    const by_vehicle = db
      .prepare(
        `SELECT v.id, v.code, v.name_ar, v.name_en, v.plate_number, v.driver_name,
                v.owner_name, v.vehicle_type, v.status, v.model_year,
                v.registration_expiry, v.location, v.account_code,
                COALESCE(SUM(CASE WHEN c.currency='USD' THEN 0 ELSE c.amount END),0) iqd,
                COALESCE(SUM(CASE WHEN c.currency='USD' THEN c.amount ELSE 0 END),0) usd
         FROM vehicles v
         LEFT JOIN ${COSTS_SRC} c ON ${onClause}
         WHERE ${vehWhere}
         GROUP BY v.id
         ORDER BY iqd DESC, v.code ASC`,
      )
      .all(...params)

    // Connection to accounting: total company EXPENSE spend (IQD) from the journal.
    // Same company/project/date scope as the vehicle spend above, so the
    // "% of expenses" KPI compares like with like.
    const expWhere = ["je.status != 'CANCELLED'", "a.type = 'EXPENSE'", "jl.currency != 'USD'"]
    const expParams: unknown[] = []
    if (req.query.company_id) { expWhere.push('jl.company_id = ?'); expParams.push(req.query.company_id) }
    if (req.query.project_id) { expWhere.push('jl.project_id = ?'); expParams.push(req.query.project_id) }
    if (req.query.from) { expWhere.push('je.date >= ?'); expParams.push(req.query.from) }
    if (req.query.to) { expWhere.push('je.date <= ?'); expParams.push(req.query.to) }
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
    // Include the project (WHERE the spend went) on each cost row.
    const costs = db
      .prepare(
        `SELECT c.date, c.category, c.amount, c.currency, c.note, c.entry_id, c.serial_number,
                c.project_id, p.name_ar AS project_name_ar, p.name_en AS project_name_en
         FROM ${COSTS_SRC} c
         LEFT JOIN projects p ON p.id = c.project_id
         WHERE c.vehicle_id = ? ORDER BY c.date DESC LIMIT 300`,
      )
      .all(req.params.id)
    res.json({ vehicle, by_category, costs })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
