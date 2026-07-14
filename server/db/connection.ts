import Database from 'better-sqlite3'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_PATH = join(DATA_DIR, 'erp.db')
const SCHEMA_PATH = join(__dirname, 'schema.sql')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/** Run schema.sql (idempotent — CREATE TABLE IF NOT EXISTS). */
export function initSchema(): void {
  const sql = readFileSync(SCHEMA_PATH, 'utf-8')
  db.exec(sql)
}

// Lightweight migrations for columns added after the first release.
function migrate(): void {
  const cols = db.prepare(`PRAGMA table_info(accounts)`).all() as Array<{ name: string }>
  if (!cols.some((c) => c.name === 'archived')) {
    db.exec(`ALTER TABLE accounts ADD COLUMN archived INTEGER DEFAULT 0`)
  }
  // Manual tree ordering (drag & drop). Backfill from the numeric code so the
  // existing order is preserved on databases created before this column.
  if (!cols.some((c) => c.name === 'sort_order')) {
    db.exec(`ALTER TABLE accounts ADD COLUMN sort_order REAL DEFAULT 0`)
    db.exec(`UPDATE accounts SET sort_order = CAST(code AS REAL) WHERE sort_order = 0 OR sort_order IS NULL`)
  }

  // Journal entries gained a manual exchange rate (IQD<->USD conversion).
  const jeCols = db.prepare(`PRAGMA table_info(journal_entries)`).all() as Array<{ name: string }>
  if (!jeCols.some((c) => c.name === 'exchange_rate')) {
    db.exec(`ALTER TABLE journal_entries ADD COLUMN exchange_rate REAL DEFAULT 1`)
  }

  // The "unapproved" (DRAFT) concept is removed: every entry is approved.
  db.exec(`UPDATE journal_entries SET status = 'APPROVED' WHERE status = 'DRAFT'`)

  // Fleet module: projects gained map coordinates; journal lines can be tagged
  // with a vehicle (vehicle expenses → الآليات). Existing databases need these
  // columns added — CREATE TABLE IF NOT EXISTS only helps brand-new databases.
  const projCols = db.prepare(`PRAGMA table_info(projects)`).all() as Array<{ name: string }>
  if (!projCols.some((c) => c.name === 'lat')) db.exec(`ALTER TABLE projects ADD COLUMN lat REAL`)
  if (!projCols.some((c) => c.name === 'lng')) db.exec(`ALTER TABLE projects ADD COLUMN lng REAL`)
  const jlCols = db.prepare(`PRAGMA table_info(journal_lines)`).all() as Array<{ name: string }>
  if (!jlCols.some((c) => c.name === 'vehicle_id')) db.exec(`ALTER TABLE journal_lines ADD COLUMN vehicle_id TEXT`)

  // الآليات (Fleet) asset group: normalize the Arabic-digit code ٥ → 5 so the
  // generated child codes (5001, 5002, …) sort/work properly.
  if (db.prepare(`SELECT 1 FROM accounts WHERE code = '٥'`).get()) {
    if (!db.prepare(`SELECT 1 FROM accounts WHERE code = '5'`).get()) {
      db.exec(`UPDATE accounts SET code = '5' WHERE code = '٥'`)
      db.exec(`UPDATE accounts SET parent_code = '5' WHERE parent_code = '٥'`)
    }
  }
  // Each vehicle links to its own asset account under اليات.
  const vCols = db.prepare(`PRAGMA table_info(vehicles)`).all() as Array<{ name: string }>
  if (vCols.length && !vCols.some((c) => c.name === 'account_code')) db.exec(`ALTER TABLE vehicles ADD COLUMN account_code TEXT`)
  // Fleet-manager fields: acquisition / sale costs + vehicle & driver license info.
  // Added idempotently so existing databases gain the columns without a reseed.
  if (vCols.length) {
    const vHas = (n: string) => vCols.some((c) => c.name === n)
    const addVCol = (n: string, type: string) => { if (!vHas(n)) db.exec(`ALTER TABLE vehicles ADD COLUMN ${n} ${type}`) }
    addVCol('acquisition_cost', 'REAL')          // how much we paid to get the car
    addVCol('acquisition_currency', 'TEXT')
    addVCol('acquisition_date', 'TEXT')
    addVCol('sale_price', 'REAL')                // how much we sold it for
    addVCol('sale_currency', 'TEXT')
    addVCol('sale_date', 'TEXT')
    addVCol('vehicle_license_no', 'TEXT')        // car registration / license
    addVCol('vehicle_license_expiry', 'TEXT')
    addVCol('driver_phone', 'TEXT')
    addVCol('driver_id_no', 'TEXT')              // driver national ID
    addVCol('driver_address', 'TEXT')
    addVCol('driver_license_no', 'TEXT')
    addVCol('driver_license_expiry', 'TEXT')
    addVCol('ownership', 'TEXT') // PRIVATE (خاصة) | PUBLIC (عامة/حكومية)
  }
  // Per-vehicle / per-driver document archive (license & registration scans).
  db.exec(`CREATE TABLE IF NOT EXISTS vehicle_documents (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT,
    doc_type TEXT,
    title TEXT,
    file_name TEXT,
    mime TEXT,
    size INTEGER,
    expiry TEXT,
    created_at TEXT
  )`)
  ensureVehicleAccounts()

  // Banks ↔ chart of accounts: each bank links to a GL account under 183 المصارف.
  const bankCols = db.prepare(`PRAGMA table_info(banks)`).all() as Array<{ name: string }>
  if (bankCols.length) {
    if (!bankCols.some((c) => c.name === 'account_code')) {
      db.exec(`ALTER TABLE banks ADD COLUMN account_code TEXT`)
    }
    // Backfill GL accounts for any banks not yet linked (only if 183 exists).
    const has183 = db.prepare(`SELECT 1 FROM accounts WHERE code = '183'`).get()
    if (has183) {
      const unlinked = db
        .prepare(`SELECT id, name_ar, name_en FROM banks WHERE account_code IS NULL OR account_code = ''`)
        .all() as Array<{ id: string; name_ar: string; name_en: string }>
      if (unlinked.length) {
        db.prepare(`UPDATE accounts SET is_posting = 0 WHERE code = '183'`).run()
        const exists = db.prepare(`SELECT 1 FROM accounts WHERE code = ?`)
        const insAcct = db.prepare(
          `INSERT INTO accounts (code, name_ar, name_en, type, normal_balance, parent_code, level, is_posting, archived)
           VALUES (?, ?, ?, 'ASSET', 'DEBIT', '183', 4, 1, 0)`,
        )
        const linkBank = db.prepare(`UPDATE banks SET account_code = ? WHERE id = ?`)
        let n = (db.prepare(`SELECT COUNT(*) c FROM accounts WHERE parent_code = '183'`).get() as { c: number }).c
        for (const bk of unlinked) {
          n++
          let code = `183${String(n).padStart(2, '0')}`
          while (exists.get(code)) {
            n++
            code = `183${String(n).padStart(2, '0')}`
          }
          insAcct.run(code, bk.name_ar ?? 'مصرف', bk.name_en ?? '')
          linkBank.run(code, bk.id)
        }
      }
    }
  }

  // Warehouse module: real Abu Ghraib + Al Dora data replaced the 2-fake-warehouse
  // demo — warehouses gained name_en/type/project_id, items gained a free-text
  // spec/dimension field. Added idempotently so existing databases gain the
  // columns without a reseed.
  const whCols = db.prepare(`PRAGMA table_info(warehouses)`).all() as Array<{ name: string }>
  if (whCols.length) {
    const whHas = (n: string) => whCols.some((c) => c.name === n)
    const addWhCol = (n: string, type: string) => { if (!whHas(n)) db.exec(`ALTER TABLE warehouses ADD COLUMN ${n} ${type}`) }
    addWhCol('name_en', 'TEXT')
    addWhCol('type', 'TEXT')        // MAIN | PROJECT
    addWhCol('project_id', 'TEXT')  // FK -> projects.id; set only when type = PROJECT
  }
  const itemCols = db.prepare(`PRAGMA table_info(items)`).all() as Array<{ name: string }>
  if (itemCols.length && !itemCols.some((c) => c.name === 'spec')) {
    db.exec(`ALTER TABLE items ADD COLUMN spec TEXT`) // free-text size/dimension
  }
  // Warehouse category explorer: normalized pipe/fitting diameter for the size chips.
  if (itemCols.length) {
    if (!itemCols.some((c) => c.name === 'size_label')) db.exec(`ALTER TABLE items ADD COLUMN size_label TEXT`)
    if (!itemCols.some((c) => c.name === 'size_mm')) db.exec(`ALTER TABLE items ADD COLUMN size_mm REAL`)
  }

  // Warehouse smart search: dialect words the storekeeper taught the system
  // ("هل تقصد…؟" confirmations). term = what he typed, target = the word it means.
  db.exec(`CREATE TABLE IF NOT EXISTS search_synonyms (
    id TEXT PRIMARY KEY,
    term TEXT,
    target TEXT,
    created_at TEXT
  )`)

  // Warehouse custody (عهدة): who received an outgoing movement, loan tracking,
  // and the on-screen signature captured on delivery.
  const txnCols = db.prepare(`PRAGMA table_info(inventory_transactions)`).all() as Array<{ name: string }>
  if (txnCols.length) {
    const txnHas = (n: string) => txnCols.some((c) => c.name === n)
    if (!txnHas('received_by')) db.exec(`ALTER TABLE inventory_transactions ADD COLUMN received_by TEXT`)
    if (!txnHas('is_loan')) db.exec(`ALTER TABLE inventory_transactions ADD COLUMN is_loan INTEGER DEFAULT 0`)
    if (!txnHas('returned_at')) db.exec(`ALTER TABLE inventory_transactions ADD COLUMN returned_at TEXT`)
    if (!txnHas('signature_file')) db.exec(`ALTER TABLE inventory_transactions ADD COLUMN signature_file TEXT`)
  }
  // Item condition (شغال/عاطل/بحاجة صيانة…) — canonical enum, imported from the workbooks.
  if (itemCols.length && !itemCols.some((c) => c.name === 'condition')) {
    db.exec(`ALTER TABLE items ADD COLUMN condition TEXT`) // NEW | GOOD | USED | NEEDS_REPAIR | BROKEN
  }
}

// Create a posting ASSET account under «اليات» (code 5) for every vehicle that
// doesn't have one yet, and link it via vehicles.account_code. Idempotent —
// safe to call on boot and after seeding new vehicles. Skips if the اليات root
// is absent. Additive only (never deletes accounts).
export function ensureVehicleAccounts(): void {
  const root = db.prepare(`SELECT code, level FROM accounts WHERE code = '5'`).get() as { code: string; level: number } | undefined
  if (!root) return
  const hasVehicles = db.prepare(`SELECT name FROM pragma_table_info('vehicles') WHERE name = 'account_code'`).get()
  if (!hasVehicles) return
  const vehicles = db.prepare(`SELECT id, code, name_ar, name_en, plate_number, account_code FROM vehicles`).all() as Array<{ id: string; code: string; name_ar: string; name_en: string; plate_number: string; account_code: string | null }>
  const exists = db.prepare(`SELECT 1 FROM accounts WHERE code = ?`)
  const insAcct = db.prepare(
    `INSERT INTO accounts (code, name_ar, name_en, type, normal_balance, parent_code, level, is_posting, archived)
     VALUES (?, ?, ?, 'ASSET', 'DEBIT', '5', ?, 1, 0)`,
  )
  const linkVeh = db.prepare(`UPDATE vehicles SET account_code = ? WHERE id = ?`)
  let n = (db.prepare(`SELECT COUNT(*) c FROM accounts WHERE parent_code = '5'`).get() as { c: number }).c
  const tx = db.transaction(() => {
    for (const v of vehicles) {
      if (v.account_code && exists.get(v.account_code)) continue
      n++
      let code = `5${String(n).padStart(3, '0')}`
      while (exists.get(code)) {
        n++
        code = `5${String(n).padStart(3, '0')}`
      }
      const label = `${v.code} — ${v.name_ar}${v.plate_number ? ' (' + v.plate_number + ')' : ''}`
      insAcct.run(code, label, v.name_en ?? '', (root.level ?? 1) + 1)
      linkVeh.run(code, v.id)
    }
  })
  tx()
}

// Ensure tables exist whenever the connection is imported (server boot, seed).
initSchema()
migrate()

export { DB_PATH }
