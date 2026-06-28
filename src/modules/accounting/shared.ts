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
    vehicle_id?: string | null
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

// ---- Parties (Customers / Suppliers) source nodes --------------------------
// The Parties tab lists the posting sub-accounts under these tree nodes:
//   • Customers (العملاء) live under سلف المشاريع (164).
//   • Suppliers (الموردون) are taken from المدينون (16) — all its posting leaves.
// We resolve POSTING DESCENDANTS (not just direct children) so a node that is
// itself a posting leaf still shows up, and a deeper prod chart expands fully.
export const CUSTOMER_ROOTS = ['164'] // العملاء — سلف المشاريع
export const SUPPLIER_ROOTS = ['16114'] // الموردون — سلف المنتسبين (all posting leaves)
export const CONTRACTOR_ROOTS = ['165'] // سلف المقاولين (contractors' advances)

// Dedicated cash-box / advance accounts (Cash & Bank tab balance logic).
export const CASH_BOX_IQD = '181' // صندوق د.ع
export const CASH_BOX_USD = '182' // صندوق $
export const BANKS_ACCOUNT = '183' // المصارف
export const OPERATIONAL_ADVANCE = '16112' // السلف التشغيلية
export const MAIN_CASH_BOX = '181' // treated as the primary box for current/actual

// ---- Chart-agnostic cash / bank / advance resolution -----------------------
// The chart of accounts differs by deployment: the demo uses the Iraqi Unified
// codes (181/182 cash, 183 banks, 16112 advance) while production books use an
// IFRS-style chart (1111 cash, 1112 banks, 1152 employee advance). We list the
// CANDIDATE roots per concept and resolve whichever exist in the live tree, so
// the cash page works regardless of which chart is loaded.
export const CASH_BOX_ROOTS = ['181', '182', '1111'] // physical cash box(es)
export const BANK_ROOTS = ['183', '1112'] // banks (header + sub-accounts, or the account itself)
export const ADVANCE_ROOTS = ['16112', '1152'] // operational / employee advance

// Expense accounts that belong to a vehicle/الآلية. When a journal line posts to
// one of these (or a descendant), the entry asks which vehicle it is for, so the
// car's cost history is built from real journal entries.
//   351 الوقود (3511 بنزين / 3512 زيوت / 3513 كاز), 3202 صيانة الآلات الكبيرة,
//   3203 صيانة وسائل النقل الصغيرة, 352 الخامات, 353 ماء وكهرباء, 3211 استئجار وسائل النقل
export const VEHICLE_EXPENSE_ROOTS = ['351', '3202', '3203', '352', '353', '3211']

// Map a vehicle expense account code to a cost category key (for grouping).
export function vehicleCostCategory(code: string): string {
  if (code === '351' || code.startsWith('351')) return 'FUEL'
  if (code === '3202' || code === '3203') return 'MAINTENANCE'
  if (code === '352' || code.startsWith('352')) return 'MATERIALS'
  if (code === '3531') return 'WATER'
  if (code === '3532') return 'ELECTRICITY'
  if (code === '353' || code.startsWith('353')) return 'UTILITIES'
  if (code === '3211') return 'RENT'
  return 'OTHER'
}

/** Posting (leaf) account codes under any of the given roots, from the live tree. */
export function resolvePostingDescendants(
  roots: string[],
  accounts: Array<{ code: string; parent_code: string | null; is_posting?: number }>,
): string[] {
  const kids = new Map<string, string[]>()
  const posting = new Set<string>()
  for (const a of accounts) {
    if (a.is_posting === 1) posting.add(a.code)
    if (a.parent_code) {
      const list = kids.get(a.parent_code) ?? []
      list.push(a.code)
      kids.set(a.parent_code, list)
    }
  }
  const out = new Set<string>()
  const stack = [...roots]
  while (stack.length) {
    const c = stack.pop() as string
    if (posting.has(c)) out.add(c)
    for (const k of kids.get(c) ?? []) stack.push(k)
  }
  return [...out]
}

/** First candidate root that exists as an account (for links / defaults). */
export function firstExistingCode(candidates: string[], codes: Set<string>): string | undefined {
  return candidates.find((c) => codes.has(c))
}

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
  exchange_rate?: number
  cash_debit: number
  cash_credit: number
  cash_account: string | null
  counter_account: string | null
  line_count: number
}

// Classify by NET cash movement so an entry with cash on both sides (e.g. funding
// an operational advance out of the cash box) reads as an internal journal, not a
// phantom receipt or payment. Net money in → receipt, net money out → payment.
export function classifyVoucher(r: { cash_debit: number; cash_credit: number }): VoucherType {
  const net = Math.round(((r.cash_debit || 0) - (r.cash_credit || 0)) * 100)
  if (net > 0) return 'RECEIPT'
  if (net < 0) return 'PAYMENT'
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
