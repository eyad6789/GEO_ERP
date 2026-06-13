import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ArabicTable, FormDialog, type Column, type FormFieldConfig } from '../../components/shared'
import { Badge, Button } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatNumber, pickName } from '../../lib/format'
import type { Item } from '../../types'
import { STOCK_STATUS_COLOR, type StockSummaryRow } from './helpers'

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
  const { create } = useResource<Item>('items')
  const [open, setOpen] = useState(false)

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
      sortable: true,
      render: (r) => <span className="text-slate-500">{r.category || '—'}</span>,
    },
    { key: 'uom', header: t('warehouse.col.uom'), align: 'center' },
    {
      key: 'unit_cost',
      header: t('warehouse.col.unit_cost'),
      accessor: (r) => r.unit_cost,
      sortable: true,
      align: 'end',
      render: (r) => <span className="tabular-nums">{formatCurrency(r.unit_cost, 'IQD', lang)}</span>,
    },
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

  const fields: FormFieldConfig[] = [
    { name: 'name_ar', label: t('warehouse.field.name_ar'), required: true, dir: 'rtl' },
    { name: 'name_en', label: t('warehouse.field.name_en'), required: true, dir: 'ltr' },
    { name: 'code', label: t('warehouse.field.code'), required: true },
    { name: 'category', label: t('warehouse.field.category'), required: true },
    { name: 'uom', label: t('warehouse.field.uom'), required: true, placeholder: 'kg / m / pcs' },
    { name: 'shelf_location', label: t('warehouse.field.shelf_location'), placeholder: 'A-12' },
    { name: 'min_stock', label: t('warehouse.field.min_stock'), type: 'number' },
    { name: 'max_stock', label: t('warehouse.field.max_stock'), type: 'number' },
    { name: 'unit_cost', label: t('warehouse.field.unit_cost'), type: 'number' },
  ]

  return (
    <>
      <ArabicTable<StockSummaryRow>
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.item_id}
        searchPlaceholder={t('warehouse.items.search')}
        exportName="warehouse-items"
        emptyTitle={t('warehouse.items.empty')}
        emptyHint={t('warehouse.items.empty_hint')}
        toolbar={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('warehouse.items.new')}
          </Button>
        }
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('warehouse.items.new')}
        fields={fields}
        submitLabel={t('common.save')}
        onSubmit={async (values) => {
          await create({
            name_ar: String(values.name_ar),
            name_en: String(values.name_en),
            code: String(values.code),
            category: String(values.category),
            uom: String(values.uom),
            shelf_location: String(values.shelf_location ?? ''),
            min_stock: Number(values.min_stock) || 0,
            max_stock: Number(values.max_stock) || 0,
            unit_cost: Number(values.unit_cost) || 0,
            currency: 'IQD',
          })
          onChanged()
        }}
      />
    </>
  )
}
