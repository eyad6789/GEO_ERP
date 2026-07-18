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

// Trial Balance — debit/credit totals per posting account, kept STRICTLY per
// currency. IQD figures sum only IQD lines; USD figures sum only USD lines.
// Nothing is converted or summed across currencies. (total_debit/total_credit/
// balance mirror the IQD figures for backward compatibility.)
reportsRouter.get('/reports/trial-balance', (req, res) => {
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT a.code, a.name_ar, a.name_en, a.type,
              SUM(CASE WHEN jl.currency = 'USD' THEN 0 ELSE jl.debit END) debit_iqd,
              SUM(CASE WHEN jl.currency = 'USD' THEN 0 ELSE jl.credit END) credit_iqd,
              SUM(CASE WHEN jl.currency = 'USD' THEN jl.debit ELSE 0 END) debit_usd,
              SUM(CASE WHEN jl.currency = 'USD' THEN jl.credit ELSE 0 END) credit_usd
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where}
       GROUP BY a.code
       HAVING debit_iqd != 0 OR credit_iqd != 0 OR debit_usd != 0 OR credit_usd != 0
       ORDER BY a.code`,
    )
    .all(...params) as Array<{ debit_iqd: number; credit_iqd: number; debit_usd: number; credit_usd: number }>
  const out = rows.map((r) => ({
    ...r,
    total_debit: r.debit_iqd,
    total_credit: r.credit_iqd,
    balance: r.debit_iqd - r.credit_iqd,
    balance_iqd: r.debit_iqd - r.credit_iqd,
    balance_usd: r.debit_usd - r.credit_usd,
  }))
  const totals = out.reduce(
    (acc, r) => ({
      debit: acc.debit + r.debit_iqd,
      credit: acc.credit + r.credit_iqd,
      debit_usd: acc.debit_usd + r.debit_usd,
      credit_usd: acc.credit_usd + r.credit_usd,
    }),
    { debit: 0, credit: 0, debit_usd: 0, credit_usd: 0 },
  )
  res.json({ rows: out, totals })
})

// Income Statement — revenue vs expense → net profit, kept per currency.
// amount = IQD-only figure (back-compat); amount_usd = USD-only figure.
reportsRouter.get('/reports/income-statement', (req, res) => {
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT a.code, a.name_ar, a.name_en, a.type,
              CASE WHEN a.type='REVENUE'
                   THEN SUM(CASE WHEN jl.currency='USD' THEN 0 ELSE jl.credit - jl.debit END)
                   ELSE SUM(CASE WHEN jl.currency='USD' THEN 0 ELSE jl.debit - jl.credit END) END amount,
              CASE WHEN a.type='REVENUE'
                   THEN SUM(CASE WHEN jl.currency='USD' THEN jl.credit - jl.debit ELSE 0 END)
                   ELSE SUM(CASE WHEN jl.currency='USD' THEN jl.debit - jl.credit ELSE 0 END) END amount_usd
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where} AND a.type IN ('REVENUE','EXPENSE')
       GROUP BY a.code HAVING amount != 0 OR amount_usd != 0
       ORDER BY a.type, a.code`,
    )
    .all(...params) as Array<{ type: string; amount: number; amount_usd: number }>
  const revenue = rows.filter((r) => r.type === 'REVENUE')
  const expense = rows.filter((r) => r.type === 'EXPENSE')
  const sum = (arr: typeof rows, key: 'amount' | 'amount_usd') => arr.reduce((s, r) => s + r[key], 0)
  const totalRevenue = sum(revenue, 'amount')
  const totalExpense = sum(expense, 'amount')
  const totalRevenueUsd = sum(revenue, 'amount_usd')
  const totalExpenseUsd = sum(expense, 'amount_usd')
  res.json({
    revenue,
    expense,
    total_revenue: totalRevenue,
    total_expense: totalExpense,
    net_profit: totalRevenue - totalExpense,
    total_revenue_usd: totalRevenueUsd,
    total_expense_usd: totalExpenseUsd,
    net_profit_usd: totalRevenueUsd - totalExpenseUsd,
  })
})

// Balance Sheet — assets vs liabilities + equity (+ current net profit),
// kept per currency. IQD and USD are never summed together; the IQD books and
// the USD books each balance on their own.
reportsRouter.get('/reports/balance-sheet', (req, res) => {
  const { where, params } = buildFilter(req)
  const rows = db
    .prepare(
      `SELECT a.code, a.name_ar, a.name_en, a.type,
              CASE WHEN a.type='ASSET'
                   THEN SUM(CASE WHEN jl.currency='USD' THEN 0 ELSE jl.debit - jl.credit END)
                   ELSE SUM(CASE WHEN jl.currency='USD' THEN 0 ELSE jl.credit - jl.debit END) END amount,
              CASE WHEN a.type='ASSET'
                   THEN SUM(CASE WHEN jl.currency='USD' THEN jl.debit - jl.credit ELSE 0 END)
                   ELSE SUM(CASE WHEN jl.currency='USD' THEN jl.credit - jl.debit ELSE 0 END) END amount_usd
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where} AND a.type IN ('ASSET','LIABILITY','EQUITY')
       GROUP BY a.code HAVING amount != 0 OR amount_usd != 0
       ORDER BY a.type, a.code`,
    )
    .all(...params) as Array<{ type: string; amount: number; amount_usd: number }>

  // net profit folds into equity — computed per currency.
  const pnl = db
    .prepare(
      `SELECT
         SUM(CASE WHEN a.type='REVENUE' AND jl.currency!='USD' THEN jl.credit - jl.debit
                  WHEN a.type='EXPENSE' AND jl.currency!='USD' THEN -(jl.debit - jl.credit) ELSE 0 END) net,
         SUM(CASE WHEN a.type='REVENUE' AND jl.currency='USD' THEN jl.credit - jl.debit
                  WHEN a.type='EXPENSE' AND jl.currency='USD' THEN -(jl.debit - jl.credit) ELSE 0 END) net_usd
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where} AND a.type IN ('REVENUE','EXPENSE')`,
    )
    .get(...params) as { net: number; net_usd: number }

  const assets = rows.filter((r) => r.type === 'ASSET')
  const liabilities = rows.filter((r) => r.type === 'LIABILITY')
  const equity = rows.filter((r) => r.type === 'EQUITY')
  const sum = (arr: typeof rows, key: 'amount' | 'amount_usd') => arr.reduce((s, r) => s + r[key], 0)
  const totalAssets = sum(assets, 'amount')
  const totalLiabilities = sum(liabilities, 'amount')
  const netProfit = pnl?.net ?? 0
  const totalEquity = sum(equity, 'amount') + netProfit
  const totalAssetsUsd = sum(assets, 'amount_usd')
  const totalLiabilitiesUsd = sum(liabilities, 'amount_usd')
  const netProfitUsd = pnl?.net_usd ?? 0
  const totalEquityUsd = sum(equity, 'amount_usd') + netProfitUsd
  res.json({
    assets,
    liabilities,
    equity,
    net_profit: netProfit,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    net_profit_usd: netProfitUsd,
    total_assets_usd: totalAssetsUsd,
    total_liabilities_usd: totalLiabilitiesUsd,
    total_equity_usd: totalEquityUsd,
    balanced_usd: Math.abs(totalAssetsUsd - (totalLiabilitiesUsd + totalEquityUsd)) < 1,
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
  // No cross-currency conversion: IQD lines accumulate the IQD running balance,
  // USD lines the USD running balance. Each row's `balance` is the running total
  // in that row's OWN currency.
  let runningIqd = 0
  let runningUsd = 0
  const withBalance = rows.map((r) => {
    if (r.currency === 'USD') {
      runningUsd += r.debit - r.credit
      return { ...r, debit_iqd: 0, credit_iqd: 0, balance: runningUsd }
    }
    runningIqd += r.debit - r.credit
    return { ...r, debit_iqd: r.debit, credit_iqd: r.credit, balance: runningIqd }
  })
  res.json({ rows: withBalance, total_iqd: runningIqd, total_usd: runningUsd })
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
// IQD figures (revenue/expense/net) and USD figures are kept separate.
function pnl(req: Request) {
  const { where, params } = buildFilter(req)
  return db
    .prepare(
      `SELECT
         SUM(CASE WHEN a.type='REVENUE' AND jl.currency!='USD' THEN jl.credit - jl.debit ELSE 0 END) revenue,
         SUM(CASE WHEN a.type='EXPENSE' AND jl.currency!='USD' THEN jl.debit - jl.credit ELSE 0 END) expense,
         SUM(CASE WHEN a.type='REVENUE' AND jl.currency='USD' THEN jl.credit - jl.debit ELSE 0 END) revenue_usd,
         SUM(CASE WHEN a.type='EXPENSE' AND jl.currency='USD' THEN jl.debit - jl.credit ELSE 0 END) expense_usd
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN accounts a ON a.code = jl.account_code
       WHERE ${where}`,
    )
    .get(...params) as { revenue: number; expense: number; revenue_usd: number; expense_usd: number }
}

function pnlResponse(r: ReturnType<typeof pnl>) {
  const revenue = r?.revenue ?? 0
  const expense = r?.expense ?? 0
  const revenueUsd = r?.revenue_usd ?? 0
  const expenseUsd = r?.expense_usd ?? 0
  return {
    revenue,
    expense,
    net: revenue - expense,
    revenue_usd: revenueUsd,
    expense_usd: expenseUsd,
    net_usd: revenueUsd - expenseUsd,
  }
}

reportsRouter.get('/reports/project-pnl', (req, res) => {
  res.json(pnlResponse(pnl(req)))
})

reportsRouter.get('/reports/company-pnl', (req, res) => {
  res.json(pnlResponse(pnl(req)))
})
