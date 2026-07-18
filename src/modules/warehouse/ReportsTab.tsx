import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { AlertTriangle, BellRing, Boxes, Layers, PackageX, Warehouse as WarehouseIcon, ArrowLeftRight } from 'lucide-react'
import { Card, CardHeader, CardBody, Badge, Select, LoadingState } from '../../components/ui'
import { ChartCard, EmptyState, KpiCard, CHART_COLORS } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useChartTheme } from '../../hooks/useChartTheme'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber, formatDate, pickName } from '../../lib/format'
import type { InventoryTransaction, Warehouse } from '../../types'
import { categoryLabel, sortWarehouses, type CategoryDef, type LowStockRow, type StockSummaryRow } from './helpers'

// Row shape returned by GET /api/warehouse/reorder-radar
interface ReorderRadarRow {
  item_id: string
  code: string
  name_ar: string
  name_en: string
  category: string
  sub_category: string
  size_label: string | null
  uom: string
  min_stock: number
  quantity: number
}

export function ReportsTab() {
  const t = useT()
  const { lang } = useLang()
  const ct = useChartTheme()
  const [warehouseId, setWarehouseId] = useState<string>('')

  const { data: summary, loading } = useApi<StockSummaryRow[]>(
    '/warehouse/stock-summary',
    warehouseId ? { warehouse_id: warehouseId } : undefined,
  )
  const { data: lowStock } = useApi<LowStockRow[]>('/warehouse/low-stock')
  const { data: radar } = useApi<ReorderRadarRow[]>('/warehouse/reorder-radar')
  const { data: taxonomy } = useApi<CategoryDef[]>('/warehouse/categories')
  const { data: warehouses } = useResource<Warehouse>('warehouses')
  const { data: transactions } = useResource<InventoryTransaction>('inventory_transactions')
  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>()
    for (const w of warehouses) m.set(w.id, w)
    return m
  }, [warehouses])
  const recentTransfers = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === 'TRANSFER')
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 6),
    [transactions],
  )

  const rows = summary ?? []

  const totals = useMemo(() => {
    let qty = 0
    let outOfStock = 0
    for (const r of rows) {
      qty += r.quantity || 0
      if (r.stock_status === 'OUT') outOfStock += 1
    }
    return { count: rows.length, qty, outOfStock }
  }, [rows])

  // Item count by category (costs are all 0 for real data, so value charts are meaningless).
  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const cat = r.category || 'OTHER'
      m.set(cat, (m.get(cat) ?? 0) + 1)
    }
    return Array.from(m.entries())
      .map(([id, count]) => ({ category: categoryLabel(taxonomy, id, lang), count }))
      .sort((a, b) => b.count - a.count)
  }, [rows, taxonomy, lang])

  const whOptions = [
    { value: '', label: t('warehouse.reports.all') },
    ...sortWarehouses(warehouses).map((w) => ({
      value: w.id,
      label: pickName(w, lang),
      group: t(`warehouse.wh_type.${w.type}`),
    })),
  ]

  const low = (lowStock ?? []).filter((r) => r.quantity <= 0)
  const radarRows = radar ?? []

  return (
    <div className="space-y-6">
      {/* Warehouse selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <WarehouseIcon className="h-4 w-4 text-primary" />
          {t('warehouse.reports.warehouse')}
        </span>
        <div className="w-64 max-w-full">
          <Select value={warehouseId} options={whOptions} onChange={(e) => setWarehouseId(e.target.value)} />
        </div>
      </div>

      {/* Valuation KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('warehouse.reports.total_items')}
          value={formatNumber(totals.count, lang)}
          icon={<Boxes className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('warehouse.reports.total_qty')}
          value={formatNumber(totals.qty, lang)}
          icon={<Layers className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('warehouse.reports.out_of_stock')}
          value={formatNumber(totals.outOfStock, lang)}
          icon={<PackageX className="h-5 w-5" />}
          accent={totals.outOfStock > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low-stock alerts: reorder radar (explicit thresholds) + zero-stock list */}
        <Card>
          <CardHeader
            title={t('warehouse.radar.title')}
            subtitle={`${radarRows.length}`}
            icon={<BellRing className="h-5 w-5 text-warning" />}
          />
          <CardBody className="p-0">
            {radarRows.length === 0 ? (
              <EmptyState title={t('warehouse.radar.empty')} icon={<Boxes className="h-8 w-8" />} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {radarRows.map((r) => (
                  <li key={r.item_id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">{pickName(r, lang)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        <span className="font-mono">{r.code}</span> · {r.size_label || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t('warehouse.reports.current')}:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {formatNumber(r.quantity, lang)}
                        </span>{' '}
                        / {t('warehouse.reports.min')}:{' '}
                        <span className="tabular-nums">{formatNumber(r.min_stock, lang)}</span>
                      </span>
                      <Badge color="amber" dot>
                        {t('warehouse.radar.below')} {formatNumber(r.min_stock - r.quantity, lang)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>

          <CardHeader
            className="border-t border-slate-100 dark:border-slate-700/70"
            title={t('warehouse.reports.low_stock_title')}
            subtitle={`${low.length}`}
            icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          />
          <CardBody className="p-0">
            {low.length === 0 ? (
              <EmptyState title={t('warehouse.reports.low_stock_empty')} icon={<Boxes className="h-8 w-8" />} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {low.map((r) => (
                  <li key={r.item_id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-100">{pickName(r, lang)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        <span className="font-mono">{r.code}</span> · {r.category || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t('warehouse.reports.current')}:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {formatNumber(r.quantity, lang)}
                        </span>
                      </span>
                      <span className="text-slate-400 dark:text-slate-400">
                        {t('warehouse.reports.min')}:{' '}
                        <span className="tabular-nums">{formatNumber(r.min_stock, lang)}</span>
                      </span>
                      <Badge color="red" dot>
                        {t('warehouse.stock.OUT')}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Stock value by category */}
        {byCategory.length === 0 ? (
          <Card>
            <CardHeader title={t('warehouse.reports.by_category_count')} icon={<Layers className="h-5 w-5" />} />
            <CardBody>
              {loading ? (
                <LoadingState label={t('common.loading')} />
              ) : (
                <EmptyState title={t('common.empty')} icon={<Layers className="h-8 w-8" />} />
              )}
            </CardBody>
          </Card>
        ) : (
          <ChartCard
            title={t('warehouse.reports.by_category_count')}
            subtitle={t('warehouse.reports.item_count')}
            icon={<Layers className="h-5 w-5" />}
            height={300}
          >
            <BarChart data={byCategory} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: ct.axis }} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tickFormatter={(v) => formatNumber(Number(v), lang)} tick={{ fontSize: 11, fill: ct.axis }} width={56} />
              <Tooltip
                formatter={(v: number | string) => formatNumber(Number(v), lang)}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${ct.tooltipBorder}`, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}
      </div>

      {/* Recent transfers — surfaces from→to movements at a glance */}
      <Card>
        <CardHeader
          title={t('warehouse.reports.recent_transfers')}
          subtitle={`${recentTransfers.length}`}
          icon={<ArrowLeftRight className="h-5 w-5 text-primary" />}
        />
        <CardBody className="p-0">
          {recentTransfers.length === 0 ? (
            <EmptyState title={t('common.empty')} icon={<ArrowLeftRight className="h-8 w-8" />} />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentTransfers.map((tx) => {
                const from = tx.from_warehouse_id ? warehouseMap.get(tx.from_warehouse_id) : undefined
                const to = warehouseMap.get(tx.warehouse_id)
                return (
                  <li key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {from ? pickName(from, lang) : tx.from_warehouse_id}
                      </span>
                      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                        {to ? pickName(to, lang) : tx.warehouse_id}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-400">{formatDate(tx.date, lang)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
