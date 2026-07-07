// Accounting overrides: balanced journal-entry creation (+ lines) and a
// convenience endpoint to fetch an entry together with its lines.
import { Router } from 'express'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const accountingRouter = Router()

interface IncomingLine {
  account_code: string
  description?: string
  currency?: string
  price?: number
  value?: number
  debit?: number
  credit?: number
  company_id?: string | null
  project_id?: string | null
  vehicle_id?: string | null
}

// Dinar value of a line = amount × exchange rate (price). IQD lines have rate 1.
// Used so multi-currency / tasarif entries balance on their IQD-equivalent.
const lineRate = (l: IncomingLine) => {
  const r = Number(l.price)
  return r > 0 ? r : 1
}

// POST /api/journal_entries — validates Σ(debit×rate) === Σ(credit×rate), inserts atomically.
// (Overrides the generic POST for the same resource, so the frontend uses the
//  same /api/journal_entries path it lists from.)
accountingRouter.post('/journal_entries', (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  const lines = (b.lines as IncomingLine[]) ?? []
  if (!Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'يجب أن يحتوي القيد على سطرين على الأقل / Entry needs at least 2 lines' })
  }

  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100
  const totalDebit = round(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0))
  const totalCredit = round(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0))
  // Balance check is on the DINAR VALUE (amount × rate), so a tasarif entry
  // ($100 debit vs 150,000 IQD credit) balances when the IQD values match.
  const valDebit = round(lines.reduce((s, l) => s + (Number(l.debit) || 0) * lineRate(l), 0))
  const valCredit = round(lines.reduce((s, l) => s + (Number(l.credit) || 0) * lineRate(l), 0))

  if (valDebit !== valCredit) {
    return res.status(400).json({
      error: `القيد غير متوازن (بالقيمة بالدينار): مدين ${valDebit} ≠ دائن ${valCredit} / Entry not balanced by dinar value`,
    })
  }
  if (valDebit === 0) {
    return res.status(400).json({ error: 'قيمة القيد صفر / Entry total is zero' })
  }

  const entryId = genId('je')
  const companyId = (b.company_id as string) ?? null
  const projectId = (b.project_id as string) ?? null
  const currency = (b.currency as string) ?? 'IQD'

  const insertEntry = db.prepare(`
    INSERT INTO journal_entries (id, serial_number, doc_number, company_id, project_id, date, description, currency, exchange_rate, status, total_debit, total_credit, created_at)
    VALUES (@id,@serial_number,@doc_number,@company_id,@project_id,@date,@description,@currency,@exchange_rate,@status,@total_debit,@total_credit,@created_at)
  `)
  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, entry_id, account_code, company_id, project_id, description, currency, price, value, debit, credit, vehicle_id)
    VALUES (@id,@entry_id,@account_code,@company_id,@project_id,@description,@currency,@price,@value,@debit,@credit,@vehicle_id)
  `)

  const tx = db.transaction(() => {
    insertEntry.run({
      id: entryId,
      serial_number: (b.serial_number as string) ?? `JV-${Date.now().toString().slice(-6)}`,
      doc_number: (b.doc_number as string) ?? '',
      company_id: companyId,
      project_id: projectId,
      date: (b.date as string) ?? nowISO().slice(0, 10),
      description: (b.description as string) ?? '',
      currency,
      exchange_rate: Number(b.exchange_rate) || 1,
      status: (b.status as string) ?? 'APPROVED',
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_at: nowISO(),
    })
    for (const l of lines) {
      insertLine.run({
        id: genId('jl'),
        entry_id: entryId,
        account_code: l.account_code,
        company_id: l.company_id ?? companyId,
        project_id: l.project_id ?? projectId,
        description: l.description ?? (b.description as string) ?? '',
        currency: l.currency ?? currency,
        price: Number(l.price) || 0,
        value: Number(l.value) || Number(l.debit) || Number(l.credit) || 0,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        vehicle_id: l.vehicle_id ?? null,
      })
    }
  })

  try {
    tx()
    logEvent({
      module: 'ACCOUNTING',
      action: 'CREATE',
      record_type: 'journal_entries',
      record_id: entryId,
      record_description: (b.description as string) ?? 'قيد محاسبي',
      company_id: companyId,
      new_values: { total: totalDebit, lines: lines.length },
    })
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(entryId)
    res.status(201).json(entry)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// PUT /api/journal_entries/:id — edit an entry (header + lines). All entries are
// approved by default and remain editable.
accountingRouter.put('/journal_entries/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const b = (req.body ?? {}) as Record<string, unknown>
  const lines = b.lines as IncomingLine[] | undefined
  const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100
  let totalDebit = Number(existing.total_debit) || 0
  let totalCredit = Number(existing.total_credit) || 0

  if (Array.isArray(lines)) {
    if (lines.length < 2) return res.status(400).json({ error: 'يجب أن يحتوي القيد على سطرين على الأقل / Entry needs at least 2 lines' })
    totalDebit = round(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0))
    totalCredit = round(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0))
    const valDebit = round(lines.reduce((s, l) => s + (Number(l.debit) || 0) * lineRate(l), 0))
    const valCredit = round(lines.reduce((s, l) => s + (Number(l.credit) || 0) * lineRate(l), 0))
    if (valDebit !== valCredit) return res.status(400).json({ error: `القيد غير متوازن (بالقيمة بالدينار): مدين ${valDebit} ≠ دائن ${valCredit} / Entry not balanced by dinar value` })
    if (valDebit === 0) return res.status(400).json({ error: 'قيمة القيد صفر / Entry total is zero' })
  }

  const companyId = (b.company_id as string) ?? (existing.company_id as string) ?? null
  const projectId = (b.project_id as string) ?? (existing.project_id as string) ?? null
  const currency = (b.currency as string) ?? (existing.currency as string) ?? 'IQD'
  const exchangeRate = Number(b.exchange_rate) || Number(existing.exchange_rate) || 1
  const status = (b.status as string) ?? (existing.status as string) ?? 'APPROVED'

  const insertLine = db.prepare(`
    INSERT INTO journal_lines (id, entry_id, account_code, company_id, project_id, description, currency, price, value, debit, credit, vehicle_id)
    VALUES (@id,@entry_id,@account_code,@company_id,@project_id,@description,@currency,@price,@value,@debit,@credit,@vehicle_id)
  `)

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE journal_entries SET serial_number=@serial_number, doc_number=@doc_number, company_id=@company_id,
        project_id=@project_id, date=@date, description=@description, currency=@currency, exchange_rate=@exchange_rate,
        status=@status, total_debit=@total_debit, total_credit=@total_credit WHERE id=@id`,
    ).run({
      id,
      serial_number: (b.serial_number as string) ?? existing.serial_number,
      doc_number: (b.doc_number as string) ?? existing.doc_number,
      company_id: companyId,
      project_id: projectId,
      date: (b.date as string) ?? existing.date,
      description: (b.description as string) ?? existing.description,
      currency,
      exchange_rate: exchangeRate,
      status,
      total_debit: totalDebit,
      total_credit: totalCredit,
    })
    if (Array.isArray(lines)) {
      db.prepare('DELETE FROM journal_lines WHERE entry_id = ?').run(id)
      for (const l of lines) {
        insertLine.run({
          id: genId('jl'),
          entry_id: id,
          account_code: l.account_code,
          company_id: l.company_id ?? companyId,
          project_id: l.project_id ?? projectId,
          description: l.description ?? (b.description as string) ?? '',
          currency: l.currency ?? currency,
          price: Number(l.price) || 0,
          value: Number(l.value) || Number(l.debit) || Number(l.credit) || 0,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          vehicle_id: l.vehicle_id ?? null,
        })
      }
    }
  })

  try {
    tx()
    logEvent({
      module: 'ACCOUNTING',
      action: status === 'APPROVED' ? 'APPROVE' : 'UPDATE',
      record_type: 'journal_entries',
      record_id: id,
      record_description: (b.description as string) ?? (existing.description as string) ?? 'قيد محاسبي',
      company_id: companyId,
      old_values: { status: existing.status },
      new_values: { status, total: totalDebit },
    })
    res.json(db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// DELETE /api/journal_entries/:id — remove an entry and its lines atomically.
// (Overrides the generic resource delete, which would orphan journal_lines since
//  the schema has no ON DELETE CASCADE.)
accountingRouter.delete('/journal_entries/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!existing) return res.status(404).json({ error: 'Not found' })
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM journal_lines WHERE entry_id = ?').run(id)
      db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id)
    })()
    logEvent({
      module: 'ACCOUNTING',
      action: 'DELETE',
      record_type: 'journal_entries',
      record_id: id,
      record_description: (existing.description as string) ?? 'قيد محاسبي',
      company_id: (existing.company_id as string) ?? null,
      old_values: { serial_number: existing.serial_number, total: existing.total_debit },
    })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/journal_entries/:id/full — entry plus its lines.
accountingRouter.get('/journal_entries/:id/full', (req, res) => {
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Not found' })
  const lines = db.prepare('SELECT * FROM journal_lines WHERE entry_id = ?').all(req.params.id)
  res.json({ ...entry, lines })
})

// PUT /api/accounts/:code/recode — change an account's code (its number),
// cascading the new code everywhere it is referenced: child accounts'
// parent_code, journal lines, and linked bank / vehicle accounts. This lets a
// mis-typed account number be corrected without losing any of its history.
accountingRouter.put('/accounts/:code/recode', (req, res) => {
  const oldCode = req.params.code
  const newCode = String((req.body?.new_code ?? '')).trim()
  if (!newCode) return res.status(400).json({ error: 'new_code required' })
  const acc = db.prepare(`SELECT * FROM accounts WHERE code = ?`).get(oldCode) as Record<string, unknown> | undefined
  if (!acc) return res.status(404).json({ error: 'Account not found' })
  if (newCode === oldCode) return res.json(acc)
  if (db.prepare(`SELECT 1 FROM accounts WHERE code = ?`).get(newCode)) {
    return res.status(409).json({ error: 'An account with this code already exists' })
  }

  const hasCol = (table: string, col: string) => {
    try {
      return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).some((c) => c.name === col)
    } catch {
      return false
    }
  }
  try {
    db.transaction(() => {
      db.prepare(`UPDATE accounts SET code = ? WHERE code = ?`).run(newCode, oldCode)
      db.prepare(`UPDATE accounts SET parent_code = ? WHERE parent_code = ?`).run(newCode, oldCode)
      db.prepare(`UPDATE journal_lines SET account_code = ? WHERE account_code = ?`).run(newCode, oldCode)
      if (hasCol('banks', 'account_code')) db.prepare(`UPDATE banks SET account_code = ? WHERE account_code = ?`).run(newCode, oldCode)
      if (hasCol('vehicles', 'account_code')) db.prepare(`UPDATE vehicles SET account_code = ? WHERE account_code = ?`).run(newCode, oldCode)
    })()
    const row = db.prepare(`SELECT * FROM accounts WHERE code = ?`).get(newCode)
    logEvent({
      module: 'ACCOUNTING',
      action: 'UPDATE',
      record_type: 'accounts',
      record_id: newCode,
      record_description: `${String(acc.name_ar ?? '')} (${oldCode} → ${newCode})`,
      old_values: { code: oldCode },
      new_values: { code: newCode },
    })
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ---- Banks ↔ chart of accounts -------------------------------------------
// Each bank is mirrored as a posting sub-account under 183 المصارف (inside
// النقود 18). Creating/editing/deleting a bank keeps that GL account in sync.
const BANKS_PARENT = '183'

function nextBankAccountCode(): string {
  const rows = db.prepare(`SELECT code FROM accounts WHERE parent_code = ?`).all(BANKS_PARENT) as Array<{ code: string }>
  const exists = db.prepare(`SELECT 1 FROM accounts WHERE code = ?`)
  let n = rows.length + 1
  let code = `${BANKS_PARENT}${String(n).padStart(2, '0')}`
  while (exists.get(code)) {
    n++
    code = `${BANKS_PARENT}${String(n).padStart(2, '0')}`
  }
  return code
}

accountingRouter.post('/banks', (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>
  const id = genId('ban')
  const code = nextBankAccountCode()
  const nameAr = (b.name_ar as string) ?? 'مصرف'
  const nameEn = (b.name_en as string) ?? ''
  try {
    db.transaction(() => {
      // المصارف (183) becomes a header once it has children.
      db.prepare(`UPDATE accounts SET is_posting = 0 WHERE code = ?`).run(BANKS_PARENT)
      db.prepare(
        `INSERT INTO accounts (code, name_ar, name_en, type, normal_balance, parent_code, level, is_posting, sort_order, archived)
         VALUES (?, ?, ?, 'ASSET', 'DEBIT', ?, 4, 1, 1000, 0)`,
      ).run(code, nameAr, nameEn, BANKS_PARENT)
      db.prepare(
        `INSERT INTO banks (id, name_ar, name_en, account_number, branch, company_id,
            opening_balance_iqd, opening_balance_usd, balance_iqd, balance_usd, status, account_code, created_at)
         VALUES (@id,@name_ar,@name_en,@account_number,@branch,@company_id,@oi,@ou,@bi,@bu,@status,@account_code,@created_at)`,
      ).run({
        id, name_ar: nameAr, name_en: nameEn,
        account_number: (b.account_number as string) ?? '',
        branch: (b.branch as string) ?? '',
        company_id: (b.company_id as string) ?? null,
        oi: Number(b.opening_balance_iqd) || 0,
        ou: Number(b.opening_balance_usd) || 0,
        bi: Number(b.balance_iqd) || 0,
        bu: Number(b.balance_usd) || 0,
        status: (b.status as string) ?? 'ACTIVE',
        account_code: code,
        created_at: nowISO(),
      })
    })()
    logEvent({
      module: 'ACCOUNTING', action: 'CREATE', record_type: 'banks', record_id: id,
      record_description: nameAr, company_id: (b.company_id as string) ?? null, new_values: { account_code: code },
    })
    res.status(201).json(db.prepare('SELECT * FROM banks WHERE id = ?').get(id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

accountingRouter.put('/banks/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM banks WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const b = (req.body ?? {}) as Record<string, unknown>
  const pick = (k: string, fallback: unknown) => (b[k] !== undefined ? b[k] : fallback)
  const nameAr = (pick('name_ar', existing.name_ar) as string) ?? ''
  const nameEn = (pick('name_en', existing.name_en) as string) ?? ''
  try {
    db.transaction(() => {
      db.prepare(
        `UPDATE banks SET name_ar=@name_ar, name_en=@name_en, account_number=@account_number, branch=@branch,
            company_id=@company_id, opening_balance_iqd=@oi, opening_balance_usd=@ou,
            balance_iqd=@bi, balance_usd=@bu, status=@status WHERE id=@id`,
      ).run({
        id, name_ar: nameAr, name_en: nameEn,
        account_number: pick('account_number', existing.account_number) ?? '',
        branch: pick('branch', existing.branch) ?? '',
        company_id: pick('company_id', existing.company_id) ?? null,
        oi: Number(pick('opening_balance_iqd', existing.opening_balance_iqd)) || 0,
        ou: Number(pick('opening_balance_usd', existing.opening_balance_usd)) || 0,
        bi: Number(pick('balance_iqd', existing.balance_iqd)) || 0,
        bu: Number(pick('balance_usd', existing.balance_usd)) || 0,
        status: pick('status', existing.status) ?? 'ACTIVE',
      })
      // keep the linked GL account's name in sync
      if (existing.account_code) {
        db.prepare(`UPDATE accounts SET name_ar = ?, name_en = ? WHERE code = ?`).run(nameAr, nameEn, existing.account_code)
      }
    })()
    res.json(db.prepare('SELECT * FROM banks WHERE id = ?').get(id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

accountingRouter.delete('/banks/:id', (req, res) => {
  const id = req.params.id
  const existing = db.prepare('SELECT * FROM banks WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!existing) return res.status(404).json({ error: 'Not found' })
  try {
    db.transaction(() => {
      // archive (soft-delete) the linked GL account, then remove the bank.
      if (existing.account_code) {
        db.prepare(`UPDATE accounts SET archived = 1 WHERE code = ?`).run(existing.account_code)
      }
      db.prepare('DELETE FROM banks WHERE id = ?').run(id)
    })()
    logEvent({
      module: 'ACCOUNTING', action: 'DELETE', record_type: 'banks', record_id: id,
      record_description: (existing.name_ar as string) ?? 'بنك', company_id: (existing.company_id as string) ?? null,
    })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// ---- Cash-equivalent account resolution (shared by movements & vouchers) ----
// The chart of accounts differs between deployments: the demo uses the Iraqi
// Unified codes (cash boxes 181/182, banks under 183, advance 16112) while the
// production books use an IFRS-style chart (cash 1111, banks 1112, employee
// advances 1152). So instead of hard-coding one scheme we list CANDIDATE roots
// for each concept and resolve whichever actually exist in the live tree (by
// posting descendants). This is why the old fixed list ['181','182','183'] —
// which matched neither bank sub-accounts nor the production chart — mislabelled
// every cash/bank/advance movement as a plain journal ("بدون نقد").
const CASH_BOX_ROOTS = ['181', '182', '1111'] // physical cash box(es)
const BANK_ROOTS = ['183', '1112'] // banks (header + sub-accounts, or the account itself)
const ADVANCE_ROOTS = ['16112', '1152'] // operational / employee advance

// All posting (leaf) account codes under the given roots, read from the live tree.
function postingDescendants(roots: string[]): string[] {
  const accounts = db.prepare('SELECT code, parent_code, is_posting FROM accounts').all() as Array<{
    code: string
    parent_code: string | null
    is_posting: number
  }>
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

const cashBoxCodes = () => postingDescendants(CASH_BOX_ROOTS) // cash on hand only
const bankCodes = () => postingDescendants(BANK_ROOTS) // banks only
const cashBankCodes = () => postingDescendants([...CASH_BOX_ROOTS, ...BANK_ROOTS]) // cash + banks
const advanceCodes = () => postingDescendants(ADVANCE_ROOTS)
// Cash-equivalent set used to classify a voucher as receipt / payment / journal.
const cashEquivCodes = () => [...new Set([...cashBankCodes(), ...advanceCodes()])]

// GET /api/accounting/advance-split — operational/employee advance split by
// funding source. For each entry touching the advance subtree, the net advance
// is attributed to CASH (entry also touches a cash box) or BANK (entry also
// touches a bank account). Account codes are resolved chart-agnostically.
accountingRouter.get('/accounting/advance-split', (req, res) => {
  const advanceSet = new Set(advanceCodes())
  const bankSet = new Set(bankCodes())
  const cashSet = new Set(cashBoxCodes())

  const where = ["je.status != 'CANCELLED'"]
  const params: unknown[] = []
  if (req.query.company_id) {
    where.push('jl.company_id = ?')
    params.push(req.query.company_id)
  }
  const lines = db
    .prepare(
      `SELECT jl.entry_id, jl.account_code, jl.debit, jl.credit, jl.currency, jl.price
       FROM journal_lines jl JOIN journal_entries je ON je.id = jl.entry_id
       WHERE ${where.join(' AND ')}`,
    )
    .all(...params) as Array<{ entry_id: string; account_code: string; debit: number; credit: number; currency: string; price: number }>

  const byEntry = new Map<string, typeof lines>()
  for (const l of lines) {
    const list = byEntry.get(l.entry_id) ?? []
    list.push(l)
    byEntry.set(l.entry_id, list)
  }

  const acc = { cash: { iqd: 0, usd: 0 }, bank: { iqd: 0, usd: 0 }, other: { iqd: 0, usd: 0 } }
  for (const els of byEntry.values()) {
    let advIqd = 0
    let advUsd = 0
    let hasCash = false
    let hasBank = false
    for (const l of els) {
      if (advanceSet.has(l.account_code)) {
        const rate = l.price > 0 ? l.price : 1
        advIqd += (l.debit - l.credit) * rate
        if (l.currency === 'USD') advUsd += l.debit - l.credit
      }
      if (cashSet.has(l.account_code)) hasCash = true
      if (bankSet.has(l.account_code)) hasBank = true
    }
    if (advIqd === 0 && advUsd === 0) continue
    const bucket = hasCash ? acc.cash : hasBank ? acc.bank : acc.other
    bucket.iqd += advIqd
    bucket.usd += advUsd
  }
  res.json(acc)
})

// GET /api/accounting/cash-movements — one row per entry that nets a change in
// cash (cash boxes + banks + the operational-advance subtree). Net debit →
// receipt (money in), net credit → payment (money out). Pure internal moves
// (e.g. funding an advance out of the box, or cash↔bank transfers) net to zero
// and are skipped, so a single transfer never shows up as both a receipt and a
// payment.
accountingRouter.get('/accounting/cash-movements', (req, res) => {
  const cashCodes = cashEquivCodes()
  if (cashCodes.length === 0) return res.json({ rows: [] })
  const cashSet = new Set(cashCodes)
  const placeholders = cashCodes.map(() => '?').join(',')

  const where = ["je.status != 'CANCELLED'"]
  const params: unknown[] = []
  if (req.query.company_id) {
    where.push('je.company_id = ?')
    params.push(req.query.company_id)
  }
  const limit = Math.min(Number(req.query.limit) || 300, 2000)

  const lines = db
    .prepare(
      `SELECT je.id entry_id, je.date, je.serial_number, je.doc_number, je.description,
              je.company_id, je.project_id, je.currency, jl.account_code, jl.debit, jl.credit
       FROM journal_entries je
       JOIN journal_lines jl ON jl.entry_id = je.id
       WHERE ${where.join(' AND ')}
         AND je.id IN (SELECT entry_id FROM journal_lines WHERE account_code IN (${placeholders}))
       ORDER BY je.date DESC, je.serial_number DESC`,
    )
    .all(...params, ...cashCodes) as Array<{
    entry_id: string
    date: string
    serial_number: string
    doc_number: string
    description: string
    company_id: string | null
    project_id: string | null
    currency: string
    account_code: string
    debit: number
    credit: number
  }>

  interface Movement {
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
  const byEntry = new Map<string, Movement & { net: number }>()
  for (const l of lines) {
    let m = byEntry.get(l.entry_id)
    if (!m) {
      m = {
        entry_id: l.entry_id,
        date: l.date,
        serial_number: l.serial_number,
        doc_number: l.doc_number,
        description: l.description,
        company_id: l.company_id,
        project_id: l.project_id,
        currency: l.currency,
        cash_account: '',
        counter_account: null,
        debit: 0,
        credit: 0,
        net: 0,
      }
      byEntry.set(l.entry_id, m)
    }
    if (cashSet.has(l.account_code)) {
      m.net += l.debit - l.credit
      if (!m.cash_account) m.cash_account = l.account_code
    } else if (!m.counter_account) {
      m.counter_account = l.account_code
    }
  }

  const rows: Movement[] = []
  for (const m of byEntry.values()) {
    if (Math.round(m.net * 100) === 0) continue // pure internal transfer
    m.debit = m.net > 0 ? m.net : 0
    m.credit = m.net < 0 ? -m.net : 0
    delete (m as Partial<typeof m>).net
    rows.push(m)
    if (rows.length >= limit) break
  }
  res.json({ rows })
})

// GET /api/accounting/vouchers — ALL entries classified by NET cash movement:
//   net cash debit -> RECEIPT (قبض), net cash credit -> PAYMENT (صرف),
//   no net cash change -> JOURNAL (قيد). "Cash" = cash boxes + bank sub-accounts
//   + the operational-advance subtree (see cashEquivCodes). Account codes are our
//   own numeric chart codes, so inlining them as quoted literals is injection-safe.
accountingRouter.get('/accounting/vouchers', (req, res) => {
  const CASH_IN = cashEquivCodes().map((c) => `'${c}'`).join(',') || "''"
  const where = ["je.status != 'CANCELLED'"]
  const params: unknown[] = []
  if (req.query.company_id) {
    where.push('je.company_id = ?')
    params.push(req.query.company_id)
  }
  // Journal filters — match an entry if ANY of its lines matches (so multi-line
  // entries and per-line company/project are caught).
  if (req.query.fcompany) {
    where.push('EXISTS (SELECT 1 FROM journal_lines x WHERE x.entry_id = je.id AND x.company_id = ?)')
    params.push(req.query.fcompany)
  }
  if (req.query.fproject) {
    where.push('EXISTS (SELECT 1 FROM journal_lines x WHERE x.entry_id = je.id AND x.project_id = ?)')
    params.push(req.query.fproject)
  }
  if (req.query.faccount) {
    where.push('EXISTS (SELECT 1 FROM journal_lines x WHERE x.entry_id = je.id AND x.account_code = ?)')
    params.push(req.query.faccount)
  }
  // Bank filter — match an entry touching the given bank GL account. Separate
  // param from faccount so a bank + account filter can both be active.
  if (req.query.fbank) {
    where.push('EXISTS (SELECT 1 FROM journal_lines x WHERE x.entry_id = je.id AND x.account_code = ?)')
    params.push(req.query.fbank)
  }
  const limit = Math.min(Number(req.query.limit) || 600, 3000)
  const rows = db
    .prepare(
      `SELECT je.id entry_id, je.date, je.serial_number, je.doc_number, je.description,
              je.total_debit amount, je.company_id, je.project_id, je.currency, je.status, je.exchange_rate,
              (SELECT COALESCE(SUM(x.debit),0) FROM journal_lines x WHERE x.entry_id=je.id AND x.account_code IN (${CASH_IN})) cash_debit,
              (SELECT COALESCE(SUM(x.credit),0) FROM journal_lines x WHERE x.entry_id=je.id AND x.account_code IN (${CASH_IN})) cash_credit,
              (SELECT x.account_code FROM journal_lines x WHERE x.entry_id=je.id AND x.account_code IN (${CASH_IN}) LIMIT 1) cash_account,
              (SELECT x.account_code FROM journal_lines x WHERE x.entry_id=je.id AND x.account_code NOT IN (${CASH_IN}) LIMIT 1) counter_account,
              (SELECT COUNT(*) FROM journal_lines x WHERE x.entry_id=je.id) line_count
       FROM journal_entries je
       WHERE ${where.join(' AND ')}
       ORDER BY je.date DESC, je.created_at DESC, je.serial_number DESC
       LIMIT ${limit}`,
    )
    .all(...params)
  res.json({ rows })
})
