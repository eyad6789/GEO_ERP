// Employee document archive — ID cards, licenses, contracts & other scans.
// Mirrors vehicleDocs.ts: files upload as base64 JSON (no multipart dependency)
// and are stored on disk under server/data/uploads; metadata lives in the
// employee_documents table.
import { Router } from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const employeeDocsRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', 'data', 'uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

const safeName = (s: string) => String(s || 'file').replace(/[^\w.\-؀-ۿ]+/g, '_').slice(0, 80)

// GET /api/employee-documents?employee_id=...  → metadata only (no file bytes)
employeeDocsRouter.get('/employee-documents', (req, res) => {
  try {
    const eid = req.query.employee_id as string | undefined
    const rows = eid
      ? db.prepare(`SELECT id, employee_id, doc_type, title, file_name, mime, size, expiry, created_at FROM employee_documents WHERE employee_id = ? ORDER BY created_at DESC`).all(eid)
      : db.prepare(`SELECT id, employee_id, doc_type, title, file_name, mime, size, expiry, created_at FROM employee_documents ORDER BY created_at DESC`).all()
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/employee-documents/:id/file  → stream the stored file
employeeDocsRouter.get('/employee-documents/:id/file', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM employee_documents WHERE id = ?`).get(req.params.id) as
      | { id: string; mime: string; file_name: string } | undefined
    if (!row) return res.status(404).json({ error: 'Document not found' })
    const path = join(UPLOAD_DIR, row.id)
    if (!existsSync(path)) return res.status(404).json({ error: 'File missing on disk' })
    res.setHeader('Content-Type', row.mime || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || row.id)}"`)
    res.send(readFileSync(path))
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// POST /api/employee-documents  { employee_id, doc_type, title, expiry, file_name, mime, data(base64) }
employeeDocsRouter.post('/employee-documents', (req, res) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>
    if (!b.employee_id) return res.status(400).json({ error: 'employee_id required' })
    if (!b.data) return res.status(400).json({ error: 'file data required' })
    // base64 may arrive as a data: URL or raw base64
    const raw = String(b.data)
    const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
    const buf = Buffer.from(base64, 'base64')
    const id = genId('edoc')
    writeFileSync(join(UPLOAD_DIR, id), buf)
    const row = {
      id,
      employee_id: String(b.employee_id),
      doc_type: String(b.doc_type || 'OTHER'),
      title: String(b.title || b.file_name || 'Document'),
      file_name: safeName(String(b.file_name || 'file')),
      mime: String(b.mime || 'application/octet-stream'),
      size: buf.length,
      expiry: (b.expiry as string) || null,
      created_at: nowISO(),
    }
    db.prepare(
      `INSERT INTO employee_documents (id, employee_id, doc_type, title, file_name, mime, size, expiry, created_at)
       VALUES (@id, @employee_id, @doc_type, @title, @file_name, @mime, @size, @expiry, @created_at)`,
    ).run(row)
    logEvent({
      module: 'HR',
      action: 'CREATE',
      record_type: 'employee_documents',
      record_id: id,
      record_description: row.title,
      new_values: { employee_id: row.employee_id, doc_type: row.doc_type, file_name: row.file_name },
    })
    res.status(201).json({ ...row, size: buf.length })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// DELETE /api/employee-documents/:id  → remove row + file
employeeDocsRouter.delete('/employee-documents/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM employee_documents WHERE id = ?`).get(req.params.id) as { id: string; title: string } | undefined
    if (!row) return res.status(404).json({ error: 'Document not found' })
    db.prepare(`DELETE FROM employee_documents WHERE id = ?`).run(req.params.id)
    const path = join(UPLOAD_DIR, row.id)
    if (existsSync(path)) unlinkSync(path)
    logEvent({ module: 'HR', action: 'DELETE', record_type: 'employee_documents', record_id: row.id, record_description: row.title })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
