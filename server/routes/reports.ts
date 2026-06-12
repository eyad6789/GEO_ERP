// Accounting reports — all computed live from journal_lines + accounts.
// Endpoints under /api/reports/*. Common filters: company_id, project_id, from, to.
import { Router, type Request } from 'express'
import { db } from '../db/connection.js'

export const reportsRouter = Router()

function buildFilter(req: Request): { where: string; params: unknown[] } {
  const where: string[] = ["je.status != 'CANCELLED'"]
  const params: unknown[] = []
  if (req.query.company_id) {
    where.push('jl.company_id = ?')
    params.push(req.query.company_id)
  }
  if (req.query.project_id) {
    where.push('jl.project_id = ?')
    params.push(req.query.project_id)
  }
  if (req.query.from) {
    where.push('je.date >= ?')
    params.push(req.query.from)
  }
  if (req.query.to) {
    where.push('je.date <= ?')
    params.push(req.query.to)
  }
  return { where: where.join(' AND '), params }
}

// Trial Balance — debit/credit totals per posting account.
reportsRouter.get('/reports/trial-balance', (req, res) => {
  const { where, params } = buildFilter(req)
  // balance_iqd converts each line to IQD via its rate (jl.price): IQD lines use
  // price 1, USD lines use the entered rate. balance_usd keeps raw USD amounts.
  const rows = db
    .prepare(
      `SELECT a.code, a.name_ar, a.name_en, a.type,
              SUM(jl.debit) total_debit, SUM(jl.credit) total_credit,
              SUM(jl.debit) - SUM(jl.credit) balance,
              SUM((jl.debit - jl.credit) * (CASE WHEN jl.price > 0 THEN jl.price ELSE 1 END)) balance_iqd,
              SUM(CASE WHEN jl.currency = 'USD' THEN (jl.debit - jl.credit) ELSE 0 END) balance_usd
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where}
       GROUP BY a.code
       HAVING total_debit != 0 OR total_credit != 0
       ORDER BY a.code`,
    )
    .all(...params) as Array<{ total_debit: number; total_credit: number }>
  const totals = rows.reduce(
    (acc, r) => ({ debit: acc.debit + r.total_debit, credit: acc.credit + r.total_credit }),
    { debit: 0, credit: 0 },
  )
  res.json({ rows, totals })
})

// Income Statement — revenue vs expense → net profit.
reportsRouter.get('/reports/income-statement', (req, res) => {
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT a.code, a.name_ar, a.name_en, a.type,
              CASE WHEN a.type='REVENUE' THEN SUM(jl.credit - jl.debit)
                   ELSE SUM(jl.debit - jl.credit) END amount
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where} AND a.type IN ('REVENUE','EXPENSE')
       GROUP BY a.code HAVING amount != 0
       ORDER BY a.type, a.code`,
    )
    .all(...params) as Array<{ type: string; amount: number }>
  const revenue = rows.filter((r) => r.type === 'REVENUE')
  const expense = rows.filter((r) => r.type === 'EXPENSE')
  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0)
  res.json({
    revenue,
    expense,
    total_revenue: totalRevenue,
    total_expense: totalExpense,
    net_profit: totalRevenue - totalExpense,
  })
})

// Balance Sheet — assets vs liabilities + equity (+ current net profit).
reportsRouter.get('/reports/balance-sheet', (req, res) => {
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT a.code, a.name_ar, a.name_en, a.type,
              CASE WHEN a.type='ASSET' THEN SUM(jl.debit - jl.credit)
                   ELSE SUM(jl.credit - jl.debit) END amount
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where} AND a.type IN ('ASSET','LIABILITY','EQUITY')
       GROUP BY a.code HAVING amount != 0
       ORDER BY a.type, a.code`,
    )
    .all(...params) as Array<{ type: string; amount: number }>

  // net profit folds into equity
  const pnl = db
    .prepare(
      `SELECT
         SUM(CASE WHEN a.type='REVENUE' THEN jl.credit - jl.debit
                  WHEN a.type='EXPENSE' THEN -(jl.debit - jl.credit) ELSE 0 END) net
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where} AND a.type IN ('REVENUE','EXPENSE')`,
    )
    .get(...params) as { net: number }

  const assets = rows.filter((r) => r.type === 'ASSET')
  const liabilities = rows.filter((r) => r.type === 'LIABILITY')
  const equity = rows.filter((r) => r.type === 'EQUITY')
  const totalAssets = assets.reduce((s, r) => s + r.amount, 0)
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0)
  const netProfit = pnl?.net ?? 0
  const totalEquity = equity.reduce((s, r) => s + r.amount, 0) + netProfit
  res.json({
    assets,
    liabilities,
    equity,
    net_profit: netProfit,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
  })
})

// General Ledger — lines for one account.
reportsRouter.get('/reports/general-ledger', (req, res) => {
  if (!req.query.account_code) return res.status(400).json({ error: 'account_code required' })
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT je.id entry_id, je.date, je.serial_number, je.doc_number, jl.description,
              jl.debit, jl.credit, jl.currency, jl.price, je.company_id, je.project_id
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       WHERE ${where} AND jl.account_code = ?
       ORDER BY je.date, je.serial_number`,
    )
    .all(...params, req.query.account_code) as Array<{ debit: number; credit: number; price: number; currency: string }>
  let running = 0
  let totalUsd = 0
  const withBalance = rows.map((r) => {
    const rate = r.price > 0 ? r.price : 1
    const debit_iqd = r.debit * rate
    const credit_iqd = r.credit * rate
    running += debit_iqd - credit_iqd
    if (r.currency === 'USD') totalUsd += r.debit - r.credit
    return { ...r, debit_iqd, credit_iqd, balance: running }
  })
  res.json({ rows: withBalance, total_iqd: running, total_usd: totalUsd })
})

// Journal — entries chronologically.
reportsRouter.get('/reports/journal', (req, res) => {
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT DISTINCT je.* FROM journal_entries je
       JOIN journal_lines jl ON jl.entry_id = je.id
       WHERE ${where}
       ORDER BY je.date DESC, je.serial_number DESC LIMIT 500`,
    )
    .all(...params)
  res.json({ rows })
})

// Project / Company P&L — convenience wrappers over income statement.
function pnl(req: Request) {
  const { where, params } = buildFilter(req)
  return db
    .prepare(
      `SELECT
         SUM(CASE WHEN a.type='REVENUE' THEN jl.credit - jl.debit ELSE 0 END) revenue,
         SUM(CASE WHEN a.type='EXPENSE' THEN jl.debit - jl.credit ELSE 0 END) expense
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where}`,
    )
    .get(...params) as { revenue: number; expense: number }
}

reportsRouter.get('/reports/project-pnl', (req, res) => {
  const r = pnl(req)
  res.json({ revenue: r?.revenue ?? 0, expense: r?.expense ?? 0, net: (r?.revenue ?? 0) - (r?.expense ?? 0) })
})

reportsRouter.get('/reports/company-pnl', (req, res) => {
  const r = pnl(req)
  res.json({ revenue: r?.revenue ?? 0, expense: r?.expense ?? 0, net: (r?.revenue ?? 0) - (r?.expense ?? 0) })
})
