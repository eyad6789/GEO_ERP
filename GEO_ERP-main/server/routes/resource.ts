// ============================================================================
// Generic CRUD router mounted at /api/:resource.
// Columns are auto-discovered from the live schema (PRAGMA table_info), so this
// one file serves every table. List supports equality filters on any real
// column, plus ?q= search, ?sort=&order=, ?limit=&offset=.
// ============================================================================
import { Router, type Request, type Response } from 'express'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

interface TableConfig {
  idColumn?: string
  search?: string[]
  readOnly?: boolean // disallow create/update/delete (e.g. event_logs is append-only via logger)
  noCreate?: boolean
  module: string
  defaultSort?: string
}

// Registry of all API-exposed tables. Authored once; module agents do not edit.
const REGISTRY: Record<string, TableConfig> = {
  companies: { module: 'COMPANIES', search: ['name_ar', 'name_en', 'code', 'city'] },
  departments: { module: 'HR', search: ['name_ar', 'name_en'] },
  employees: { module: 'HR', search: ['full_name_ar', 'full_name_en', 'employee_number', 'job_title', 'phone_primary'] },
  attendance: { module: 'HR', defaultSort: 'date' },
  leave_requests: { module: 'HR', search: ['type', 'reason'] },
  advances: { module: 'HR', search: ['reason'] },
  payroll: { module: 'HR', search: ['period'] },
  gifts: { module: 'HR', search: ['occasion', 'description'] },
  performance_reviews: { module: 'HR', search: ['period'] },
  projects: { module: 'PROJECTS', search: ['name_ar', 'name_en', 'code', 'client', 'location'] },
  project_milestones: { module: 'PROJECTS', search: ['name_ar'] },
  project_machinery: { module: 'PROJECTS', search: ['name_ar', 'code', 'type'] },
  project_staff: { module: 'PROJECTS' },
  project_expenditures: { module: 'PROJECTS', search: ['description', 'paid_to', 'category', 'doc_number'] },
  project_diagrams: { module: 'PROJECTS', search: ['name_ar'] },
  vehicles: { module: 'FLEET', search: ['plate_number', 'name_ar', 'name_en', 'code', 'driver_name', 'owner_name'], defaultSort: 'code' },
  vehicle_costs: { module: 'FLEET', search: ['category', 'note'], defaultSort: 'date' },
  warehouses: { module: 'WAREHOUSE', search: ['name_ar', 'location'] },
  items: { module: 'WAREHOUSE', search: ['name_ar', 'name_en', 'code', 'category'] },
  search_synonyms: { module: 'WAREHOUSE', search: ['term', 'target'] },
  stock: { module: 'WAREHOUSE' },
  inventory_transactions: { module: 'WAREHOUSE', search: ['serial_number', 'doc_number', 'notes'], defaultSort: 'date' },
  inventory_lines: { module: 'WAREHOUSE' },
  accounts: { idColumn: 'code', module: 'ACCOUNTING', search: ['code', 'name_ar', 'name_en'], defaultSort: 'code' },
  journal_entries: { module: 'ACCOUNTING', search: ['serial_number', 'doc_number', 'description'], defaultSort: 'date' },
  journal_lines: { module: 'ACCOUNTING', search: ['description', 'account_code'] },
  banks: { module: 'ACCOUNTING', search: ['name_ar', 'name_en', 'account_number', 'branch'], defaultSort: 'created_at' },
  archive_documents: { module: 'ARCHIVE', search: ['title', 'subject', 'ref_number', 'from_party', 'to_party', 'tags'], defaultSort: 'date' },
  notes: { module: 'GENERAL', search: ['content', 'author'] },
  event_logs: { module: 'LOGS', readOnly: true, search: ['record_description', 'user_name', 'module'], defaultSort: 'timestamp' },
}

// Discover columns once at startup.
const COLUMNS: Record<string, Set<string>> = {}
for (const table of Object.keys(REGISTRY)) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    COLUMNS[table] = new Set(cols.map((c) => c.name))
  } catch {
    COLUMNS[table] = new Set()
  }
}

const RESERVED = new Set(['q', 'sort', 'order', 'limit', 'offset'])

function sanitize(v: unknown): unknown {
  if (v === undefined) return null
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v !== null && typeof v === 'object') return JSON.stringify(v)
  return v
}

export const resourceRouter = Router()

function cfg(req: Request, res: Response): { table: string; conf: TableConfig; cols: Set<string> } | null {
  const table = req.params.resource
  const conf = REGISTRY[table]
  if (!conf) {
    res.status(404).json({ error: `Unknown resource: ${table}` })
    return null
  }
  return { table, conf, cols: COLUMNS[table] }
}

// LIST
resourceRouter.get('/:resource', (req, res) => {
  const c = cfg(req, res)
  if (!c) return
  const { table, conf, cols } = c
  const where: string[] = []
  const params: unknown[] = []

  for (const [key, val] of Object.entries(req.query)) {
    if (RESERVED.has(key)) continue
    if (cols.has(key)) {
      where.push(`${key} = ?`)
      params.push(val)
    }
  }

  // Soft-deletable tables (any with an `archived` column, e.g. accounts,
  // employees): hide archived rows unless explicitly asked (?include_archived=1
  // shows all; ?archived=1 fetches only the archived ones).
  if (cols.has('archived') && req.query.include_archived !== '1' && !('archived' in req.query)) {
    where.push('(archived IS NULL OR archived = 0)')
  }

  const q = req.query.q as string | undefined
  if (q && conf.search?.length) {
    const ors = conf.search.filter((s) => cols.has(s)).map((s) => `${s} LIKE ?`)
    if (ors.length) {
      where.push(`(${ors.join(' OR ')})`)
      for (let i = 0; i < ors.length; i++) params.push(`%${q}%`)
    }
  }

  let sql = `SELECT * FROM ${table}`
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`

  const sort = (req.query.sort as string) || conf.defaultSort
  if (sort && cols.has(sort)) {
    const order = (req.query.order as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${sort} ${order}`
  }

  const limit = Number(req.query.limit)
  if (Number.isFinite(limit) && limit > 0) {
    sql += ` LIMIT ${Math.floor(limit)}`
    const offset = Number(req.query.offset)
    if (Number.isFinite(offset) && offset > 0) sql += ` OFFSET ${Math.floor(offset)}`
  }

  try {
    const rows = db.prepare(sql).all(...params)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET ONE
resourceRouter.get('/:resource/:id', (req, res) => {
  const c = cfg(req, res)
  if (!c) return
  const { table, conf } = c
  const idCol = conf.idColumn ?? 'id'
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${idCol} = ?`).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// CREATE
resourceRouter.post('/:resource', (req, res) => {
  const c = cfg(req, res)
  if (!c) return
  const { table, conf, cols } = c
  if (conf.readOnly || conf.noCreate) return res.status(405).json({ error: 'Read-only resource' })
  const idCol = conf.idColumn ?? 'id'

  const body = (req.body ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (cols.has(k)) data[k] = sanitize(v)
  }
  if (idCol === 'id' && !data.id) data.id = genId(table.slice(0, 3))
  if (cols.has('created_at') && !data.created_at) data.created_at = nowISO()

  const keys = Object.keys(data)
  if (!keys.length) return res.status(400).json({ error: 'No valid columns' })
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  try {
    db.prepare(sql).run(...keys.map((k) => data[k]))
    const row = db.prepare(`SELECT * FROM ${table} WHERE ${idCol} = ?`).get(data[idCol])
    logEvent({
      module: conf.module,
      action: 'CREATE',
      record_type: table,
      record_id: String(data[idCol]),
      record_description: String(data.name_ar ?? data.title ?? data.description ?? data.full_name_ar ?? table),
      company_id: (data.company_id as string) ?? null,
      new_values: data,
    })
    res.status(201).json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// UPDATE
resourceRouter.put('/:resource/:id', (req, res) => {
  const c = cfg(req, res)
  if (!c) return
  const { table, conf, cols } = c
  if (conf.readOnly) return res.status(405).json({ error: 'Read-only resource' })
  const idCol = conf.idColumn ?? 'id'

  const old = db.prepare(`SELECT * FROM ${table} WHERE ${idCol} = ?`).get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })

  const body = (req.body ?? {}) as Record<string, unknown>
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (cols.has(k) && k !== idCol) data[k] = sanitize(v)
  }
  const keys = Object.keys(data)
  if (!keys.length) return res.status(400).json({ error: 'No valid columns' })
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE ${idCol} = ?`
  try {
    db.prepare(sql).run(...keys.map((k) => data[k]), req.params.id)
    const row = db.prepare(`SELECT * FROM ${table} WHERE ${idCol} = ?`).get(req.params.id)
    logEvent({
      module: conf.module,
      action: 'UPDATE',
      record_type: table,
      record_id: req.params.id,
      record_description: String((row as Record<string, unknown>)?.name_ar ?? table),
      old_values: old,
      new_values: data,
    })
    res.json(row)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// DELETE
resourceRouter.delete('/:resource/:id', (req, res) => {
  const c = cfg(req, res)
  if (!c) return
  const { table, conf } = c
  if (conf.readOnly) return res.status(405).json({ error: 'Read-only resource' })
  const idCol = conf.idColumn ?? 'id'
  const old = db.prepare(`SELECT * FROM ${table} WHERE ${idCol} = ?`).get(req.params.id)
  if (!old) return res.status(404).json({ error: 'Not found' })
  try {
    if (table === 'accounts') {
      // Soft-delete: keep the row (and its history) but make it inaccessible.
      db.prepare(`UPDATE accounts SET archived = 1 WHERE code = ?`).run(req.params.id)
    } else {
      db.prepare(`DELETE FROM ${table} WHERE ${idCol} = ?`).run(req.params.id)
    }
    logEvent({
      module: conf.module,
      action: table === 'accounts' ? 'UPDATE' : 'DELETE',
      record_type: table,
      record_id: req.params.id,
      record_description: String((old as Record<string, unknown>)?.name_ar ?? table) + (table === 'accounts' ? ' (أرشفة)' : ''),
      old_values: old,
    })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

export { REGISTRY, COLUMNS }
