import { useMemo, useState } from 'react'
import { ArrowLeftRight, Activity, HandCoins, PackageSearch, Plus, Table as TableIcon } from 'lucide-react'
import { ArabicTable, type Column } from '../../components/shared'
import { Badge, Button, SearchSelect, Tabs } from '../../components/ui'
import { useResource, useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatDate, pickName } from '../../lib/format'
import type { InventoryTransaction, Warehouse } from '../../types'
import { TXN_TYPE_COLOR, type StockSummaryRow } from './helpers'
import { NewTxnDialog } from './NewTxnDialog'
import { TxnDetailDialog } from './TxnDetailDialog'
import { ItemJourney } from './ItemJourney'
import { ActivityFeed } from './ActivityFeed'
import { CustodyBoard } from './CustodyBoard'

type ViewMode = 'track' | 'activity' | 'custody' | 'table'

interface MovementLinesSummary {
  transaction_id: string
  items_text: string
  total_qty: number
}

// Enriched row used only by the table view's Excel export: adds the line-item
// summary the base `inventory_transactions` fetch doesn't carry.
type ExportTxn = InventoryTransaction & { items_text: string; total_qty: number }

export function TransactionsTab({ rows, onChanged }: { rows: StockSummaryRow[]; onChanged: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const { data, loading, refetch } = useResource<InventoryTransaction>(
    'inventory_transactions',
    companyId ? { company_id: companyId } : undefined,
  )
  const { data: warehouses } = useResource<Warehouse>('warehouses')
  const { data: lineSummary } = useApi<MovementLinesSummary[]>('/warehouse/movement-lines-summary')
  const [view, setView] = useState<ViewMode>('track')
  const [trackedItemId, setTrackedItemId] = useState<string>('')

  const itemOptions = useMemo(
    () =>
      [...rows]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((r) => ({
          value: r.item_id,
          label: `${r.code} — ${pickName({ name_ar: r.name_ar, name_en: r.name_en }, lang)}${
            r.size_label || r.spec ? ` (${r.size_label || r.spec})` : ''
          }`,
        })),
    [rows, lang],
  )
  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>()
    for (const w of warehouses) m.set(w.id, w)
    return m
  }, [warehouses])
  const whLabel = (id: string) => {
    const w = warehouseMap.get(id)
    return w ? pickName(w, lang) : id
  }
  // "From"/"To" resolution for the export: IN/RETURN arrive from outside the
  // group, OUT leaves to consumption, TRANSFER/ADJUST stay warehouse-to-warehouse.
  const fromWarehouseText = (r: InventoryTransaction) => {
    if (r.type === 'TRANSFER') return r.from_warehouse_id ? whLabel(r.from_warehouse_id) : '—'
    if (r.type === 'IN' || r.type === 'RETURN') return lang === 'ar' ? 'توريد خارجي' : 'External Supply'
    return whLabel(r.warehouse_id)
  }
  const toWarehouseText = (r: InventoryTransaction) =>
    r.type === 'OUT' ? (lang === 'ar' ? 'صرف / استهلاك' : 'Issued / Consumed') : whLabel(r.warehouse_id)

  const lineSummaryMap = useMemo(() => {
    const m = new Map<string, MovementLinesSummary>()
    for (const s of lineSummary ?? []) m.set(s.transaction_id, s)
    return m
  }, [lineSummary])

  const exportRows: ExportTxn[] = useMemo(
    () =>
      data.map((r) => ({
        ...r,
        items_text: lineSummaryMap.get(r.id)?.items_text ?? '',
        total_qty: lineSummaryMap.get(r.id)?.total_qty ?? 0,
      })),
    [data, lineSummaryMap],
  )

  const exportColumns: Column<ExportTxn>[] = [
    { key: 'serial_number', header: t('warehouse.txn.serial'), accessor: (r) => r.serial_number },
    { key: 'doc_number', header: t('warehouse.txn.doc'), accessor: (r) => r.doc_number || '' },
    { key: 'date', header: t('warehouse.txn.date'), accessor: (r) => formatDate(r.date, lang) },
    { key: 'type', header: t('warehouse.txn.type'), accessor: (r) => t(`warehouse.type.${r.type}`) },
    {
      key: 'from_warehouse',
      header: lang === 'ar' ? 'من مستودع' : 'From Warehouse',
      accessor: fromWarehouseText,
    },
    {
      key: 'to_warehouse',
      header: lang === 'ar' ? 'إلى مستودع' : 'To Warehouse',
      accessor: toWarehouseText,
    },
    { key: 'items_text', header: t('warehouse.txn.items'), accessor: (r) => r.items_text },
    {
      key: 'total_qty',
      header: lang === 'ar' ? 'إجمالي الكمية' : 'Total Quantity',
      accessor: (r) => r.total_qty,
    },
    { key: 'notes', header: t('warehouse.txn.notes'), accessor: (r) => r.notes || '' },
  ]

  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<InventoryTransaction | null>(null)

  const columns: Column<InventoryTransaction>[] = [
    {
      key: 'serial_number',
      header: t('warehouse.txn.serial'),
      sortable: true,
      width: '130px',
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{r.serial_number}</span>,
    },
    {
      key: 'doc_number',
      header: t('warehouse.txn.doc'),
      render: (r) => <span className="text-slate-600 dark:text-slate-300">{r.doc_number || '—'}</span>,
    },
    {
      key: 'date',
      header: t('warehouse.txn.date'),
      accessor: (r) => r.date,
      sortable: true,
      render: (r) => formatDate(r.date, lang),
    },
    {
      key: 'type',
      header: t('warehouse.txn.type'),
      accessor: (r) => r.type,
      align: 'center',
      render: (r) => (
        <Badge color={TXN_TYPE_COLOR[r.type]} dot>
          {t(`warehouse.type.${r.type}`)}
        </Badge>
      ),
    },
    {
      key: 'warehouse_id',
      header: t('warehouse.txn.warehouse'),
      accessor: (r) => r.warehouse_id,
      render: (r) =>
        r.type === 'TRANSFER' && r.from_warehouse_id ? (
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            {whLabel(r.from_warehouse_id)}
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
            {whLabel(r.warehouse_id)}
          </span>
        ) : (
          <span className="text-slate-700 dark:text-slate-200">{whLabel(r.warehouse_id)}</span>
        ),
    },
  ]

  const viewTabs = [
    { key: 'track', label: t('warehouse.view.track'), icon: <PackageSearch className="h-4 w-4" /> },
    { key: 'activity', label: t('warehouse.view.activity'), icon: <Activity className="h-4 w-4" /> },
    { key: 'custody', label: t('warehouse.view.custody'), icon: <HandCoins className="h-4 w-4" /> },
    { key: 'table', label: t('warehouse.view.table'), icon: <TableIcon className="h-4 w-4" /> },
  ]

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Tabs tabs={viewTabs} value={view} onChange={(k) => setView(k as ViewMode)} variant="pills" />
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          {t('warehouse.txn.new')}
        </Button>
      </div>

      {view === 'track' ? (
        trackedItemId ? (
          <div className="space-y-4">
            <div className="max-w-md">
              <SearchSelect
                value={trackedItemId}
                onChange={setTrackedItemId}
                options={itemOptions}
                placeholder={t('warehouse.items.search')}
              />
            </div>
            <ItemJourney itemId={trackedItemId} transactions={data} onOpenTxn={setSelected} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageSearch className="h-8 w-8" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('warehouse.track.prompt')}</h3>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-400">{t('warehouse.track.hint')}</p>
            </div>
            <div className="w-full max-w-xl">
              <SearchSelect
                value=""
                onChange={setTrackedItemId}
                options={itemOptions}
                placeholder={t('warehouse.items.search')}
              />
            </div>
          </div>
        )
      ) : view === 'activity' ? (
        <ActivityFeed transactions={data} warehouses={warehouses} onOpenTxn={setSelected} />
      ) : view === 'custody' ? (
        <CustodyBoard
          onChanged={() => {
            refetch()
            onChanged()
          }}
        />
      ) : (
        <ArabicTable<ExportTxn>
          columns={columns}
          data={exportRows}
          loading={loading}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          searchPlaceholder={t('warehouse.txn.search')}
          exportName="warehouse-transactions"
          exportColumns={exportColumns}
          emptyTitle={t('warehouse.txn.empty')}
          emptyHint={t('warehouse.txn.empty_hint')}
        />
      )}

      <NewTxnDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => {
          refetch()
          onChanged()
        }}
      />

      <TxnDetailDialog txn={selected} onClose={() => setSelected(null)} />
    </>
  )
}
