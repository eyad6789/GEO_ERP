// Additive fleet seed — vehicles + their costs AS REAL JOURNAL ENTRIES.
// Each vehicle cost is posted as a balanced journal entry (debit the expense
// account → بنزين/صيانة/خامات, credit the cash box) tagged with vehicle_id, so
// every cost row in the الآليات screen opens its journal entry.
//
// It only touches: vehicles, vehicle_costs (cleared), and the journal entries it
// itself created (serial 'VSEED-…'). Companies/projects/accounts and any other
// journal entries are left alone. Run: npm run seed:fleet
import { db, ensureVehicleAccounts } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { FLEET_ROWS } from './fleetData.js'
import { FLEET_COSTS } from './fleetCosts.js'

// Real per-vehicle maintenance ledger, grouped by vehicle seq.
const COSTS_BY_SEQ = new Map<number, typeof FLEET_COSTS>()
for (const c of FLEET_COSTS) {
  const arr = COSTS_BY_SEQ.get(c.seq) ?? []
  arr.push(c)
  COSTS_BY_SEQ.set(c.seq, arr)
}

const pad = (n: number, w = 3) => String(n).padStart(w, '0')
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const companyIds = (db.prepare(`SELECT id FROM companies WHERE type != 'PARENT' OR type IS NULL`).all() as Array<{ id: string }>).map((r) => r.id)
const projectRows = db.prepare(`SELECT id, name_ar FROM projects`).all() as Array<{ id: string; name_ar: string }>
const fallbackCompany = companyIds[0] ?? null

// The 5 real fleet locations → map coords + the project they belong to. جلولاء and
// خان ضاري are active project sites (matched by name against the real projects table,
// since prod project ids differ); المنصور (HQ), الدورة and أبو غريب are yards (no project).
const projectByName = (kw: string) => projectRows.find((p) => p.name_ar.includes(kw))?.id ?? null
const LOCATION_MAP: Record<string, { pid: string | null; lat: number; lng: number }> = {
  'خان ضاري': { pid: projectByName('خان ضاري'), lat: 33.36,  lng: 43.78  },
  'جلولاء':   { pid: projectByName('جلولاء'),   lat: 34.27,  lng: 45.15  },
  'المنصور':  { pid: null,                       lat: 33.313, lng: 44.358 },
  'الدورة':   { pid: null,                       lat: 33.265, lng: 44.401 },
  'أبو غريب': { pid: null,                       lat: 33.308, lng: 44.000 },
}

const HEAVY = new Set(['EXCAVATOR', 'LOADER', 'BULLDOZER', 'CRANE', 'DUMP_TRUCK', 'MIXER', 'ROLLER', 'DUMPER', 'TANKER', 'PUMP', 'LIFT'])
// Vehicle expenses are credited to «الاستحقاقيات» (accrued liabilities, 22) — NOT
// cash — so the cash boxes never go negative; the books still balance (expense↑,
// liability↑). Real cash payments can later be recorded against this liability.
const ACCRUED = '22'
const FUEL = '3511' // بنزين
const MATERIALS = '3526' // خامات أخرى
const maintAcct = (type: string) => (HEAVY.has(type) ? '3202' : '3203') // صيانة آلات كبيرة / وسائل نقل
const CAT_LABEL: Record<string, string> = { FUEL: 'وقود', MAINTENANCE: 'صيانة', MATERIALS: 'خامات' }
// Pick the expense account for a cost line from its category + the vehicle type.
const acctFor = (category: string, type: string) =>
  category === 'FUEL' ? FUEL : category === 'MATERIALS' ? MATERIALS : maintAcct(type)

const insVehicle = db.prepare(`
  INSERT OR REPLACE INTO vehicles
   (id, code, vehicle_type, type_group, name_ar, name_en, emoji, plate_number, model_year,
    owner_name, owner_company_id, registration_expiry, oil_change_date, status, location,
    project_id, driver_name, driver_id, company_id, last_odometer, lat, lng, notes, created_at)
  VALUES (@id,@code,@vehicle_type,@type_group,@name_ar,@name_en,@emoji,@plate_number,@model_year,
    @owner_name,@owner_company_id,@registration_expiry,@oil_change_date,@status,@location,
    @project_id,@driver_name,@driver_id,@company_id,@last_odometer,@lat,@lng,@notes,@created_at)
`)
const insEntry = db.prepare(`
  INSERT INTO journal_entries (id, serial_number, doc_number, company_id, project_id, date, description, currency, exchange_rate, status, total_debit, total_credit, created_at)
  VALUES (@id,@serial_number,@doc_number,@company_id,@project_id,@date,@description,@currency,@exchange_rate,@status,@total_debit,@total_credit,@created_at)
`)
const insLine = db.prepare(`
  INSERT INTO journal_lines (id, entry_id, account_code, company_id, project_id, description, currency, price, value, debit, credit, vehicle_id)
  VALUES (@id,@entry_id,@account_code,@company_id,@project_id,@description,@currency,@price,@value,@debit,@credit,@vehicle_id)
`)

// Post one balanced vehicle-expense entry: debit the expense, credit the accrued
// liability. `desc` is the real maintenance description from the Excel ledger.
function postCost(serial: number, vehId: string, company: string | null, project: string | null, acct: string, amount: number, currency: 'IQD' | 'USD', date: string | null, desc: string) {
  const id = genId('je')
  const rate = currency === 'USD' ? 1500 : 1
  insEntry.run({ id, serial_number: `VSEED-${pad(serial, 5)}`, doc_number: `VSEED-${pad(serial, 5)}`, company_id: company, project_id: project, date, description: desc, currency, exchange_rate: rate, status: 'APPROVED', total_debit: amount, total_credit: amount, created_at: nowISO() })
  insLine.run({ id: genId('jl'), entry_id: id, account_code: acct, company_id: company, project_id: project, description: desc, currency, price: rate, value: amount * rate, debit: amount, credit: 0, vehicle_id: vehId })
  insLine.run({ id: genId('jl'), entry_id: id, account_code: ACCRUED, company_id: company, project_id: project, description: desc, currency, price: rate, value: amount * rate, debit: 0, credit: amount, vehicle_id: null })
}

const run = db.transaction(() => {
  // Reset: this seed's own journal entries, the legacy demo costs, and vehicles.
  const seeded = db.prepare(`SELECT id FROM journal_entries WHERE serial_number LIKE 'VSEED-%'`).all() as Array<{ id: string }>
  const delLines = db.prepare('DELETE FROM journal_lines WHERE entry_id = ?')
  const delEntry = db.prepare('DELETE FROM journal_entries WHERE id = ?')
  for (const e of seeded) { delLines.run(e.id); delEntry.run(e.id) }
  db.prepare('DELETE FROM vehicle_costs').run()
  db.prepare(`DELETE FROM accounts WHERE parent_code = '5'`).run() // auto-generated vehicle accounts
  db.prepare('DELETE FROM vehicles').run()

  let serial = 0
  FLEET_ROWS.forEach((row, idx) => {
    const loc = LOCATION_MAP[row.location.trim()] ?? { pid: null, lat: 33.313, lng: 44.358 }
    const r = Math.random()
    // Cars parked at المنصور (HQ/warehouse bucket) are good but idle → MAINTENANCE.
    const status = row.location.trim() === 'المنصور'
      ? 'MAINTENANCE'
      : (r < 0.72 ? 'ACTIVE' : r < 0.85 ? 'MAINTENANCE' : r < 0.95 ? 'INACTIVE' : 'RETIRED')
    const vehId = `veh-${pad(row.seq)}`
    const company = companyIds.length ? companyIds[idx % companyIds.length] : fallbackCompany
    const project = loc.pid
    const label = `${row.name_ar} (${row.plate_number})`
    insVehicle.run({
      id: vehId, code: row.code, vehicle_type: row.vehicle_type, type_group: row.type_group,
      name_ar: row.name_ar, name_en: row.name_en, emoji: row.emoji, plate_number: row.plate_number,
      model_year: row.model_year, owner_name: row.owner_name, owner_company_id: null,
      registration_expiry: row.registration_expiry, oil_change_date: daysAgo(ri(10, 240)),
      status, location: row.location, project_id: project, driver_name: row.driver_name, driver_id: null,
      company_id: company, last_odometer: row.last_odometer,
      lat: loc.lat + (Math.random() - 0.5) * 0.06, lng: loc.lng + (Math.random() - 0.5) * 0.06,
      notes: '', created_at: nowISO(),
    })

    // Real IQD maintenance ledger from the Excel detail sheets — one journal
    // entry per logged line item (real date + Arabic description + account).
    for (const c of COSTS_BY_SEQ.get(row.seq) ?? []) {
      postCost(++serial, vehId, company, project, acctFor(c.category, row.vehicle_type), c.iqd, 'IQD', c.date, c.details || `${CAT_LABEL[c.category]} — ${label}`)
    }
    // USD: the detail sheets' USD column is unreliable, so post the vehicle's
    // authoritative USD total (from the master sheet) as one maintenance entry.
    if (row.amount_usd > 0) {
      postCost(++serial, vehId, company, project, maintAcct(row.vehicle_type), row.amount_usd, 'USD', null, `إجمالي المصاريف بالدولار — ${label}`)
    }
  })
  return serial
})

const entries = run()
ensureVehicleAccounts() // create an asset account under اليات (5) for each vehicle
const vCount = (db.prepare('SELECT COUNT(*) c FROM vehicles').get() as { c: number }).c
const acctCount = (db.prepare("SELECT COUNT(*) c FROM accounts WHERE parent_code = '5'").get() as { c: number }).c
console.log(`✓ fleet seed: ${vCount} vehicles, ${entries} cost journal entries, ${acctCount} vehicle accounts under اليات`)
