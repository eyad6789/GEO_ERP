// ============================================================================
// Accounting module — shared helpers, types and small report-data contracts.
// ============================================================================
import type { AccountType } from '../../types'
import type { BadgeColor } from '../../components/ui'

// ---- Report response shapes (mirrors the /api/reports/* endpoints) ----------
export interface TrialBalanceRow {
  code: string
  name_ar: string
  name_en: string
  type: AccountType
  total_debit: number // IQD lines only
  total_credit: number // IQD lines only
  balance: number // IQD balance
  balance_iqd?: number // IQD lines only (no conversion)
  balance_usd?: number // USD lines only
  debit_usd?: number
  credit_usd?: number
}
export interface TrialBalanceResp {
  rows: TrialBalanceRow[]
  totals: { debit: number; credit: number; debit_usd: number; credit_usd: number }
}

export interface IncomeLine {
  code: string
  name_ar: string
  name_en: string
  amount: number // IQD lines only
  amount_usd?: number // USD lines only
}
export interface IncomeStatementResp {
  revenue: IncomeLine[]
  expense: IncomeLine[]
  total_revenue: number
  total_expense: number
  net_profit: number
  total_revenue_usd?: number
  total_expense_usd?: number
  net_profit_usd?: number
}

export interface BalanceSheetLine {
  code: string
  name_ar: string
  name_en: string
  amount?: number
  balance?: number
}
export interface BalanceSheetResp {
  assets: BalanceSheetLine[]
  liabilities: BalanceSheetLine[]
  equity: BalanceSheetLine[]
  net_profit: number
  total_assets: number
  total_liabilities: number
  total_equity: number
  balanced: boolean
  net_profit_usd?: number
  total_assets_usd?: number
  total_liabilities_usd?: number
  total_equity_usd?: number
  balanced_usd?: boolean
}

export interface LedgerRow {
  entry_id?: string
  date: string
  serial_number: string
  doc_number: string
  description: string
  debit: number
  credit: number
  currency?: string
  price?: number
  debit_iqd?: number
  credit_iqd?: number
  balance: number
}
export interface GeneralLedgerResp {
  rows: LedgerRow[]
  total_iqd?: number
  total_usd?: number
}

export interface PnlResp {
  revenue: number
  expense: number
  net: number
  revenue_usd?: number
  expense_usd?: number
  net_usd?: number
}

export interface JournalEntryFull {
  id: string
  serial_number: string
  doc_number: string
  company_id: string | null
  project_id: string | null
  date: string
  description: string
  currency: string
  exchange_rate?: number
  status: string
  total_debit: number
  total_credit: number
  lines: Array<{
    id: string
    account_code: string
    description: string
    debit: number
    credit: number
    company_id?: string | null
    project_id?: string | null
    currency?: string
    price?: number
  }>
}

// ---- Account class -> visual identity --------------------------------------
export const ACCOUNT_TYPE_COLOR: Record<AccountType, BadgeColor> = {
  ASSET: 'blue',
  LIABILITY: 'amber',
  EQUITY: 'purple',
  REVENUE: 'green',
  EXPENSE: 'red',
}

// Tailwind tint classes for tree row dots / accents per class.
export const ACCOUNT_TYPE_DOT: Record<AccountType, string> = {
  ASSET: 'bg-blue-500',
  LIABILITY: 'bg-amber-500',
  EQUITY: 'bg-purple-500',
  REVENUE: 'bg-emerald-500',
  EXPENSE: 'bg-red-500',
}

/** Pretty money with the active language, always IQD-style separators. */
export function isBalanced(a: number, b: number): boolean {
  return Math.round((a - b) * 100) === 0
}

// ---- Access control --------------------------------------------------------
// Editing in the Accounting module is restricted to the Accountant role ONLY.
// Every other role — including the super admin — gets read-only.
export const ACCOUNTING_EDIT_ROLES = ['accountant']

export function canEditAccounting(roleKey: string): boolean {
  return ACCOUNTING_EDIT_ROLES.includes(roleKey)
}

// ---- Account groupings (used by Vouchers / Parties / Cash & Bank tabs) -------
// Iraqi Unified Accounting System codes (النظام المحاسبي الموحد).
export const CASH_PARENT = '18' // النقود (cash group)
export const CASH_ACCOUNT_CODES = ['181', '182', '183'] // صندوق د.ع / صندوق $ / المصارف
export const AR_PARENT = '16' // المدينون (debtors / receivables)
export const AP_PARENT = '26' // الدائنون (creditors / payables)

// Dedicated cash-box / advance accounts (Cash & Bank tab balance logic).
export const CASH_BOX_IQD = '181' // صندوق د.ع
export const CASH_BOX_USD = '182' // صندوق $
export const BANKS_ACCOUNT = '183' // المصارف
export const OPERATIONAL_ADVANCE = '16112' // السلف التشغيلية
export const MAIN_CASH_BOX = '181' // treated as the primary box for current/actual

export interface AdvanceSplit {
  cash: { iqd: number; usd: number }
  bank: { iqd: number; usd: number }
  other: { iqd: number; usd: number }
}

export interface CashMovement {
  entry_id: string
  date: string
  serial_number: string
  doc_number: string
  description: string
  cash_account: string
  counter_account: string | null
  debit: number
  credit: number
  company_id: string | null
  project_id: string | null
  currency: string
}

// Voucher classification: قبض (receipt) / صرف (payment) / قيد (journal entry).
export type VoucherType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL'

export interface VoucherRow {
  entry_id: string
  date: string
  serial_number: string
  doc_number: string
  description: string
  amount: number
  company_id: string | null
  project_id: string | null
  currency: string
  cash_debit: number
  cash_credit: number
  cash_account: string | null
  counter_account: string | null
  line_count: number
}

export function classifyVoucher(r: { cash_debit: number; cash_credit: number }): VoucherType {
  if (r.cash_debit > 0) return 'RECEIPT'
  if (r.cash_credit > 0) return 'PAYMENT'
  return 'JOURNAL'
}

/**
 * Rolled-up balance of an account: its own balance plus every descendant's.
 * So anything posted under a child (e.g. أحمد under السلف التشغيلية) bubbles up
 * to the parent everywhere it's shown.
 */
export function rolledBalance(
  rootCode: string,
  accounts: Array<{ code: string; parent_code: string | null }>,
  iqd: Map<string, number>,
  usd: Map<string, number>,
): { iqd: number; usd: number } {
  const childrenByParent = new Map<string, string[]>()
  for (const a of accounts) {
    if (a.parent_code) {
      const list = childrenByParent.get(a.parent_code) ?? []
      list.push(a.code)
      childrenByParent.set(a.parent_code, list)
    }
  }
  let i = 0
  let u = 0
  const visit = (code: string) => {
    i += iqd.get(code) ?? 0
    u += usd.get(code) ?? 0
    for (const c of childrenByParent.get(code) ?? []) visit(c)
  }
  visit(rootCode)
  return { iqd: i, usd: u }
}
