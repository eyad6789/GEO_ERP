// Fleet (الآليات) read-only computed endpoints.
// Three GET endpoints: /fleet/summary, /fleet/map, /fleet/costs.
// IQD and USD are ALWAYS kept separate — never summed together.
import { Router, type Request } from 'express'
import { db } from '../db/connection.js'

export const fleetRouter = Router()

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v) || 0
}

// Vehicle costs now come from REAL journal lines tagged with a vehicle_id (the
// single source of truth), not the legacy vehicle_costs table. Exposed with the
// same columns (vehicle_id, currency, amount, date, category) so the existing
// cost queries below work by swapping the FROM source. Category is mapped to the
// fleet's vocabulary (FUEL / MAINTENANCE / PARTS) so the Fleet UI stays intact.
const COST_SRC = `(
  SELECT jl.vehicle_id AS vehicle_id, jl.currency AS currency, jl.debit AS amount, je.date AS date,
    CASE WHEN jl.account_code LIKE '351%'        THEN 'FUEL'
         WHEN jl.account_code IN ('3202','3203') THEN 'MAINTENANCE'
         WHEN jl.account_code LIKE '352%'        THEN 'PARTS'
         ELSE 'MAINTENANCE' END AS category
  FROM journal_lines jl JOIN journal_entries je ON je.id = jl.entry_id
  WHERE jl.vehicle_id IS NOT NULL AND je.status != 'CANCELLED' AND jl.debit > 0
)`

// ---- Optional query-param filters for costs/summary -------------------------
function buildVehicleFilter(req: Request): { where: string; params: unknown[] } {
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (req.query.company_id) {
    where.push('v.company_id = ?')
    params.push(req.query.company_id)
  }
  if (req.query.project_id) {
    where.push('v.project_id = ?')
    params.push(req.query.project_id)
  }
  if (req.query.status) {
    where.push('v.status = ?')
    params.push(req.query.status)
  }
  return { where: where.join(' AND '), params }
}

// GET /api/fleet/summary
fleetRouter.get('/fleet/summary', (req, res) => {
  try {
    const { where, params } = buildVehicleFilter(req)

    // Status counts
    const countsRow = db
      .prepare(
        `SELECT
           COUNT(*) total,
           SUM(CASE WHEN v.status = 'ACTIVE'      THEN 1 ELSE 0 END) active,
           SUM(CASE WHEN v.status = 'INACTIVE'    THEN 1 ELSE 0 END) inactive,
           SUM(CASE WHEN v.status = 'MAINTENANCE' THEN 1 ELSE 0 END) maintenance,
           SUM(CASE WHEN v.status = 'RETIRED'     THEN 1 ELSE 0 END) retired
         FROM vehicles v WHERE ${where}`,
      )
      .get(...params) as { total: number; active: number; inactive: number; maintenance: number; retired: number }

    const counts = {
      total: num(countsRow?.total),
      active: num(countsRow?.active),
      inactive: num(countsRow?.inactive),
      maintenance: num(countsRow?.maintenance),
      retired: num(countsRow?.retired),
    }

    // By type
    const by_type = db
      .prepare(
        `SELECT v.vehicle_type, v.name_en, v.emoji, COUNT(*) count
         FROM vehicles v WHERE ${where}
         GROUP BY v.vehicle_type, v.name_en, v.emoji
         ORDER BY count DESC`,
      )
      .all(...params) as Array<{ vehicle_type: string; name_en: string; emoji: string; count: number }>

    // By project (LEFT JOIN projects; null project_id groups as "at HQ")
    const by_project = db
      .prepare(
        `SELECT
           v.project_id,
           COALESCE(p.name_ar, 'المقر الرئيسي') name_ar,
           COALESCE(p.name_en, 'Head Office')   name_en,
           COUNT(*) count
         FROM vehicles v
         LEFT JOIN projects p ON p.id = v.project_id
         WHERE ${where}
         GROUP BY v.project_id
         ORDER BY count DESC`,
      )
      .all(...params) as Array<{ project_id: string | null; name_ar: string; name_en: string; count: number }>

    // By status
    const by_status = db
      .prepare(
        `SELECT v.status, COUNT(*) count
         FROM vehicles v WHERE ${where}
         GROUP BY v.status ORDER BY count DESC`,
      )
      .all(...params) as Array<{ status: string; count: number }>

    // Registration alerts: expired / soon (≤90 days) / ok
    // Treats null/empty expiry as neither (excluded from all three buckets).
    const regRow = db
      .prepare(
        `SELECT
           SUM(CASE WHEN v.registration_expiry < date('now')
                    THEN 1 ELSE 0 END) expired,
           SUM(CASE WHEN v.registration_expiry >= date('now')
                     AND v.registration_expiry <= date('now','+90 days')
                    THEN 1 ELSE 0 END) soon,
           SUM(CASE WHEN v.registration_expiry > date('now','+90 days')
                    THEN 1 ELSE 0 END) ok
         FROM vehicles v
         WHERE ${where} AND v.registration_expiry IS NOT NULL AND v.registration_expiry != ''`,
      )
      .get(...params) as { expired: number; soon: number; ok: number }

    const registration_alerts = {
      expired: num(regRow?.expired),
      soon: num(regRow?.soon),
      ok: num(regRow?.ok),
    }

    // Oil alerts: oil_change_date older than 180 days
    const oilRow = db
      .prepare(
        `SELECT COUNT(*) due
         FROM vehicles v
         WHERE ${where}
           AND v.oil_change_date IS NOT NULL
           AND v.oil_change_date < date('now','-180 days')`,
      )
      .get(...params) as { due: number }

    const oil_alerts = { due: num(oilRow?.due) }

    res.json({ counts, by_type, by_project, by_status, registration_alerts, oil_alerts })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/fleet/map
fleetRouter.get('/fleet/map', (_req, res) => {
  try {
    // Projects that have lat AND lng
    const projects = db
      .prepare(
        `SELECT
           p.id,
           p.name_ar,
           p.name_en,
           p.location,
           p.lat,
           p.lng,
           p.status,
           CASE WHEN p.status = 'ACTIVE' THEN 'ACTIVE' ELSE 'MASTERPLAN' END kind,
           COUNT(v.id) vehicle_count
         FROM projects p
         LEFT JOIN vehicles v ON v.project_id = p.id
         WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
         GROUP BY p.id`,
      )
      .all() as Array<{
        id: string; name_ar: string; name_en: string; location: string
        lat: number; lng: number; status: string; kind: string; vehicle_count: number
      }>

    // Synthetic HQ base pin — only if there are vehicles with null project_id
    const hqCount = (
      db.prepare(`SELECT COUNT(*) c FROM vehicles WHERE project_id IS NULL`).get() as { c: number }
    ).c

    if (hqCount > 0) {
      projects.push({
        id: 'BASE',
        name_ar: 'المقر الرئيسي',
        name_en: 'Head Office',
        location: 'بغداد - المنصور',
        lat: 33.313,
        lng: 44.358,
        status: 'ACTIVE',
        kind: 'BASE',
        vehicle_count: hqCount,
      })
    }

    // Vehicles with lat AND lng
    const vehicles = db
      .prepare(
        `SELECT
           v.id,
           v.code,
           v.plate_number,
           v.name_ar,
           v.name_en,
           v.emoji,
           v.vehicle_type,
           v.status,
           v.lat,
           v.lng,
           v.project_id,
           COALESCE(p.name_ar, '—') project_name,
           v.location,
           v.driver_name
         FROM vehicles v
         LEFT JOIN projects p ON p.id = v.project_id
         WHERE v.lat IS NOT NULL AND v.lng IS NOT NULL`,
      )
      .all() as Array<{
        id: string; code: string; plate_number: string; name_ar: string; name_en: string; emoji: string
        vehicle_type: string; status: string; lat: number; lng: number
        project_id: string | null; project_name: string; location: string; driver_name: string
      }>

    res.json({ projects, vehicles })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})

// GET /api/fleet/costs
// IQD and USD ALWAYS kept separate — never summed together.
fleetRouter.get('/fleet/costs', (req, res) => {
  try {
    // Build optional filter on vehicle_costs joined to vehicles
    const vehicleWhere: string[] = ['1=1']
    const vehicleParams: unknown[] = []
    if (req.query.company_id) {
      vehicleWhere.push('v.company_id = ?')
      vehicleParams.push(req.query.company_id)
    }
    if (req.query.project_id) {
      vehicleWhere.push('v.project_id = ?')
      vehicleParams.push(req.query.project_id)
    }
    const vFilter = vehicleWhere.join(' AND ')

    // Totals
    const totalsRow = db
      .prepare(
        `SELECT
           SUM(CASE WHEN vc.currency = 'IQD' THEN vc.amount ELSE 0 END) iqd,
           SUM(CASE WHEN vc.currency = 'USD' THEN vc.amount ELSE 0 END) usd
         FROM ${COST_SRC} vc
         JOIN vehicles v ON v.id = vc.vehicle_id
         WHERE ${vFilter}`,
      )
      .get(...vehicleParams) as { iqd: number; usd: number }

    const totals = { iqd: num(totalsRow?.iqd), usd: num(totalsRow?.usd) }

    // By category
    const by_category = db
      .prepare(
        `SELECT
           vc.category,
           SUM(CASE WHEN vc.currency = 'IQD' THEN vc.amount ELSE 0 END) iqd,
           SUM(CASE WHEN vc.currency = 'USD' THEN vc.amount ELSE 0 END) usd
         FROM ${COST_SRC} vc
         JOIN vehicles v ON v.id = vc.vehicle_id
         WHERE ${vFilter}
         GROUP BY vc.category
         ORDER BY iqd DESC`,
      )
      .all(...vehicleParams) as Array<{ category: string; iqd: number; usd: number }>

    // By vehicle type (joins vehicle_costs -> vehicles for type + name_en)
    const by_type = db
      .prepare(
        `SELECT
           v.vehicle_type,
           v.name_en,
           SUM(CASE WHEN vc.currency = 'IQD' THEN vc.amount ELSE 0 END) iqd,
           SUM(CASE WHEN vc.currency = 'USD' THEN vc.amount ELSE 0 END) usd
         FROM ${COST_SRC} vc
         JOIN vehicles v ON v.id = vc.vehicle_id
         WHERE ${vFilter}
         GROUP BY v.vehicle_type, v.name_en
         ORDER BY iqd DESC`,
      )
      .all(...vehicleParams) as Array<{ vehicle_type: string; name_en: string; iqd: number; usd: number }>

    // By project
    const by_project = db
      .prepare(
        `SELECT
           v.project_id,
           COALESCE(p.name_ar, 'المقر الرئيسي') name_ar,
           SUM(CASE WHEN vc.currency = 'IQD' THEN vc.amount ELSE 0 END) iqd,
           SUM(CASE WHEN vc.currency = 'USD' THEN vc.amount ELSE 0 END) usd,
           COUNT(DISTINCT v.id) vehicles
         FROM ${COST_SRC} vc
         JOIN vehicles v ON v.id = vc.vehicle_id
         LEFT JOIN projects p ON p.id = v.project_id
         WHERE ${vFilter}
         GROUP BY v.project_id
         ORDER BY iqd DESC`,
      )
      .all(...vehicleParams) as Array<{ project_id: string | null; name_ar: string; iqd: number; usd: number; vehicles: number }>

    // By month (YYYY-MM)
    const by_month = db
      .prepare(
        `SELECT
           strftime('%Y-%m', vc.date) month,
           SUM(CASE WHEN vc.currency = 'IQD' THEN vc.amount ELSE 0 END) iqd,
           SUM(CASE WHEN vc.currency = 'USD' THEN vc.amount ELSE 0 END) usd
         FROM ${COST_SRC} vc
         JOIN vehicles v ON v.id = vc.vehicle_id
         WHERE ${vFilter} AND vc.date IS NOT NULL
         GROUP BY month
         ORDER BY month ASC`,
      )
      .all(...vehicleParams) as Array<{ month: string; iqd: number; usd: number }>

    res.json({ totals, by_category, by_type, by_project, by_month })
  } catch (e) {
    res.status(500).json({ error: (e as Error).message })
  }
})
