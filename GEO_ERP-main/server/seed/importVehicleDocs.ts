// One-shot importer: attach the real الآليات license/registration scans to vehicles.
//
// Source = the extracted "1- 2026- الاليات" folder (from warehouse .zip). Each
// top-level entry is named by the car number (e.g. "60035-ن", "11 F 46601- بيك اب",
// "C 22730- شفل بوبكات.pdf"). We match that number to a vehicle by its plate_number
// and create one vehicle_documents row per file (copying the bytes into
// server/data/uploads/<id>, exactly like the upload API does).
//
// Matching key = the longest run of digits in the name (the registration number).
// The leading "11"/"22" province codes are 2 digits, so they're naturally ignored.
//
// Usage:
//   tsx server/seed/importVehicleDocs.ts <sourceDir> [--dry] [--reset]
//     --dry    : print the match report, write nothing
//     --reset  : delete previously-imported docs (tagged source=warehouse-zip) first
//
// Idempotent: without --reset, a file already present (same vehicle + file_name +
// size) is skipped, so re-running never duplicates.

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = join(__dirname, '..', 'data', 'uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const RESET = args.includes('--reset')
const SRC = args.find((a) => !a.startsWith('--'))
if (!SRC || !existsSync(SRC)) {
  console.error('Usage: tsx server/seed/importVehicleDocs.ts <sourceDir> [--dry] [--reset]')
  console.error(SRC ? `Source not found: ${SRC}` : 'Missing <sourceDir>')
  process.exit(1)
}

const safeName = (s: string) => String(s || 'file').replace(/[^\w.\-؀-ۿ]+/g, '_').slice(0, 80)
const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
}
const KEEP_EXT = new Set(Object.keys(MIME))

// Arabic-Indic digits → Latin, then the longest digit group (>= 3 digits, so the
// 2-digit "11"/"22" province prefixes never win).
const arabicToLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
function matchKey(name: string): string | null {
  const groups = (arabicToLatin(name).match(/\d{3,}/g) || []).slice()
  if (!groups.length) return null
  groups.sort((a, b) => b.length - a.length || name.lastIndexOf(b) - name.lastIndexOf(a))
  return groups[0]
}

// Manual overrides keyed by the exact top-level entry name → vehicle code.
// Filled after reviewing the dry-run report (plate discrepancies, date-named files).
const OVERRIDES: Record<string, string> = {
  '11734 د- برادو': 'VEH-004', // master plate 11733 د بغداد (same Prado, off-by-one digit)
  '41695 سنوية الكوستر': 'VEH-113', // Toyota Coaster bus, master plate 41675 أربيل
  '41695- اربيل.pdf': 'VEH-113',
  '18.8.2025 اوراق الشفل الجديد.pdf': 'VEH-061', // "the new shovel" = 96004 (VEH-061)
}

// ---- build the vehicle lookup by match key -------------------------------
type Veh = { id: string; code: string; plate_number: string; name_ar: string }
const vehicles = db.prepare(`SELECT id, code, plate_number, name_ar FROM vehicles`).all() as Veh[]
const byKey = new Map<string, Veh[]>()
const byCode = new Map<string, Veh>()
for (const v of vehicles) {
  byCode.set(v.code, v)
  const k = matchKey(v.plate_number)
  if (!k) continue
  if (!byKey.has(k)) byKey.set(k, [])
  byKey.get(k)!.push(v)
}
const keyCollisions = [...byKey.entries()].filter(([, vs]) => vs.length > 1)

// ---- walk the source -----------------------------------------------------
function filesUnder(p: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(p)) {
    if (name === '.DS_Store' || name === '__MACOSX' || name === '[Originals]') continue
    const full = join(p, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...filesUnder(full))
    else if (KEEP_EXT.has(extname(name).toLowerCase())) out.push(full)
  }
  return out
}

const entries = readdirSync(SRC)
  .filter((n) => n !== '.DS_Store' && n !== '__MACOSX')
  .sort()

type Plan = { entry: string; veh: Veh | null; key: string | null; files: string[]; reason?: string }
const plans: Plan[] = []
for (const entry of entries) {
  const full = join(SRC, entry)
  const st = statSync(full)
  const isDir = st.isDirectory()
  if (!isDir && !KEEP_EXT.has(extname(entry).toLowerCase())) continue // skip stray xlsx etc.
  const files = isDir ? filesUnder(full) : [full]
  if (!files.length) continue
  let veh: Veh | null = null
  let reason: string | undefined
  const ovr = OVERRIDES[entry]
  const key = matchKey(entry)
  if (ovr) {
    veh = byCode.get(ovr) || null
    reason = veh ? 'override' : `override→unknown code ${ovr}`
  } else if (key) {
    const cands = byKey.get(key) || []
    if (cands.length === 1) veh = cands[0]
    else if (cands.length > 1) reason = `ambiguous key ${key} → ${cands.map((c) => c.code).join(',')}`
    else reason = `no vehicle for number ${key}`
  } else {
    reason = 'no number in name'
  }
  plans.push({ entry, veh, key, files, reason })
}

// ---- report --------------------------------------------------------------
const matched = plans.filter((p) => p.veh)
const unmatched = plans.filter((p) => !p.veh)
const filesMatched = matched.reduce((n, p) => n + p.files.length, 0)

console.log(`\n=== Vehicle-docs import ${DRY ? '(DRY RUN)' : ''} ===`)
console.log(`Source: ${SRC}`)
console.log(`Vehicles: ${vehicles.length} | top-level entries with files: ${plans.length}`)
if (keyCollisions.length) {
  console.log(`\n!! plate-key collisions (matched docs would be ambiguous):`)
  for (const [k, vs] of keyCollisions) console.log(`   ${k}: ${vs.map((v) => v.code).join(', ')}`)
}
console.log(`\n--- MATCHED (${matched.length} entries, ${filesMatched} files) ---`)
for (const p of matched) console.log(`  ${p.veh!.code} ← "${p.entry}"  [${p.files.length} file(s)]  plate=${p.veh!.plate_number}`)
console.log(`\n--- UNMATCHED (${unmatched.length} entries, ${unmatched.reduce((n, p) => n + p.files.length, 0)} files) ---`)
for (const p of unmatched) console.log(`  ?? "${p.entry}"  (${p.reason})  [${p.files.length} file(s)]`)

if (DRY) {
  console.log(`\n(dry run — nothing written)\n`)
  process.exit(0)
}

// ---- write ---------------------------------------------------------------
const existsRow = db.prepare(`SELECT 1 FROM vehicle_documents WHERE vehicle_id = ? AND file_name = ? AND size = ?`)
const findRows = db.prepare(`SELECT id FROM vehicle_documents WHERE vehicle_id = ? AND file_name = ? AND size = ?`)
const delRow = db.prepare(`DELETE FROM vehicle_documents WHERE id = ?`)

// --reset: remove any rows previously imported from this same source set
// (matched precisely by vehicle + file_name + size), then re-insert fresh.
if (RESET) {
  let removed = 0
  for (const p of matched) {
    for (const f of p.files) {
      const fileName = safeName(basename(f))
      const size = statSync(f).size
      for (const r of findRows.all(p.veh!.id, fileName, size) as { id: string }[]) {
        const disk = join(UPLOAD_DIR, r.id); if (existsSync(disk)) unlinkSync(disk)
        delRow.run(r.id); removed++
      }
    }
  }
  console.log(`\n(reset: removed ${removed} previously-imported docs)`)
}

const ins = db.prepare(
  `INSERT INTO vehicle_documents (id, vehicle_id, doc_type, title, file_name, mime, size, expiry, created_at)
   VALUES (@id, @vehicle_id, @doc_type, @title, @file_name, @mime, @size, @expiry, @created_at)`,
)

let inserted = 0
let skipped = 0
const tx = db.transaction(() => {
  for (const p of matched) {
    for (const f of p.files) {
      const fileName = safeName(basename(f))
      const buf = readFileSync(f)
      if (existsRow.get(p.veh!.id, fileName, buf.length)) { skipped++; continue }
      const id = genId('vdoc')
      writeFileSync(join(UPLOAD_DIR, id), buf)
      ins.run({
        id,
        vehicle_id: p.veh!.id,
        doc_type: 'VEHICLE_LICENSE',
        title: basename(f, extname(f)).slice(0, 120),
        file_name: fileName,
        mime: MIME[extname(f).toLowerCase()] || 'application/octet-stream',
        size: buf.length,
        expiry: null,
        created_at: nowISO(),
      })
      inserted++
    }
  }
})
tx()

console.log(`\nDone: inserted ${inserted}, skipped ${skipped} (already present).`)
console.log(`Vehicles with at least one doc now: ${(db.prepare(`SELECT COUNT(DISTINCT vehicle_id) c FROM vehicle_documents`).get() as { c: number }).c}\n`)
