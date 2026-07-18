// Replace ALL demo HR data with the company's REAL Baghdad-office employees,
// read from «عناوين الموظفين.xlsx» (name / phone / emergency contact / address).
//
// It wipes ONLY the HR tables (attendance, leave_requests, advances, payroll,
// gifts, performance_reviews, employee_documents [+ their scan files on disk],
// employees, departments) and creates one department «مكتب بغداد» under the
// parent company co-000 holding the imported people. Companies, projects,
// accounting, fleet, warehouse, notes and event_logs are NOT touched.
//
// employee_number = the Excel # column ('1'..'20') — this is what the
// fingerprint-machine attendance import matches on, so keep it as plain digits.
//
// Run: npm run seed:hr   (optionally: npm run seed:hr -- /path/to/file.xlsx)
// Re-runnable: deterministic ids (emp-r01..) — a re-run recreates the same rows.
import { existsSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ExcelJS from 'exceljs'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const XLSX_PATH = process.argv[2] ?? join(__dirname, '..', '..', 'عناوين الموظفين.xlsx')
const UPLOAD_DIR = join(__dirname, '..', 'data', 'uploads')

const PARENT_COMPANY = 'co-000'
const DEPARTMENT_ID = 'dep-baghdad'

// Same 12-color palette the main seed uses for avatar tints.
const COLORS = ['#1a5f7a', '#2d9cdb', '#e8a838', '#27ae60', '#e74c3c', '#9b59b6', '#16a085', '#34495e', '#d35400', '#2980b9', '#c0392b', '#8e44ad']

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

// exceljs cells can be Date, number, rich text, formula results…
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
  return String(v).replace(/\s+/g, ' ').trim()
}

// Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits → ASCII.
function normDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
}

// '7804690000' / '009647804690000' → '07804690000'
function normPhone(s: string): string {
  const digits = normDigits(s).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00964')) return '0' + digits.slice(5)
  if (digits.startsWith('964')) return '0' + digits.slice(3)
  return digits.startsWith('0') ? digits : '0' + digits
}

// 'علاء ثابت / 07801902204' or '07734440731/ ام عبد الرحمن' or a double number
// 'ام ياسر /07835000058 - 07829000490' → { name, phone } (phones joined by ' / ').
function splitEmergency(s: string): { name: string; phone: string } {
  const text = normDigits(cellText(s))
  const runs = text.match(/\d{7,}/g) ?? []
  const phone = runs.map(normPhone).filter(Boolean).join(' / ')
  const name = text
    .replace(/\d{7,}/g, ' ')
    .replace(/[/\-–]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { name, phone }
}

// ---------------------------------------------------------------------------
// Parse the Excel fully BEFORE touching the DB — a parse failure changes nothing.
// ---------------------------------------------------------------------------
interface RealEmployee {
  id: string
  employee_number: string
  full_name_ar: string
  phone_primary: string
  emergency_name: string
  emergency_phone: string
  address: string
  photo_color: string
}

async function parseWorkbook(): Promise<{ employees: RealEmployee[]; skipped: number; warnings: string[] }> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(XLSX_PATH)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('الملف لا يحتوي على أوراق عمل')

  const employees: RealEmployee[] = []
  const warnings: string[] = []
  let skipped = 0

  // Row 1 = title, row 2 = header, data from row 3.
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n < 3) return
    const vals = row.values as unknown[]
    const name = cellText(vals[2])
    if (!name) {
      skipped++
      return
    }
    const numRaw = parseInt(normDigits(cellText(vals[1])), 10)
    const num = Number.isFinite(numRaw) ? numRaw : null
    if (num == null) warnings.push(`صف ${n} («${name}»): بدون رقم وظيفي — لن يُطابق ملفات البصمة`)
    const phone = normPhone(cellText(vals[3]))
    if (!phone) warnings.push(`صف ${n} («${name}»): بدون رقم هاتف`)
    const emergency = splitEmergency(cellText(vals[4]))

    employees.push({
      id: num != null ? `emp-r${String(num).padStart(2, '0')}` : genId('emp'),
      employee_number: num != null ? String(num) : '',
      full_name_ar: name,
      phone_primary: phone,
      emergency_name: emergency.name,
      emergency_phone: emergency.phone,
      address: cellText(vals[5]),
      photo_color: COLORS[((num ?? employees.length + 1) - 1) % COLORS.length],
    })
  })

  return { employees, skipped, warnings }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(XLSX_PATH)) {
    console.error(`✗ ملف الموظفين غير موجود: ${XLSX_PATH}`)
    process.exit(1)
  }
  if (!db.prepare(`SELECT 1 FROM companies WHERE id = ?`).get(PARENT_COMPANY)) {
    console.error(`✗ الشركة الأم (${PARENT_COMPANY}) غير موجودة — شغّل npm run seed أولاً. لن يُنشئ هذا السكربت شركات.`)
    process.exit(1)
  }

  const { employees, skipped, warnings } = await parseWorkbook()
  if (employees.length === 0) {
    console.error('✗ لم يُقرأ أي موظف من الملف — لم يتغير شيء.')
    process.exit(1)
  }

  // Snapshot what we are about to wipe (for the audit log + console summary).
  const HR_TABLES = ['attendance', 'leave_requests', 'advances', 'payroll', 'gifts', 'performance_reviews', 'employee_documents', 'employees', 'departments'] as const
  const wipedCounts: Record<string, number> = {}
  for (const t of HR_TABLES) {
    wipedCounts[t] = (db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c
  }
  // Employee scan files live on disk next to vehicle scans — delete ONLY the
  // employee ones, by id, never the whole uploads directory.
  const docIds = (db.prepare(`SELECT id FROM employee_documents`).all() as Array<{ id: string }>).map((r) => r.id)

  const insEmp = db.prepare(`
    INSERT INTO employees
      (id, employee_number, full_name_ar, full_name_en, photo_color, nationality, children_count,
       phone_primary, address, emergency_name, emergency_phone,
       company_id, department_id, employment_type, status, basic_salary, salary_currency, created_at)
    VALUES
      (@id, @employee_number, @full_name_ar, '', @photo_color, 'عراقي', 0,
       @phone_primary, @address, @emergency_name, @emergency_phone,
       @company_id, @department_id, 'FULL', 'ACTIVE', 0, 'IQD', @created_at)
  `)

  db.transaction(() => {
    for (const t of HR_TABLES) db.prepare(`DELETE FROM ${t}`).run()
    db.prepare(
      `INSERT INTO departments (id, company_id, name_ar, name_en, parent_id, manager_id, created_at)
       VALUES (?, ?, 'مكتب بغداد', 'Baghdad Office', NULL, NULL, ?)`,
    ).run(DEPARTMENT_ID, PARENT_COMPANY, nowISO())
    for (const e of employees) {
      insEmp.run({ ...e, company_id: PARENT_COMPANY, department_id: DEPARTMENT_ID, created_at: nowISO() })
    }
    // Project staff assignments pointing at employees that no longer exist are
    // meaningless — remove them (targeted; assignments to the re-created
    // emp-r* ids survive a re-run, and project data itself is never touched).
    db.prepare(`DELETE FROM project_staff WHERE employee_id NOT IN (SELECT id FROM employees)`).run()
  })()

  // Remove the orphaned employee scan files (after the DB commit).
  let filesRemoved = 0
  for (const id of docIds) {
    const p = join(UPLOAD_DIR, id)
    if (existsSync(p)) {
      unlinkSync(p)
      filesRemoved++
    }
  }

  logEvent({
    module: 'HR', action: 'DELETE', record_type: 'employees', record_id: 'seed:hr:wipe',
    record_description: 'حذف بيانات الموارد البشرية التجريبية قبل استيراد الموظفين الحقيقيين',
    old_values: wipedCounts,
  })
  logEvent({
    module: 'HR', action: 'CREATE', record_type: 'employees', record_id: 'seed:hr',
    record_description: `استيراد الموظفين الحقيقيين — مكتب بغداد (${employees.length})`,
    new_values: { inserted: employees.length, skipped_rows: skipped, doc_files_removed: filesRemoved },
  })

  console.log('\n✓ استُبدلت بيانات الموارد البشرية بالموظفين الحقيقيين\n')
  console.log('  المحذوف:', Object.entries(wipedCounts).map(([t, c]) => `${t}=${c}`).join('  '))
  console.log(`  ملفات مستندات محذوفة من القرص: ${filesRemoved}\n`)
  for (const e of employees) console.log(`  ${e.employee_number.padStart(2, ' ')}  ${e.full_name_ar}  ${e.phone_primary}`)
  if (skipped) console.log(`\n  (تم تجاوز ${skipped} صف بدون اسم)`)
  for (const w of warnings) console.log(`  ⚠ ${w}`)
  console.log(`\n  المجموع: ${employees.length} موظفاً في «مكتب بغداد» (${PARENT_COMPANY})`)
  console.log('  ملاحظة: سجلات الحضور صفرية الآن — أعد استيراد ملف البصمة من تبويب الحضور.\n')
}

main().catch((e) => {
  console.error('✗ فشل الاستيراد:', e)
  process.exit(1)
})
