import type { BadgeColor } from '../../components/ui'
import type { InventoryTxnType, Item, Warehouse, WarehouseType } from '../../types'
import type { Lang } from '../../i18n/strings'

export const TXN_TYPES: InventoryTxnType[] = ['IN', 'OUT', 'TRANSFER', 'RETURN', 'ADJUST']

// Colored badge mapping for warehouse type (MAIN physical store vs. PROJECT site).
export const WAREHOUSE_TYPE_COLOR: Record<WarehouseType, BadgeColor> = {
  MAIN: 'gray',
  PROJECT: 'sky',
}

// MAIN warehouses first, then PROJECT, alphabetical (Arabic) within each group.
export function sortWarehouses(list: Warehouse[]): Warehouse[] {
  return [...list].sort((a, b) =>
    a.type === b.type ? a.name_ar.localeCompare(b.name_ar, 'ar') : a.type === 'MAIN' ? -1 : 1,
  )
}

// Colored badge mapping for transaction types.
export const TXN_TYPE_COLOR: Record<InventoryTxnType, BadgeColor> = {
  IN: 'green',
  OUT: 'red',
  TRANSFER: 'blue',
  RETURN: 'amber',
  ADJUST: 'purple',
}

// Iraqi-dialect search synonyms: every word in a group matches items containing
// any other word of the group. Built-in seed; the storekeeper's confirmed
// "هل تقصد…؟" answers extend it at runtime via the search_synonyms table.
export const SEARCH_SYNONYM_GROUPS: string[][] = [
  ['بوري', 'بواري', 'انبوب', 'أنبوب', 'انابيب', 'أنابيب', 'بايب'],
  ['صوندة', 'صونده', 'خرطوم', 'هوز'],
  ['واير', 'وایر', 'كيبل', 'كابل', 'سلك', 'اسلاك'],
  ['سكلة', 'سكله', 'سقالة', 'سقاله', 'شتايكر'],
  ['ماطور', 'موتور', 'محرك'],
  ['قفل', 'صمام'],
  ['تاير', 'اطار', 'إطار', 'اطارات'],
  ['مولدة', 'مولده', 'مولد', 'جنريتر'],
  ['كاشي', 'تايل', 'سيراميك'],
  ['واشر', 'واشرات', 'جوان'],
]

// Units actually used across the real inventory — suggestions for the item form
// (the storekeeper can still type any unit he wants).
export const COMMON_UOMS = ['قطعة', 'لوط', 'كيس', 'متر', 'رول', 'لفة', 'طن', 'عدد', 'صندوق', 'برميل']

// Common pipeline diameters (mm) — quick-pick chips in the item form.
export const COMMON_DN_SIZES = [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000]

/** Normalize a free-typed size ("600", "DN 600", "2 انج") into label + sortable mm. */
export function parseSizeInput(raw: string): { size_label: string; size_mm: number | null } {
  const s = (raw ?? '').trim()
  if (!s) return { size_label: '', size_mm: null }
  const dn = s.match(/^(?:dn\s*)?(\d{2,4})(?:\s*(?:ملم|مم|mm))?$/i)
  if (dn) return { size_label: `DN ${dn[1]}`, size_mm: Number(dn[1]) }
  const inch = s.match(/^([\d.]+)\s*(?:انج|إنج|عقدة|inch|in|")$/i)
  if (inch) return { size_label: `${inch[1]} انج`, size_mm: Math.round(Number(inch[1]) * 25.4 * 10) / 10 }
  return { size_label: s, size_mm: null }
}

/** Next auto-generated code for storekeeper-created items (ITM-NEW-001, 002, …). */
export function nextItemCode(existing: Array<{ code: string }>): string {
  let max = 0
  for (const r of existing) {
    const m = /^ITM-NEW-(\d+)$/.exec(r.code ?? '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `ITM-NEW-${String(max + 1).padStart(3, '0')}`
}

// Item condition (imported from the workbooks' notes) — canonical ids.
export type ItemCondition = 'NEW' | 'GOOD' | 'USED' | 'NEEDS_REPAIR' | 'BROKEN'
export const CONDITION_COLOR: Record<ItemCondition, BadgeColor> = {
  NEW: 'green',
  GOOD: 'green',
  USED: 'sky',
  NEEDS_REPAIR: 'amber',
  BROKEN: 'red',
}

// Row shape returned by GET /api/warehouse/custody (open loans board)
export interface CustodyRow {
  id: string
  serial_number: string
  date: string
  type: InventoryTxnType
  received_by: string | null
  warehouse_id: string
  notes: string
  returned_at: string | null
  items_text: string
}

// Group shape returned by GET /api/warehouse/duplicate-candidates
export interface DuplicateItem {
  id: string
  code: string
  name_ar: string
  category: string
  sub_category: string
  size_label: string
  uom: string
  spec: string
  quantity: number
}

// Row shape returned by GET /api/warehouse/transfer-flows
export interface TransferFlowRow {
  type: InventoryTxnType
  from_warehouse_id: string | null
  warehouse_id: string
  txn_count: number
  total_qty: number
  last_date: string
}

export type StockStatus = 'IN_STOCK' | 'LOW' | 'OUT'

export const STOCK_STATUS_COLOR: Record<StockStatus, BadgeColor> = {
  IN_STOCK: 'green',
  LOW: 'amber',
  OUT: 'red',
}

/** Recompute a status from a quantity + minimum (used for per-warehouse views). */
export function statusFor(quantity: number, minStock: number): StockStatus {
  if (quantity <= 0) return 'OUT'
  if (quantity <= (minStock || 0)) return 'LOW'
  return 'IN_STOCK'
}

// Row shape returned by GET /api/warehouse/stock-summary
export interface StockSummaryRow {
  item_id: string
  code: string
  name_ar: string
  name_en: string
  category: string
  sub_category: string
  size_label: string
  size_mm: number | null
  condition: ItemCondition | null
  shelf_location: string
  spec: string
  uom: string
  min_stock: number
  max_stock: number
  unit_cost: number
  quantity: number
  value: number
  stock_status: StockStatus
}

// Row shape returned by GET /api/warehouse/low-stock
export interface LowStockRow {
  item_id: string
  code: string
  name_ar: string
  name_en: string
  category: string
  uom: string
  min_stock: number
  quantity: number
}

// ---- Category taxonomy (GET /api/warehouse/categories) ----------------------
export interface SubCategoryDef {
  id: string
  name_ar: string
  name_en: string
}

export interface CategoryDef {
  id: string
  name_ar: string
  name_en: string
  subs: SubCategoryDef[]
}

// Row shape returned by GET /api/warehouse/stock-matrix (non-zero cells only).
export interface StockMatrixRow {
  item_id: string
  warehouse_id: string
  quantity: number
}

// Response of GET /api/warehouse/item/:id
export interface ItemStockRow {
  warehouse_id: string
  name_ar: string
  name_en: string | null
  type: WarehouseType
  quantity: number
}

export interface ItemMoveRow {
  id: string
  date: string
  type: InventoryTxnType
  serial_number: string
  notes: string
  warehouse_id: string
  from_warehouse_id: string | null
  quantity: number
  uom: string
}

export interface ItemDetailResponse {
  item: Item
  stock: ItemStockRow[]
  moves: ItemMoveRow[]
  /** Photo URLs: workbook-extracted (/item-images/…) + camera uploads (/api/warehouse/item-photos/…). */
  photos: string[]
}

/** Localized category name; falls back to the raw id for legacy/user-created ones. */
export function categoryLabel(
  taxonomy: CategoryDef[] | null | undefined,
  id: string,
  lang: Lang,
): string {
  if (!id) return lang === 'ar' ? 'غير مصنف' : 'Uncategorized'
  const cat = taxonomy?.find((c) => c.id === id)
  if (!cat) return id
  return lang === 'ar' ? cat.name_ar : cat.name_en
}

/** Localized sub-category name (searches every category); falls back to the raw id. */
export function subCategoryLabel(
  taxonomy: CategoryDef[] | null | undefined,
  subId: string,
  lang: Lang,
): string {
  if (!subId) return ''
  for (const c of taxonomy ?? []) {
    const sub = c.subs.find((s) => s.id === subId)
    if (sub) return lang === 'ar' ? sub.name_ar : sub.name_en
  }
  return subId
}

/** Short warehouse label — strips the «مستودع » / «Warehouse » prefix for chips. */
export function shortWarehouseName(name: string): string {
  return name.replace(/^مستودع\s+/, '').replace(/^warehouse\s+/i, '').trim() || name
}
