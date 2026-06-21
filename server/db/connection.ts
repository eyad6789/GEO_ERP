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

  // Fleet (الآليات) module: projects gained map coordinates. Existing databases
  // (created before the Fleet module) need these columns added so the fleet map
  // queries (SELECT p.lat, p.lng …) don't fail. CREATE TABLE IF NOT EXISTS in
  // schema.sql only helps brand-new databases, not existing ones.
  const projCols = db.prepare(`PRAGMA table_info(projects)`).all() as Array<{ name: string }>
  if (!projCols.some((c) => c.name === 'lat')) db.exec(`ALTER TABLE projects ADD COLUMN lat REAL`)
  if (!projCols.some((c) => c.name === 'lng')) db.exec(`ALTER TABLE projects ADD COLUMN lng REAL`)

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
}

// Ensure tables exist whenever the connection is imported (server boot, seed).
initSchema()
migrate()

export { DB_PATH }
