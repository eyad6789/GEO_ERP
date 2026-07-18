// Attendance import from a fingerprint machine export (.xlsx or .csv).
// Two shapes are understood:
//   1. Daily rows:  employee-no | date | check-in | check-out
//   2. Raw punch log: employee-no | datetime  → grouped per day (first punch =
//      check-in, last punch = check-out)
// Employees are matched by employee_number (leading zeros ignored) and, as a
// fallback, by exact Arabic full name. Rows upsert on (employee, date).
import { Router } from 'express'
import ExcelJS from 'exceljs'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

export const hrImportRouter = Router()

interface ParsedRow {
  emp: string // employee number or name as it appears in the file
  date: string // YYYY-MM-DD
  check_in: string | null // HH:MM
  check_out: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')
// exceljs date/time cells are UTC-anchored Date objects — format with UTC
// getters or every timestamp shifts by the server's timezone offset (+3 here).
const dateStr = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const timeStr = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`

// Normalise a cell to string (exceljs cells can be Date, number, rich text…)
function cellText(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: Array<{ text: string }> }
    if (o.richText) return o.richText.map((r) => r.text).join('')
    if (o.text) return String(o.text)
    if (o.result != null) return cellText(o.result)
    return ''
  }
  return String(v).trim()
}

// "2026/07/11", "11-07-2026", "2026-07-11 08:12", Excel Date → YYYY-MM-DD
function parseDate(v: unknown): string | null {
  if (v instanceof Date) return dateStr(v)
  const s = cellText(v)
  if (!s) return null
  const iso = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`
  const dmy = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (dmy) return `${dmy[3]}-${pad(+dmy[2])}-${pad(+dmy[1])}`
  return null
}

// "08:12", "8:12:33 AM", Excel Date/fraction → HH:MM. Clamped to 23:59 —
// 23:59:31 rounds to 1440 minutes and "24:00" would zero the day downstream.
function parseTime(v: unknown): string | null {
  if (v instanceof Date) return timeStr(v)
  if (typeof v === 'number' && v > 0 && v < 1) {
    const mins = Math.min(1439, Math.round(v * 24 * 60))
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
  }
  const s = cellText(v)
  const m = s.match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  let h = +m[1]
  if (/pm|م/i.test(s) && h < 12) h += 12
  if (/am|ص/i.test(s) && h === 12) h = 0
  const mins = Math.min(1439, h * 60 + +m[2])
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
}

const H = {
  emp: /emp|badge|رقم|id|no\b|كود|بصمة/i,
  name: /name|اسم/i,
  date: /date|تاريخ|يوم/i,
  checkIn: /in|حضور|دخول|entry/i,
  checkOut: /out|انصراف|خروج|exit/i,
  datetime: /time|وقت|datetime|timestamp/i,
}

function parseTable(rows: unknown[][]): ParsedRow[] {
  if (!rows.length) return []
  const header = rows[0].map((c) => cellText(c))
  const idx = {
    emp: header.findIndex((h) => H.emp.test(h)),
    name: header.findIndex((h) => H.name.test(h)),
    date: header.findIndex((h) => H.date.test(h)),
    in: header.findIndex((h) => H.checkIn.test(h) && !H.checkOut.test(h)),
    out: header.findIndex((h) => H.checkOut.test(h)),
    dt: header.findIndex((h) => H.datetime.test(h)),
  }
  const empCol = idx.emp >= 0 ? idx.emp : idx.name >= 0 ? idx.name : 0
  const body = rows.slice(1)

  // Mode 1: explicit date (+ optional in/out columns)
  if (idx.date >= 0 && (idx.in >= 0 || idx.out >= 0)) {
    const out: ParsedRow[] = []
    for (const r of body) {
      const emp = cellText(r[empCol])
      const date = parseDate(r[idx.date])
      if (!emp || !date) continue
      out.push({
        emp,
        date,
        check_in: idx.in >= 0 ? parseTime(r[idx.in]) : null,
        check_out: idx.out >= 0 ? parseTime(r[idx.out]) : null,
      })
    }
    return out
  }

  // Mode 2: raw punches — employee + datetime; group per (emp, day).
  // ZKTeco-style exports split the punch into separate Date and Time columns —
  // read each from its own column instead of misparsing the Time column as a date.
  const hasSplit = idx.date >= 0 && idx.dt >= 0 && idx.dt !== idx.date
  const dateCol = hasSplit ? idx.date : idx.dt >= 0 ? idx.dt : idx.date >= 0 ? idx.date : 1
  const timeCol = hasSplit ? idx.dt : dateCol
  const groups = new Map<string, { emp: string; date: string; times: string[] }>()
  for (const r of body) {
    const emp = cellText(r[empCol])
    const date = parseDate(r[dateCol])
    let time = parseTime(r[timeCol])
    // A combined column holding a date-only cell has no real punch time —
    // don't fabricate a midnight check-in from it.
    if (!hasSplit && r[timeCol] instanceof Date && time === '00:00') time = null
    if (!emp || !date || !time) continue
    const key = `${emp}|${date}`
    const g = groups.get(key) ?? { emp, date, times: [] }
    g.times.push(time)
    groups.set(key, g)
  }
  return [...groups.values()].map((g) => {
    const sorted = g.times.sort()
    return { emp: g.emp, date: g.date, check_in: sorted[0], check_out: sorted.length > 1 ? sorted[sorted.length - 1] : null }
  })
}

// POST /api/hr/attendance-import  { file_name, data(base64) }
hrImportRouter.post('/hr/attendance-import', async (req, res) => {
  try {
    const b = (req.body ?? {}) as { file_name?: string; data?: string }
    if (!b.data) return res.status(400).json({ error: 'file data required' })
    const raw = String(b.data)
    const buf = Buffer.from(raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw, 'base64')
    const name = String(b.file_name || 'attendance')

    let rows: unknown[][] = []
    if (/\.csv$|\.txt$/i.test(name)) {
      rows = buf
        .toString('utf8')
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => l.split(/[,;\t]/).map((c) => c.trim()))
    } else {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf as unknown as ArrayBuffer)
      const ws = wb.worksheets[0]
      if (!ws) return res.status(400).json({ error: 'ملف فارغ / Empty workbook' })
      ws.eachRow((row) => {
        rows.push((row.values as unknown[]).slice(1)) // exceljs values are 1-based
      })
    }

    const parsed = parseTable(rows)
    if (!parsed.length) {
      return res.status(400).json({ error: 'لم يتم التعرف على أي صف — تأكد من أعمدة الرقم/التاريخ/الحضور' })
    }

    // Employee lookup: by employee_number (zeros-insensitive) then by exact name.
    const employees = db.prepare(`SELECT id, employee_number, full_name_ar, full_name_en FROM employees`).all() as Array<{
      id: string
      employee_number: string
      full_name_ar: string
      full_name_en: string
    }>
    const byNumber = new Map<string, string>()
    for (const e of employees) {
      const n = String(e.employee_number || '').trim()
      if (!n) continue
      byNumber.set(n, e.id)
      byNumber.set(n.replace(/^0+/, ''), e.id)
      const digits = n.replace(/\D/g, '')
      if (digits) byNumber.set(digits.replace(/^0+/, ''), e.id)
    }
    const byName = new Map<string, string>()
    for (const e of employees) {
      if (e.full_name_ar) byName.set(e.full_name_ar.trim(), e.id)
      if (e.full_name_en) byName.set(e.full_name_en.trim().toLowerCase(), e.id)
    }
    const resolve = (empKey: string): string | null => {
      const k = empKey.trim()
      return (
        byNumber.get(k) ??
        byNumber.get(k.replace(/^0+/, '')) ??
        byNumber.get(k.replace(/\D/g, '').replace(/^0+/, '')) ??
        byName.get(k) ??
        byName.get(k.toLowerCase()) ??
        null
      )
    }

    const getExisting = db.prepare(`SELECT id FROM attendance WHERE employee_id = ? AND date = ?`)
    const insert = db.prepare(
      `INSERT INTO attendance (id, employee_id, date, status, check_in, check_out, notes, created_at)
       VALUES (?, ?, ?, 'PRESENT', ?, ?, ?, ?)`,
    )
    // Re-imports must never blank an existing punch (e.g. a single-punch file
    // arriving after a full day was already recorded) — keep the old value
    // when the incoming one is null.
    const update = db.prepare(
      `UPDATE attendance SET status = 'PRESENT', check_in = COALESCE(?, check_in), check_out = COALESCE(?, check_out) WHERE id = ?`,
    )

    let imported = 0
    let updated = 0
    const unmatched = new Set<string>()
    const tx = db.transaction(() => {
      for (const r of parsed) {
        const empId = resolve(r.emp)
        if (!empId) {
          unmatched.add(r.emp)
          continue
        }
        const existing = getExisting.get(empId, r.date) as { id: string } | undefined
        if (existing) {
          update.run(r.check_in, r.check_out, existing.id)
          updated++
        } else {
          insert.run(genId('att'), empId, r.date, r.check_in, r.check_out, `بصمة: ${name}`, nowISO())
          imported++
        }
      }
    })
    tx()

    logEvent({
      module: 'HR',
      action: 'CREATE',
      record_type: 'attendance',
      record_id: name,
      record_description: `استيراد حضور من جهاز البصمة (${name}): ${imported} جديد، ${updated} محدّث`,
      new_values: { imported, updated, unmatched: [...unmatched].slice(0, 20) },
    })
    res.json({ imported, updated, total_rows: parsed.length, unmatched: [...unmatched].slice(0, 20), unmatched_count: unmatched.size })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
