import { useState } from 'react'
import { Plus, LayoutGrid, Table as TableIcon, Merge } from 'lucide-react'
import { ArabicTable, type Column } from '../../components/shared'
import { Badge, Button, Tabs } from '../../components/ui'
import { useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import {
  STOCK_STATUS_COLOR,
  categoryLabel,
  subCategoryLabel,
  type CategoryDef,
  type DuplicateItem,
  type StockSummaryRow,
} from './helpers'
import { CategoryExplorer } from './CategoryExplorer'
import { ItemDetailDialog } from './ItemDetailDialog'
import { NewItemDialog } from './NewItemDialog'
import { MergeDuplicatesDialog } from './MergeDuplicatesDialog'

type ViewMode = 'cards' | 'table'

export function ItemsTab({
  rows,
  loading,
  onChanged,
}: {
  rows: StockSummaryRow[]
  loading: boolean
  onChanged: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { data: taxonomy } = useApi<CategoryDef[]>('/warehouse/categories')
  const { data: dupGroups, refetch: refetchDupGroups } = useApi<DuplicateItem[][]>('/warehouse/duplicate-candidates')
  const [open, setOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('cards')
  const [detailId, setDetailId] = useState<string | null>(null)

  const mergeGroupCount = dupGroups?.length ?? 0

  const columns: Column<StockSummaryRow>[] = [
    {
      key: 'code',
      header: t('warehouse.col.code'),
      sortable: true,
      width: '110px',
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-500">{r.code}</span>,
    },
    {
      key: 'name',
      header: t('warehouse.col.name'),
      accessor: (r) => pickName(r, lang),
      sortable: true,
      render: (r) => <span className="font-medium text-slate-800">{pickName(r, lang)}</span>,
    },
    {
      key: 'category',
      header: t('warehouse.col.category'),
      accessor: (r) => categoryLabel(taxonomy, r.category, lang),
      sortable: true,
      render: (r) => <span className="text-slate-500">{categoryLabel(taxonomy, r.category, lang)}</span>,
    },
    {
      key: 'sub_category',
      header: t('warehouse.col.sub_category'),
      accessor: (r) => subCategoryLabel(taxonomy, r.sub_category, lang),
      sortable: true,
      render: (r) => (
        <span className="text-slate-500">{subCategoryLabel(taxonomy, r.sub_category, lang) || '—'}</span>
      ),
    },
    {
      key: 'size',
      header: t('warehouse.col.size'),
      accessor: (r) => r.size_label,
      render: (r) => (r.size_label ? <span dir="ltr" className="text-slate-600">{r.size_label}</span> : '—'),
    },
    {
      key: 'spec',
      header: t('warehouse.col.spec'),
      accessor: (r) => r.spec,
      sortable: true,
      render: (r) => <span className="text-slate-500">{r.spec || '—'}</span>,
    },
    { key: 'uom', header: t('warehouse.col.uom'), align: 'center' },
    {
      key: 'quantity',
      header: t('warehouse.col.quantity'),
      accessor: (r) => r.quantity,
      sortable: true,
      align: 'end',
      render: (r) => <span className="font-semibold tabular-nums">{formatNumber(r.quantity, lang)}</span>,
    },
    {
      key: 'stock_status',
      header: t('warehouse.col.stock_status'),
      accessor: (r) => r.stock_status,
      align: 'center',
      render: (r) => (
        <Badge color={STOCK_STATUS_COLOR[r.stock_status]} dot>
          {t(`warehouse.stock.${r.stock_status}`)}
        </Badge>
      ),
    },
  ]

  const viewTabs = [
    { key: 'cards', label: t('warehouse.view.cards'), icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'table', label: t('warehouse.view.table'), icon: <TableIcon className="h-4 w-4" /> },
  ]

  const toolbarButtons = (
    <div className="flex items-center gap-2">
      {mergeGroupCount > 0 && (
        <Button size="sm" variant="outline" onClick={() => setMergeOpen(true)}>
          <Merge className="h-4 w-4" />
          {t('warehouse.merge.button')} ({formatNumber(mergeGroupCount, lang)})
        </Button>
      )}
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t('warehouse.items.new')}
      </Button>
    </div>
  )

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Tabs tabs={viewTabs} value={view} onChange={(k) => setView(k as ViewMode)} variant="pills" />
        {view === 'cards' && toolbarButtons}
      </div>

      {view === 'cards' ? (
        <CategoryExplorer rows={rows} onOpenItem={setDetailId} />
      ) : (
        <ArabicTable<StockSummaryRow>
          columns={columns}
          data={rows}
          loading={loading}
          rowKey={(r) => r.item_id}
          onRowClick={(r) => setDetailId(r.item_id)}
          searchPlaceholder={t('warehouse.items.search')}
          exportName="warehouse-items"
          emptyTitle={t('warehouse.items.empty')}
          emptyHint={t('warehouse.items.empty_hint')}
          toolbar={toolbarButtons}
        />
      )}

      <ItemDetailDialog itemId={detailId} onClose={() => setDetailId(null)} />

      <NewItemDialog open={open} onClose={() => setOpen(false)} onCreated={onChanged} rows={rows} />

      <MergeDuplicatesDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMerged={() => {
          onChanged()
          refetchDupGroups()
        }}
      />
    </>
  )
}
