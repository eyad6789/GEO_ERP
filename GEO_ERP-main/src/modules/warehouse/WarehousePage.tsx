import { useMemo, useState } from 'react'
import { Warehouse as WarehouseIcon, Boxes, AlertTriangle, Building2, PackageX, Package, ArrowLeftRight, BarChart3 } from 'lucide-react'
import { PageHeader, KpiCard } from '../../components/shared'
import { Tabs } from '../../components/ui'
import { useApi, useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber } from '../../lib/format'
import type { Warehouse } from '../../types'
import { type LowStockRow, type StockSummaryRow } from './helpers'
import { ItemsTab } from './ItemsTab'
import { TransactionsTab } from './TransactionsTab'
import { ReportsTab } from './ReportsTab'

type TabKey = 'items' | 'transactions' | 'reports'

export function WarehousePage() {
  const t = useT()
  const { lang } = useLang()
  const [tab, setTab] = useState<TabKey>('items')

  // Full stock summary (all warehouses) drives the KPI row + items tab.
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useApi<StockSummaryRow[]>(
    '/warehouse/stock-summary',
  )
  const { data: lowStock, refetch: refetchLow } = useApi<LowStockRow[]>('/warehouse/low-stock')
  const { data: warehouses } = useResource<Warehouse>('warehouses')

  const rows = useMemo(() => summary ?? [], [summary])
  const mainCount = useMemo(() => warehouses.filter((w) => w.type === 'MAIN').length, [warehouses])
  const projectCount = useMemo(() => warehouses.filter((w) => w.type === 'PROJECT').length, [warehouses])

  const outOfStockCount = useMemo(
    () => rows.filter((r) => r.stock_status === 'OUT').length,
    [rows],
  )
  const lowCount = lowStock?.length ?? 0

  const refetchAll = () => {
    refetchSummary()
    refetchLow()
  }

  const tabs = [
    { key: 'items', label: t('warehouse.tab.items'), icon: <Package className="h-4 w-4" /> },
    { key: 'transactions', label: t('warehouse.tab.transactions'), icon: <ArrowLeftRight className="h-4 w-4" /> },
    { key: 'reports', label: t('warehouse.tab.reports'), icon: <BarChart3 className="h-4 w-4" /> },
  ]

  return (
    <div>
      <PageHeader
        title={t('warehouse.title')}
        subtitle={t('warehouse.subtitle')}
        icon={<WarehouseIcon className="h-6 w-6" />}
      />

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('warehouse.kpi.items')}
          value={formatNumber(rows.length, lang)}
          hint={t('warehouse.kpi.items_hint')}
          icon={<Boxes className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('warehouse.kpi.low_stock')}
          value={formatNumber(lowCount, lang)}
          hint={t('warehouse.kpi.low_stock_hint')}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={lowCount > 0 ? 'warning' : 'success'}
        />
        <KpiCard
          label={t('warehouse.kpi.warehouses')}
          value={formatNumber(warehouses.length, lang)}
          hint={`${formatNumber(mainCount, lang)} ${t('warehouse.wh_type.MAIN')} · ${formatNumber(projectCount, lang)} ${t('warehouse.wh_type.PROJECT')}`}
          icon={<Building2 className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('warehouse.kpi.out_of_stock')}
          value={formatNumber(outOfStockCount, lang)}
          hint={t('warehouse.kpi.out_of_stock_hint')}
          icon={<PackageX className="h-5 w-5" />}
          accent={outOfStockCount > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        variant="underline"
        className="mb-5"
      />

      {tab === 'items' && (
        <ItemsTab rows={rows} loading={summaryLoading} onChanged={refetchAll} />
      )}
      {tab === 'transactions' && <TransactionsTab rows={rows} onChanged={refetchAll} />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  )
}
