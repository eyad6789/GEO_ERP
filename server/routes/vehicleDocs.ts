// Vehicle / driver document archive — license & registration scans.
// Files are uploaded as base64 JSON (no multipart dependency) and stored on disk
// under server/data/uploads; metadata lives in the vehicle_documents table.
import { Router } from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const vehicleDocsRouter = Router()

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', 'data', 'uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

const safeName = (s: string) => String(s || 'file').replace(/[^\w.\-؀-ۿ]+/g, '_').slice(0, 80)

// GET /api/vehicle-documents?vehicle_id=...  → metadata only (no file bytes)
vehicleDocsRouter.get('/vehicle-documents', (req, res) => {
  try {
    const vid = req.query.vehicle_id as string | undefined
    const rows = vid
      ? db.prepare(`SELECT id, vehicle_id, doc_type, title, file_name, mime, size, expiry, created_at FROM vehicle_documents WHERE vehicle_id = ? ORDER BY created_at DESC`).all(vid)
      : db.prepare(`SELECT id, vehicle_id, doc_type, title, file_name, mime, size, expiry, created_at FROM vehicle_documents ORDER BY created_at DESC`).all()
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/vehicle-documents/:id/file  → stream the stored file
vehicleDocsRouter.get('/vehicle-documents/:id/file', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM vehicle_documents WHERE id = ?`).get(req.params.id) as
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

// POST /api/vehicle-documents  { vehicle_id, doc_type, title, expiry, file_name, mime, data(base64) }
vehicleDocsRouter.post('/vehicle-documents', (req, res) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>
    if (!b.vehicle_id) return res.status(400).json({ error: 'vehicle_id required' })
    if (!b.data) return res.status(400).json({ error: 'file data required' })
    // base64 may arrive as a data: URL or raw base64
    const raw = String(b.data)
    const base64 = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
    const buf = Buffer.from(base64, 'base64')
    const id = genId('vdoc')
    writeFileSync(join(UPLOAD_DIR, id), buf)
    const row = {
      id,
      vehicle_id: String(b.vehicle_id),
      doc_type: String(b.doc_type || 'OTHER'),
      title: String(b.title || b.file_name || 'Document'),
      file_name: safeName(String(b.file_name || 'file')),
      mime: String(b.mime || 'application/octet-stream'),
      size: buf.length,
      expiry: (b.expiry as string) || null,
      created_at: nowISO(),
    }
    db.prepare(
      `INSERT INTO vehicle_documents (id, vehicle_id, doc_type, title, file_name, mime, size, expiry, created_at)
       VALUES (@id, @vehicle_id, @doc_type, @title, @file_name, @mime, @size, @expiry, @created_at)`,
    ).run(row)
    logEvent({
      module: 'FLEET',
      action: 'CREATE',
      record_type: 'vehicle_documents',
      record_id: id,
      record_description: row.title,
      new_values: { vehicle_id: row.vehicle_id, doc_type: row.doc_type, file_name: row.file_name },
    })
    res.status(201).json({ ...row, size: buf.length })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// DELETE /api/vehicle-documents/:id  → remove row + file
vehicleDocsRouter.delete('/vehicle-documents/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM vehicle_documents WHERE id = ?`).get(req.params.id) as { id: string; title: string } | undefined
    if (!row) return res.status(404).json({ error: 'Document not found' })
    db.prepare(`DELETE FROM vehicle_documents WHERE id = ?`).run(req.params.id)
    const path = join(UPLOAD_DIR, row.id)
    if (existsSync(path)) unlinkSync(path)
    logEvent({ module: 'FLEET', action: 'DELETE', record_type: 'vehicle_documents', record_id: row.id, record_description: row.title })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
