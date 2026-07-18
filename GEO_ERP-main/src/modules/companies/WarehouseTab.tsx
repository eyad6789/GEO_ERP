import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { ArabicTable, type Column } from '../../components/shared'
import { Badge } from '../../components/ui'
import { formatCurrency, formatDate } from '../../lib/format'
import type { InventoryTransaction, InventoryTxnType } from '../../types'

const WAREHOUSE_NAMES: Record<string, string> = {
  'WH-01': 'مستودع أبو غريب',
  'WH-02': 'مستودع الدورة',
}

const TXN_COLOR: Record<InventoryTxnType, 'green' | 'red' | 'sky' | 'amber' | 'gray'> = {
  IN: 'green',
  OUT: 'red',
  TRANSFER: 'sky',
  RETURN: 'amber',
  ADJUST: 'gray',
}

export function WarehouseTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<InventoryTransaction>('inventory_transactions', { company_id: companyId })

  const columns: Column<InventoryTransaction>[] = [
    {
      key: 'serial_number',
      header: t('companies.wh.serial'),
      sortable: true,
      width: '120px',
      render: (x) => <span className="font-mono text-xs text-slate-500">{x.serial_number}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      accessor: (x) => x.date,
      sortable: true,
      render: (x) => formatDate(x.date, lang),
    },
    {
      key: 'type',
      header: t('companies.wh.type'),
      accessor: (x) => x.type,
      align: 'center',
      render: (x) => <Badge color={TXN_COLOR[x.type] ?? 'gray'} dot>{t(`companies.txn.${x.type}`)}</Badge>,
    },
    {
      key: 'warehouse_id',
      header: t('companies.wh.warehouse'),
      accessor: (x) => WAREHOUSE_NAMES[x.warehouse_id] ?? x.warehouse_id,
      render: (x) => WAREHOUSE_NAMES[x.warehouse_id] ?? x.warehouse_id,
    },
    {
      key: 'doc_number',
      header: t('companies.wh.doc'),
      accessor: (x) => x.doc_number,
      render: (x) => <span className="font-mono text-xs text-slate-500">{x.doc_number}</span>,
    },
    {
      key: 'total_value',
      header: t('companies.wh.value'),
      accessor: (x) => x.total_value,
      sortable: true,
      align: 'end',
      render: (x) => (
        <span className="font-semibold tabular-nums text-slate-700">
          {formatCurrency(x.total_value, x.currency, lang)}
        </span>
      ),
    },
  ]

  return (
    <ArabicTable<InventoryTransaction>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(x) => x.id}
      searchPlaceholder={t('common.search')}
      exportName={`inventory-${companyName}`}
      emptyTitle={t('companies.wh.empty')}
      emptyHint={t('companies.wh.empty_hint')}
    />
  )
}
