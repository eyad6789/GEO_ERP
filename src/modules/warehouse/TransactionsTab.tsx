import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ArabicTable, type Column } from '../../components/shared'
import { Badge, Button } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate } from '../../lib/format'
import type { InventoryTransaction } from '../../types'
import { TXN_TYPE_COLOR } from './helpers'
import { NewTxnDialog } from './NewTxnDialog'
import { TxnDetailDialog } from './TxnDetailDialog'

export function TransactionsTab({ onChanged }: { onChanged: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const { data, loading, refetch } = useResource<InventoryTransaction>(
    'inventory_transactions',
    companyId ? { company_id: companyId } : undefined,
  )

  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<InventoryTransaction | null>(null)

  const columns: Column<InventoryTransaction>[] = [
    {
      key: 'serial_number',
      header: t('warehouse.txn.serial'),
      sortable: true,
      width: '130px',
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-500">{r.serial_number}</span>,
    },
    {
      key: 'doc_number',
      header: t('warehouse.txn.doc'),
      render: (r) => <span className="text-slate-600">{r.doc_number || '—'}</span>,
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
      render: (r) => <span className="text-slate-700">{t(`warehouse.wh.${r.warehouse_id}`) || r.warehouse_id}</span>,
    },
    {
      key: 'total_value',
      header: t('warehouse.txn.total_value'),
      accessor: (r) => r.total_value,
      sortable: true,
      align: 'end',
      render: (r) => (
        <span className="font-semibold tabular-nums text-slate-800">
          {formatCurrency(r.total_value, r.currency, lang)}
        </span>
      ),
    },
  ]

  return (
    <>
      <ArabicTable<InventoryTransaction>
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelected(r)}
        searchPlaceholder={t('warehouse.txn.search')}
        exportName="warehouse-transactions"
        emptyTitle={t('warehouse.txn.empty')}
        emptyHint={t('warehouse.txn.empty_hint')}
        toolbar={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" />
            {t('warehouse.txn.new')}
          </Button>
        }
      />

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
