// Additive fleet seed — populates ONLY the vehicles + vehicle_costs tables from
// the Al-Qabas fleet sheet (server/seed/fleetData.ts). It does NOT touch
// companies, projects, accounts, journals or any other data — safe to run on a
// live demo to give the Fleet / Accounting-Vehicles screens real data.
//
// Run:  npm run seed:fleet
import { db } from '../db/connection.js'
import { FLEET_ROWS } from './fleetData.js'

const pad = (n: number, w = 3) => String(n).padStart(w, '0')
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
const nowIso = () => new Date().toISOString()

// Operating companies (exclude the parent) + projects to spread the fleet over.
const companyIds = (db.prepare(`SELECT id FROM companies WHERE type != 'PARENT' OR type IS NULL`).all() as Array<{ id: string }>).map((r) => r.id)
const projectIds = (db.prepare(`SELECT id FROM projects`).all() as Array<{ id: string }>).map((r) => r.id)
const fallbackCompany = companyIds[0] ?? null

// Baghdad-ish base so the map has coordinates when it's switched back on.
const BASE = { lat: 33.313, lng: 44.358 }

const insVehicle = db.prepare(`
  INSERT OR REPLACE INTO vehicles
   (id, code, vehicle_type, type_group, name_ar, name_en, emoji, plate_number, model_year,
    owner_name, owner_company_id, registration_expiry, oil_change_date, status, location,
    project_id, driver_name, driver_id, company_id, last_odometer, lat, lng, notes, created_at)
  VALUES (@id,@code,@vehicle_type,@type_group,@name_ar,@name_en,@emoji,@plate_number,@model_year,
    @owner_name,@owner_company_id,@registration_expiry,@oil_change_date,@status,@location,
    @project_id,@driver_name,@driver_id,@company_id,@last_odometer,@lat,@lng,@notes,@created_at)
`)
const insCost = db.prepare(`
  INSERT OR REPLACE INTO vehicle_costs (id, vehicle_id, category, amount, currency, date, note, created_at)
  VALUES (@id,@vehicle_id,@category,@amount,@currency,@date,@note,@created_at)
`)

const run = db.transaction(() => {
  // Reset ONLY the fleet tables (they hold demo fleet data only).
  db.prepare('DELETE FROM vehicle_costs').run()
  db.prepare('DELETE FROM vehicles').run()

  let vcost = 0
  FLEET_ROWS.forEach((row, idx) => {
    const r = Math.random()
    const status = r < 0.72 ? 'ACTIVE' : r < 0.85 ? 'MAINTENANCE' : r < 0.95 ? 'INACTIVE' : 'RETIRED'
    const vehId = `veh-${pad(row.seq)}`
    insVehicle.run({
      id: vehId,
      code: row.code,
      vehicle_type: row.vehicle_type,
      type_group: row.type_group,
      name_ar: row.name_ar,
      name_en: row.name_en,
      emoji: row.emoji,
      plate_number: row.plate_number,
      model_year: row.model_year,
      owner_name: row.owner_name,
      owner_company_id: null,
      registration_expiry: row.registration_expiry,
      oil_change_date: daysAgo(ri(10, 240)),
      status,
      location: row.location,
      project_id: projectIds.length ? projectIds[idx % projectIds.length] : null,
      driver_name: row.driver_name,
      driver_id: null,
      company_id: companyIds.length ? companyIds[idx % companyIds.length] : fallbackCompany,
      last_odometer: row.last_odometer,
      lat: BASE.lat + (Math.random() - 0.5) * 0.06,
      lng: BASE.lng + (Math.random() - 0.5) * 0.06,
      notes: '',
      created_at: nowIso(),
    })

    // IQD costs split across categories + recent months.
    if (row.amount_iqd > 0) {
      const cats = ['MAINTENANCE', 'FUEL', 'PARTS'] as const
      const n = ri(2, 3)
      let left = row.amount_iqd
      for (let s = 0; s < n; s++) {
        const amount = s < n - 1 ? Math.max(1, Math.round(left * (0.3 + Math.random() * 0.3))) : Math.max(1, left)
        left -= amount
        insCost.run({ id: `vcost-${pad(++vcost, 4)}`, vehicle_id: vehId, category: cats[s % cats.length], amount, currency: 'IQD', date: daysAgo(ri(15, 330)), note: '', created_at: nowIso() })
      }
    }
    if (row.amount_usd > 0) {
      insCost.run({ id: `vcost-${pad(++vcost, 4)}`, vehicle_id: vehId, category: 'MAINTENANCE', amount: row.amount_usd, currency: 'USD', date: daysAgo(ri(15, 330)), note: '', created_at: nowIso() })
    }
  })
  return vcost
})

const costRows = run()
const vCount = (db.prepare('SELECT COUNT(*) c FROM vehicles').get() as { c: number }).c
console.log(`✓ fleet seed: ${vCount} vehicles, ${costRows} cost rows (companies/projects/accounts untouched)`)
