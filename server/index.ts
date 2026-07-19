// GEO ERP backend — thin Express API over SQLite.
// In production it also serves the built frontend (dist/) so a single process
// serves the whole app. Run `npm run build` first.
import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname, join, sep } from 'node:path'
import { existsSync } from 'node:fs'
import './db/connection.js' // ensures schema exists
import { dashboardRouter } from './routes/dashboard.js'
import { accountingRouter } from './routes/accounting.js'
import { warehouseRouter } from './routes/warehouse.js'
import { reportsRouter } from './routes/reports.js'
import { fleetRouter } from './routes/fleet.js'
import { vehicleAccountingRouter } from './routes/vehicleAccounting.js'
import { vehicleDocsRouter } from './routes/vehicleDocs.js'
import { employeeDocsRouter } from './routes/employeeDocs.js'
import { hrImportRouter } from './routes/hrImport.js'
import { resourceRouter } from './routes/resource.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
// Document uploads (base64 scans) need a bigger body; keep every other route small.
app.use('/api/vehicle-documents', express.json({ limit: '30mb' }))
app.use('/api/employee-documents', express.json({ limit: '30mb' }))
app.use('/api/hr/attendance-import', express.json({ limit: '30mb' }))
// Item camera photos (base64) also need headroom.
app.use('/api/warehouse/item-photo', express.json({ limit: '20mb' }))
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
app.use('/api', employeeDocsRouter)
app.use('/api', hrImportRouter)

// Generic CRUD last.
app.use('/api', resourceRouter)

// Serve the built SPA (production). Falls back to index.html for client routes.
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      // Serve index.html only through the no-cache fallback below, never as a
      // cacheable static file.
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          // The SPA shell must always revalidate: a new deploy renames the
          // hashed JS/CSS bundles, and a stale cached shell would point at
          // bundles that no longer exist → a half-broken, version-skewed page
          // (e.g. theme styles and app code from different builds).
          res.setHeader('Cache-Control', 'no-cache')
        } else if (filePath.includes(`${sep}assets${sep}`)) {
          // Everything under assets/ is content-hashed, so it can be cached
          // forever — a changed file gets a new name.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        }
      },
    }),
  )
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(join(distDir, 'index.html'))
  })
}

const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => {
  const mode = existsSync(distDir) ? 'app + API' : 'API only'
  console.log(`\n  ⚙  GEO ERP (${mode}) running on http://${HOST}:${PORT}\n`)
})
