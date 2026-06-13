// GET /api/dashboard — cross-module aggregate KPIs for the dashboard module.
import { Router } from 'express'
import { db } from '../db/connection.js'

export const dashboardRouter = Router()

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0
}

dashboardRouter.get('/dashboard', (_req, res) => {
  try {
    const count = (sql: string, ...p: unknown[]) =>
      num((db.prepare(sql).get(...p) as { c: number } | undefined)?.c)

    const counts = {
      companies: count('SELECT COUNT(*) c FROM companies'),
      projects: count('SELECT COUNT(*) c FROM projects'),
      active_projects: count("SELECT COUNT(*) c FROM projects WHERE status = 'ACTIVE'"),
      employees: count("SELECT COUNT(*) c FROM employees WHERE status = 'ACTIVE'"),
      items: count('SELECT COUNT(*) c FROM items'),
      journal_entries: count('SELECT COUNT(*) c FROM journal_entries'),
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
         WHERE je.status != 'CANCELLED'`,
      )
      .get() as Record<string, number>

    const contractTotal = num(
      (db.prepare('SELECT SUM(contract_value) s FROM projects').get() as { s: number } | undefined)?.s,
    )

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
      draft_entries: count("SELECT COUNT(*) c FROM journal_entries WHERE status = 'DRAFT'"),
    }

    const projects_by_status = db
      .prepare('SELECT status, COUNT(*) count FROM projects GROUP BY status')
      .all() as Array<{ status: string; count: number }>

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
         WHERE je.status != 'CANCELLED' AND je.date IS NOT NULL AND jl.currency != 'USD'
         GROUP BY month ORDER BY month DESC LIMIT 8`,
      )
      .all() as Array<{ month: string; revenue: number; expense: number }>

    const employees_by_company = db
      .prepare(
        `SELECT c.name_ar company, COUNT(e.id) count
         FROM companies c LEFT JOIN employees e ON e.company_id = c.id
         GROUP BY c.id HAVING count > 0 ORDER BY count DESC LIMIT 12`,
      )
      .all() as Array<{ company: string; count: number }>

    const recent_logs = db
      .prepare('SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT 12')
      .all()

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
