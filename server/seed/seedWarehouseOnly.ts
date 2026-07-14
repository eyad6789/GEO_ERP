// Additive warehouse-only seed — real Abu Ghraib + Al Dora inventory, plus the
// 3 project warehouses (جلولاء / خان ضاري / اليرموك). Only touches: warehouses,
// items, stock, inventory_transactions, inventory_lines. Companies/projects/
// accounts and everything else are left alone. Run: npm run seed:warehouse
import { db } from '../db/connection.js'
import { seedWarehouseData } from './warehouseSeeder.js'

const projectRows = db.prepare(`SELECT id, name_ar FROM projects`).all() as Array<{ id: string; name_ar: string }>
const projectByName = (kw: string) => projectRows.find((p) => p.name_ar.includes(kw))?.id ?? ''
const parentRow = db.prepare(`SELECT id FROM companies WHERE type = 'PARENT' LIMIT 1`).get() as { id: string } | undefined

const projectIds = [projectByName('جلولاء'), projectByName('خان ضاري'), projectByName('اليرموك')]

const run = db.transaction(() => {
  db.prepare('DELETE FROM inventory_lines').run()
  db.prepare('DELETE FROM inventory_transactions').run()
  db.prepare('DELETE FROM stock').run()
  db.prepare('DELETE FROM items').run()
  db.prepare('DELETE FROM warehouses').run()
  return seedWarehouseData(projectIds, parentRow?.id ?? '')
})

const result = run()
console.log(`✓ warehouse seed: ${result.warehouses} warehouses, ${result.items} items, ${result.transfers} transfer events`)
