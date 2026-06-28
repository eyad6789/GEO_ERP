// GEO ERP backend — thin Express API over SQLite.
// In production it also serves the built frontend (dist/) so a single process
// serves the whole app. Run `npm run build` first.
import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import './db/connection.js' // ensures schema exists
import { dashboardRouter } from './routes/dashboard.js'
import { accountingRouter } from './routes/accounting.js'
import { warehouseRouter } from './routes/warehouse.js'
import { reportsRouter } from './routes/reports.js'
import { fleetRouter } from './routes/fleet.js'
import { vehicleAccountingRouter } from './routes/vehicleAccounting.js'
import { vehicleDocsRouter } from './routes/vehicleDocs.js'
import { resourceRouter } from './routes/resource.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
// Document uploads (base64 scans) need a bigger body; keep every other route small.
app.use('/api/vehicle-documents', express.json({ limit: '30mb' }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Special endpoints first (override generic for shared paths).
app.use('/api', dashboardRouter)
app.use('/api', accountingRouter)
app.use('/api', warehouseRouter)
app.use('/api', reportsRouter)
app.use('/api', fleetRouter)
app.use('/api', vehicleAccountingRouter)
app.use('/api', vehicleDocsRouter)

// Generic CRUD last.
app.use('/api', resourceRouter)

// Serve the built SPA (production). Falls back to index.html for client routes.
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
    res.sendFile(join(distDir, 'index.html'))
  })
}

const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => {
  const mode = existsSync(distDir) ? 'app + API' : 'API only'
  console.log(`\n  ⚙  GEO ERP (${mode}) running on http://${HOST}:${PORT}\n`)
})
