import type { BadgeColor } from '../../components/ui'
import type { InventoryTxnType } from '../../types'

// Seeded warehouse ids -> string keys (names resolved via t()).
export const WAREHOUSE_IDS = ['WH-01', 'WH-02'] as const
export type WarehouseId = (typeof WAREHOUSE_IDS)[number]

export const TXN_TYPES: InventoryTxnType[] = ['IN', 'OUT', 'TRANSFER', 'RETURN', 'ADJUST']

// Colored badge mapping for transaction types.
export const TXN_TYPE_COLOR: Record<InventoryTxnType, BadgeColor> = {
  IN: 'green',
  OUT: 'red',
  TRANSFER: 'blue',
  RETURN: 'amber',
  ADJUST: 'purple',
}

export type StockStatus = 'IN_STOCK' | 'LOW' | 'OUT'

export const STOCK_STATUS_COLOR: Record<StockStatus, BadgeColor> = {
  IN_STOCK: 'green',
  LOW: 'amber',
  OUT: 'red',
}

// Row shape returned by GET /api/warehouse/stock-summary
export interface StockSummaryRow {
  item_id: string
  code: string
  name_ar: string
  name_en: string
  category: string
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
