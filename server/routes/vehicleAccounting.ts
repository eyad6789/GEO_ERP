// Vehicle spending analytics — connects the Fleet module's vehicle_costs to the
// accounting picture: how much is spent on vehicles per month / year / total,
// and how that compares to the company's overall expenses (from the journal).
// IQD and USD are ALWAYS kept separate — never summed together.
import { Router, type Request } from 'express'
import { db } from '../db/connection.js'

export const vehicleAccountingRouter = Router()

// Optional filters on the vehicles the costs belong to.
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

// GET /api/accounting/vehicle-spending — vehicle cost aggregates + expense context.
vehicleAccountingRouter.get('/accounting/vehicle-spending', (req, res) => {
  try {
    const { where, params } = vehicleFilter(req)
    // Per-currency sum expression reused across every aggregate.
    const sum = `SUM(CASE WHEN vc.currency='USD' THEN 0 ELSE vc.amount END) iqd,
                 SUM(CASE WHEN vc.currency='USD' THEN vc.amount ELSE 0 END) usd`
    const base = `FROM vehicle_costs vc JOIN vehicles v ON v.id = vc.vehicle_id WHERE ${where}`

    const totals = pair(db.prepare(`SELECT ${sum} ${base}`).get(...params) as never)
    const this_month = pair(
      db.prepare(`SELECT ${sum} ${base} AND strftime('%Y-%m', vc.date) = strftime('%Y-%m','now')`).get(...params) as never,
    )
    const this_year = pair(
      db.prepare(`SELECT ${sum} ${base} AND strftime('%Y', vc.date) = strftime('%Y','now')`).get(...params) as never,
    )

    const by_month = db
      .prepare(`SELECT strftime('%Y-%m', vc.date) month, ${sum} ${base} AND vc.date IS NOT NULL GROUP BY month ORDER BY month ASC`)
      .all(...params) as Array<{ month: string; iqd: number; usd: number }>

    const by_year = db
      .prepare(`SELECT strftime('%Y', vc.date) year, ${sum} ${base} AND vc.date IS NOT NULL GROUP BY year ORDER BY year ASC`)
      .all(...params) as Array<{ year: string; iqd: number; usd: number }>

    const by_category = db
      .prepare(`SELECT vc.category, ${sum} ${base} GROUP BY vc.category ORDER BY iqd DESC`)
      .all(...params) as Array<{ category: string; iqd: number; usd: number }>

    const by_company = db
      .prepare(
        `SELECT v.company_id,
                COALESCE(c.name_ar,'—') name_ar,
                COALESCE(c.name_en,'') name_en,
                ${sum},
                COUNT(DISTINCT v.id) vehicles
         FROM vehicle_costs vc
         JOIN vehicles v ON v.id = vc.vehicle_id
         LEFT JOIN companies c ON c.id = v.company_id
         WHERE ${where}
         GROUP BY v.company_id
         ORDER BY iqd DESC`,
      )
      .all(...params) as Array<{ company_id: string | null; name_ar: string; name_en: string; iqd: number; usd: number; vehicles: number }>

    // ---- Connection to accounting -----------------------------------------
    // Total company EXPENSE spend (IQD) from the journal, for the same company,
    // this month / this year / all-time. Lets the UI show vehicle spend as a
    // share of overall spending.
    const expWhere = ["je.status != 'CANCELLED'", "a.type = 'EXPENSE'", "jl.currency != 'USD'"]
    const expParams: unknown[] = []
    if (req.query.company_id) {
      expWhere.push('jl.company_id = ?')
      expParams.push(req.query.company_id)
    }
    const expBase = `FROM journal_lines jl
                     JOIN journal_entries je ON je.id = jl.entry_id
                     JOIN accounts a ON a.code = jl.account_code
                     WHERE ${expWhere.join(' AND ')}`
    const expVal = (clause: string) =>
      Number(
        (db.prepare(`SELECT COALESCE(SUM(jl.debit - jl.credit),0) v ${expBase} ${clause}`).get(...expParams) as { v: number }).v,
      ) || 0
    const expenses = {
      month: expVal(`AND strftime('%Y-%m', je.date) = strftime('%Y-%m','now')`),
      year: expVal(`AND strftime('%Y', je.date) = strftime('%Y','now')`),
      total: expVal(''),
    }

    res.json({ totals, this_month, this_year, by_month, by_year, by_category, by_company, expenses })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
