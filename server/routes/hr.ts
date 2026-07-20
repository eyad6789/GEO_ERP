// HR-specific employee lifecycle routes that override the generic CRUD:
//   POST   /api/employees/:id/archive   → reversible soft-delete (نقل للأرشيف)
//   POST   /api/employees/:id/restore   → un-archive (استرجاع)
//   DELETE /api/employees/:id           → permanent CASCADE delete (حذف نهائي)
//
// Mounted BEFORE resourceRouter in index.ts so these literal paths win over the
// generic /:resource/:id. Create/update still flow through the generic router.
import { Router } from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, unlinkSync } from 'node:fs'
import { db } from '../db/connection.js'
import { nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const hrRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', 'data', 'uploads')

interface EmployeeRow {
  id: string
  full_name_ar?: string
  full_name_en?: string
  company_id?: string | null
}

const getEmployee = (id: string): EmployeeRow | undefined =>
  db.prepare(`SELECT * FROM employees WHERE id = ?`).get(id) as EmployeeRow | undefined

const labelOf = (e: EmployeeRow) => String(e.full_name_ar ?? e.full_name_en ?? 'employee')

const tableHasCol = (table: string, col: string): boolean => {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    return cols.some((c) => c.name === col)
  } catch {
    return false
  }
}

// Records that belong to an employee — removed on permanent delete.
const CHILD_TABLES = [
  'attendance',
  'leave_requests',
  'advances',
  'payroll',
  'gifts',
  'performance_reviews',
  'trainings',
  'project_staff',
  'employee_documents',
]
// Soft references pointing AT an employee — nulled so nothing dangles.
const POINTERS: Array<[table: string, col: string]> = [
  ['employees', 'manager_id'],
  ['vehicles', 'driver_id'],
  ['departments', 'manager_id'],
  ['project_machinery', 'operator_id'],
]

// Resolve which of the above actually exist in this DB, once at boot (schema is
// fixed after migrate() runs on connection import).
const childDeletes = CHILD_TABLES.filter((t) => tableHasCol(t, 'employee_id'))
const pointerNulls = POINTERS.filter(([t, c]) => tableHasCol(t, c))

// POST /employees/:id/archive — hide from the active roster, keep everything.
hrRouter.post('/employees/:id/archive', (req, res) => {
  const emp = getEmployee(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Not found' })
  try {
    db.prepare(`UPDATE employees SET archived = 1, archived_at = ? WHERE id = ?`).run(nowISO(), req.params.id)
    logEvent({
      module: 'HR',
      action: 'ARCHIVE',
      record_type: 'employees',
      record_id: req.params.id,
      record_description: `${labelOf(emp)} (أرشفة)`,
      company_id: emp.company_id ?? null,
      old_values: emp,
    })
    res.json(getEmployee(req.params.id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// POST /employees/:id/restore — bring an archived employee back to the roster.
hrRouter.post('/employees/:id/restore', (req, res) => {
  const emp = getEmployee(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Not found' })
  try {
    db.prepare(`UPDATE employees SET archived = 0, archived_at = NULL WHERE id = ?`).run(req.params.id)
    logEvent({
      module: 'HR',
      action: 'RESTORE',
      record_type: 'employees',
      record_id: req.params.id,
      record_description: `${labelOf(emp)} (استرجاع)`,
      company_id: emp.company_id ?? null,
      old_values: emp,
    })
    res.json(getEmployee(req.params.id))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// DELETE /employees/:id — permanent, cascading. Removes the employee, every
// related record, all uploaded document files, and nulls inbound references.
hrRouter.delete('/employees/:id', (req, res) => {
  const id = req.params.id
  const emp = getEmployee(id)
  if (!emp) return res.status(404).json({ error: 'Not found' })
  try {
    // Gather doc file ids first — files are unlinked only after the DB commits.
    const docFiles = childDeletes.includes('employee_documents')
      ? (db.prepare(`SELECT id FROM employee_documents WHERE employee_id = ?`).all(id) as Array<{ id: string }>).map((d) => d.id)
      : []

    const tx = db.transaction(() => {
      for (const t of childDeletes) db.prepare(`DELETE FROM ${t} WHERE employee_id = ?`).run(id)
      for (const [t, col] of pointerNulls) db.prepare(`UPDATE ${t} SET ${col} = NULL WHERE ${col} = ?`).run(id)
      db.prepare(`DELETE FROM employees WHERE id = ?`).run(id)
    })
    tx()

    // Best-effort disk cleanup — a missing/locked file must not fail the delete.
    for (const docId of docFiles) {
      try {
        const p = join(UPLOAD_DIR, docId)
        if (existsSync(p)) unlinkSync(p)
      } catch {
        /* ignore */
      }
    }

    logEvent({
      module: 'HR',
      action: 'DELETE',
      record_type: 'employees',
      record_id: id,
      record_description: `${labelOf(emp)} (حذف نهائي)`,
      company_id: emp.company_id ?? null,
      old_values: emp,
    })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
