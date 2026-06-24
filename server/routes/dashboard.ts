// GET /api/dashboard — cross-module aggregate KPIs for the dashboard module.
// Honors an optional ?company_id= filter so the dashboard matches the company
// selected in the top bar (otherwise it shows the consolidated group).
import { Router } from 'express'
import { db } from '../db/connection.js'

export const dashboardRouter = Router()

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0
}

dashboardRouter.get('/dashboard', (req, res) => {
  try {
    const companyId = (req.query.company_id as string) || ''
    // Clauses + params for the two filtering styles used below.
    const jlCo = companyId ? 'AND jl.company_id = ?' : '' // journal lines
    const jlP = companyId ? [companyId] : []
    const coWhere = companyId ? 'WHERE company_id = ?' : '' // plain tables
    const coP = companyId ? [companyId] : []

    const count = (sql: string, ...p: unknown[]) =>
      num((db.prepare(sql).get(...p) as { c: number } | undefined)?.c)

    const counts = {
      companies: count('SELECT COUNT(*) c FROM companies'),
      projects: count(`SELECT COUNT(*) c FROM projects ${coWhere}`, ...coP),
      active_projects: count(`SELECT COUNT(*) c FROM projects WHERE status = 'ACTIVE'${companyId ? ' AND company_id = ?' : ''}`, ...coP),
      employees: count(`SELECT COUNT(*) c FROM employees WHERE status = 'ACTIVE'${companyId ? ' AND company_id = ?' : ''}`, ...coP),
      items: count('SELECT COUNT(*) c FROM items'),
      journal_entries: count(`SELECT COUNT(*) c FROM journal_entries je ${companyId ? 'WHERE je.company_id = ?' : ''}`, ...coP),
    }

    // Finance from journal lines joined to account type. IQD and USD are kept
    // strictly separate — never converted or summed across currencies.
    const fin = db
      .prepare(
        `SELECT
           SUM(CASE WHEN a.type='REVENUE'   AND jl.currency!='USD' THEN jl.credit - jl.debit ELSE 0 END) revenue,
           SUM(CASE WHEN a.type='EXPENSE'   AND jl.currency!='USD' THEN jl.debit - jl.credit ELSE 0 END) expense,
           SUM(CASE WHEN a.type='ASSET'     AND jl.currency!='USD' THEN jl.debit - jl.credit ELSE 0 END) assets,
           SUM(CASE WHEN a.type='LIABILITY' AND jl.currency!='USD' THEN jl.credit - jl.debit ELSE 0 END) liabilities,
           SUM(CASE WHEN a.type='REVENUE'   AND jl.currency='USD' THEN jl.credit - jl.debit ELSE 0 END) revenue_usd,
           SUM(CASE WHEN a.type='EXPENSE'   AND jl.currency='USD' THEN jl.debit - jl.credit ELSE 0 END) expense_usd,
           SUM(CASE WHEN a.type='ASSET'     AND jl.currency='USD' THEN jl.debit - jl.credit ELSE 0 END) assets_usd,
           SUM(CASE WHEN a.type='LIABILITY' AND jl.currency='USD' THEN jl.credit - jl.debit ELSE 0 END) liabilities_usd
         FROM journal_lines jl
         JOIN accounts a ON a.code = jl.account_code
         JOIN journal_entries je ON je.id = jl.entry_id
         WHERE je.status != 'CANCELLED' ${jlCo}`,
      )
      .get(...jlP) as Record<string, number>

    const contractTotal = num(
      (db.prepare(`SELECT SUM(contract_value) s FROM projects ${coWhere}`).get(...coP) as { s: number } | undefined)?.s,
    )

    // Fleet (الآليات) spend = vehicle-tagged expense lines, per currency.
    const fleetRow = db
      .prepare(
        `SELECT SUM(CASE WHEN jl.currency!='USD' THEN jl.debit ELSE 0 END) iqd,
                SUM(CASE WHEN jl.currency='USD' THEN jl.debit ELSE 0 END) usd
         FROM journal_lines jl JOIN journal_entries je ON je.id = jl.entry_id
         WHERE je.status != 'CANCELLED' AND jl.vehicle_id IS NOT NULL AND jl.debit > 0 ${jlCo}`,
      )
      .get(...jlP) as { iqd: number; usd: number } | undefined

    const finance = {
      total_revenue: num(fin?.revenue),
      total_expense: num(fin?.expense),
      net_profit: num(fin?.revenue) - num(fin?.expense),
      total_assets: num(fin?.assets),
      total_liabilities: num(fin?.liabilities),
      contract_value_total: contractTotal,
      total_revenue_usd: num(fin?.revenue_usd),
      total_expense_usd: num(fin?.expense_usd),
      net_profit_usd: num(fin?.revenue_usd) - num(fin?.expense_usd),
      total_assets_usd: num(fin?.assets_usd),
      total_liabilities_usd: num(fin?.liabilities_usd),
      fleet_spend_iqd: num(fleetRow?.iqd),
      fleet_spend_usd: num(fleetRow?.usd),
    }

    // Low stock: items whose total stock across warehouses is at/under min.
    const lowStock = count(
      `SELECT COUNT(*) c FROM (
         SELECT i.id, i.min_stock, COALESCE(SUM(s.quantity),0) q
         FROM items i LEFT JOIN stock s ON s.item_id = i.id
         GROUP BY i.id HAVING q <= i.min_stock
       )`,
    )

    const alerts = {
      low_stock: lowStock,
      pending_leaves: count("SELECT COUNT(*) c FROM leave_requests WHERE status = 'PENDING'"),
    }

    const projects_by_status = db
      .prepare(`SELECT status, COUNT(*) count FROM projects ${coWhere} GROUP BY status`)
      .all(...coP) as Array<{ status: string; count: number }>

    // Monthly chart is IQD-only (the reporting currency) so it never mixes
    // currencies; USD activity is shown separately on the accounting screens.
    const revenue_expense_by_month = db
      .prepare(
        `SELECT substr(je.date,1,7) month,
           SUM(CASE WHEN a.type='REVENUE' THEN jl.credit - jl.debit ELSE 0 END) revenue,
           SUM(CASE WHEN a.type='EXPENSE' THEN jl.debit - jl.credit ELSE 0 END) expense
         FROM journal_lines jl
         JOIN accounts a ON a.code = jl.account_code
         JOIN journal_entries je ON je.id = jl.entry_id
         WHERE je.status != 'CANCELLED' AND je.date IS NOT NULL AND jl.currency != 'USD' ${jlCo}
         GROUP BY month ORDER BY month DESC LIMIT 8`,
      )
      .all(...jlP) as Array<{ month: string; revenue: number; expense: number }>

    const employees_by_company = db
      .prepare(
        `SELECT c.name_ar company, COUNT(e.id) count
         FROM companies c LEFT JOIN employees e ON e.company_id = c.id
         ${companyId ? 'WHERE c.id = ?' : ''}
         GROUP BY c.id HAVING count > 0 ORDER BY count DESC LIMIT 12`,
      )
      .all(...coP) as Array<{ company: string; count: number }>

    const recent_logs = db
      .prepare(`SELECT * FROM event_logs ${companyId ? 'WHERE company_id = ?' : ''} ORDER BY timestamp DESC LIMIT 12`)
      .all(...coP)

    res.json({
      counts,
      finance,
      alerts,
      projects_by_status,
      revenue_expense_by_month: revenue_expense_by_month.reverse(),
      employees_by_company,
      recent_logs,
    })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
