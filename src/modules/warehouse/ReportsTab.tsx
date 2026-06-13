import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { AlertTriangle, Boxes, Layers, Wallet, Warehouse as WarehouseIcon } from 'lucide-react'
import { Card, CardHeader, CardBody, Badge, Select, LoadingState } from '../../components/ui'
import { ChartCard, EmptyState, KpiCard, CHART_COLORS } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatCompact, formatNumber, pickName } from '../../lib/format'
import { WAREHOUSE_IDS, type LowStockRow, type StockSummaryRow } from './helpers'

export function ReportsTab() {
  const t = useT()
  const { lang } = useLang()
  const [warehouseId, setWarehouseId] = useState<string>('')

  const { data: summary, loading } = useApi<StockSummaryRow[]>(
    '/warehouse/stock-summary',
    warehouseId ? { warehouse_id: warehouseId } : undefined,
  )
  const { data: lowStock } = useApi<LowStockRow[]>('/warehouse/low-stock')

  const rows = summary ?? []

  const totals = useMemo(() => {
    let qty = 0
    let value = 0
    for (const r of rows) {
      qty += r.quantity || 0
      value += (r.quantity || 0) * (r.unit_cost || 0)
    }
    return { count: rows.length, qty, value }
  }, [rows])

  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const cat = r.category || '—'
      m.set(cat, (m.get(cat) ?? 0) + (r.quantity || 0) * (r.unit_cost || 0))
    }
    return Array.from(m.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  const whOptions = [
    { value: '', label: t('warehouse.reports.all') },
    ...WAREHOUSE_IDS.map((id) => ({ value: id, label: t(`warehouse.wh.${id}`) })),
  ]

  const low = lowStock ?? []

  return (
    <div className="space-y-6">
      {/* Warehouse selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
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
          label={t('warehouse.reports.total_value')}
          value={formatCurrency(totals.value, 'IQD', lang)}
          hint={formatCompact(totals.value, lang)}
          icon={<Wallet className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low-stock alerts */}
        <Card>
          <CardHeader
            title={t('warehouse.reports.low_stock_title')}
            subtitle={`${low.length}`}
            icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          />
          <CardBody className="p-0">
            {low.length === 0 ? (
              <EmptyState title={t('warehouse.reports.low_stock_empty')} icon={<Boxes className="h-8 w-8" />} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {low.map((r) => (
                  <li key={r.item_id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{pickName(r, lang)}</p>
                      <p className="text-xs text-slate-400">
                        <span className="font-mono">{r.code}</span> · {r.category || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        {t('warehouse.reports.current')}:{' '}
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {formatNumber(r.quantity, lang)}
                        </span>
                      </span>
                      <span className="text-slate-400">
                        {t('warehouse.reports.min')}:{' '}
                        <span className="tabular-nums">{formatNumber(r.min_stock, lang)}</span>
                      </span>
                      <Badge color={r.quantity <= 0 ? 'red' : 'amber'} dot>
                        {r.quantity <= 0 ? t('warehouse.stock.OUT') : t('warehouse.stock.LOW')}
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
            <CardHeader title={t('warehouse.reports.by_category')} icon={<Layers className="h-5 w-5" />} />
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
            title={t('warehouse.reports.by_category')}
            subtitle={t('warehouse.reports.total_value')}
            icon={<Layers className="h-5 w-5" />}
            height={300}
          >
            <BarChart data={byCategory} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v), lang)} tick={{ fontSize: 11, fill: '#64748b' }} width={56} />
              <Tooltip
                formatter={(v: number | string) => formatCurrency(Number(v), 'IQD', lang)}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>
        )}
      </div>
    </div>
  )
}
