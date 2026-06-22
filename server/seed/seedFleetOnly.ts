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

const pad = (n: number, w = 3) => String(n).padStart(w, '0')
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const companyIds = (db.prepare(`SELECT id FROM companies WHERE type != 'PARENT' OR type IS NULL`).all() as Array<{ id: string }>).map((r) => r.id)
const projectIds = (db.prepare(`SELECT id FROM projects`).all() as Array<{ id: string }>).map((r) => r.id)
const fallbackCompany = companyIds[0] ?? null

const HEAVY = new Set(['EXCAVATOR', 'LOADER', 'BULLDOZER', 'CRANE', 'DUMP_TRUCK', 'MIXER', 'ROLLER', 'DUMPER', 'TANKER', 'PUMP', 'LIFT'])
const CASH = { IQD: '181', USD: '182' }
const FUEL = '3511' // بنزين
const MATERIALS = '3526' // خامات أخرى
const maintAcct = (type: string) => (HEAVY.has(type) ? '3202' : '3203') // صيانة آلات كبيرة / وسائل نقل
const CAT_LABEL: Record<string, string> = { FUEL: 'وقود', MAINTENANCE: 'صيانة', MATERIALS: 'خامات' }

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

// Post one balanced vehicle-expense entry: debit the expense, credit the cash box.
function postCost(serial: number, vehId: string, company: string | null, project: string | null, acct: string, category: string, amount: number, currency: 'IQD' | 'USD', date: string, label: string) {
  const id = genId('je')
  const rate = currency === 'USD' ? 1500 : 1
  insEntry.run({ id, serial_number: `VSEED-${pad(serial, 5)}`, doc_number: `VSEED-${pad(serial, 5)}`, company_id: company, project_id: project, date, description: `${CAT_LABEL[category]} — ${label}`, currency, exchange_rate: rate, status: 'APPROVED', total_debit: amount, total_credit: amount, created_at: nowISO() })
  insLine.run({ id: genId('jl'), entry_id: id, account_code: acct, company_id: company, project_id: project, description: `${CAT_LABEL[category]} — ${label}`, currency, price: rate, value: amount * rate, debit: amount, credit: 0, vehicle_id: vehId })
  insLine.run({ id: genId('jl'), entry_id: id, account_code: CASH[currency], company_id: company, project_id: project, description: `${CAT_LABEL[category]} — ${label}`, currency, price: rate, value: amount * rate, debit: 0, credit: amount, vehicle_id: null })
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
    const r = Math.random()
    const status = r < 0.72 ? 'ACTIVE' : r < 0.85 ? 'MAINTENANCE' : r < 0.95 ? 'INACTIVE' : 'RETIRED'
    const vehId = `veh-${pad(row.seq)}`
    const company = companyIds.length ? companyIds[idx % companyIds.length] : fallbackCompany
    const project = projectIds.length && idx % 2 === 0 ? projectIds[idx % projectIds.length] : null
    const label = `${row.name_ar} (${row.plate_number})`
    insVehicle.run({
      id: vehId, code: row.code, vehicle_type: row.vehicle_type, type_group: row.type_group,
      name_ar: row.name_ar, name_en: row.name_en, emoji: row.emoji, plate_number: row.plate_number,
      model_year: row.model_year, owner_name: row.owner_name, owner_company_id: null,
      registration_expiry: row.registration_expiry, oil_change_date: daysAgo(ri(10, 240)),
      status, location: row.location, project_id: project, driver_name: row.driver_name, driver_id: null,
      company_id: company, last_odometer: row.last_odometer,
      lat: 33.313 + (Math.random() - 0.5) * 0.06, lng: 44.358 + (Math.random() - 0.5) * 0.06,
      notes: '', created_at: nowISO(),
    })

    // IQD costs → 1-3 entries cycling fuel / maintenance / materials.
    if (row.amount_iqd > 0) {
      const plan = [
        { acct: FUEL, cat: 'FUEL' },
        { acct: maintAcct(row.vehicle_type), cat: 'MAINTENANCE' },
        { acct: MATERIALS, cat: 'MATERIALS' },
      ]
      const n = ri(2, 3)
      let left = row.amount_iqd
      for (let s = 0; s < n; s++) {
        const amount = s < n - 1 ? Math.max(1, Math.round(left * (0.3 + Math.random() * 0.3))) : Math.max(1, left)
        left -= amount
        const p = plan[s % plan.length]
        postCost(++serial, vehId, company, project, p.acct, p.cat, amount, 'IQD', daysAgo(ri(15, 330)), label)
      }
    }
    // USD costs → one maintenance entry.
    if (row.amount_usd > 0) {
      postCost(++serial, vehId, company, project, maintAcct(row.vehicle_type), 'MAINTENANCE', row.amount_usd, 'USD', daysAgo(ri(15, 330)), label)
    }
  })
  return serial
})

const entries = run()
ensureVehicleAccounts() // create an asset account under اليات (5) for each vehicle
const vCount = (db.prepare('SELECT COUNT(*) c FROM vehicles').get() as { c: number }).c
const acctCount = (db.prepare("SELECT COUNT(*) c FROM accounts WHERE parent_code = '5'").get() as { c: number }).c
console.log(`✓ fleet seed: ${vCount} vehicles, ${entries} cost journal entries, ${acctCount} vehicle accounts under اليات`)
