import { useMemo } from 'react'
import { Warehouse as WarehouseIcon } from 'lucide-react'
import { ArabicTable, type Column } from '../../../components/shared/ArabicTable'
import { Badge } from '../../../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatCurrency, formatDate, pickName } from '../../../lib/format'
import type { InventoryTransaction, Warehouse } from '../../../types'

const TYPE_COLOR: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'gray'> = {
  IN: 'green',
  OUT: 'red',
  TRANSFER: 'blue',
  RETURN: 'amber',
  ADJUST: 'gray',
}

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  IN: { ar: 'إدخال', en: 'In' },
  OUT: { ar: 'إخراج', en: 'Out' },
  TRANSFER: { ar: 'تحويل', en: 'Transfer' },
  RETURN: { ar: 'إرجاع', en: 'Return' },
  ADJUST: { ar: 'تسوية', en: 'Adjust' },
}

export function WarehouseTab({ projectId }: { projectId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: txns, loading } = useResource<InventoryTransaction>('inventory_transactions', { project_id: projectId })
  const { data: warehouses } = useResource<Warehouse>('warehouses')

  const warehouseById = useMemo(() => {
    const m = new Map<string, Warehouse>()
    warehouses.forEach((w) => m.set(w.id, w))
    return m
  }, [warehouses])

  const columns: Column<InventoryTransaction>[] = [
    { key: 'serial_number', header: t('projects.exp.serial'), sortable: true, width: '120px', render: (x) => <span className="font-mono text-xs text-slate-500">{x.serial_number}</span> },
    { key: 'doc_number', header: t('projects.exp.doc'), render: (x) => <span className="font-mono text-xs text-slate-500">{x.doc_number}</span> },
    { key: 'date', header: t('common.date'), accessor: (x) => x.date, sortable: true, render: (x) => formatDate(x.date, lang) },
    {
      key: 'type',
      header: t('projects.wh.type'),
      accessor: (x) => x.type,
      render: (x) => <Badge color={TYPE_COLOR[x.type] ?? 'gray'}>{TYPE_LABEL[x.type]?.[lang] ?? x.type}</Badge>,
    },
    { key: 'warehouse', header: t('projects.wh.warehouse'), accessor: (x) => pickName(warehouseById.get(x.warehouse_id), lang), render: (x) => pickName(warehouseById.get(x.warehouse_id), lang) },
    { key: 'total_value', header: t('projects.wh.value'), accessor: (x) => x.total_value, sortable: true, align: 'end', render: (x) => <span className="font-semibold tabular-nums text-slate-700">{formatCurrency(x.total_value, x.currency, lang)}</span> },
    { key: 'notes', header: t('common.notes'), render: (x) => <span className="text-slate-500">{x.notes || '—'}</span> },
  ]

  const totalValue = useMemo(() => txns.reduce((s, x) => s + (x.total_value || 0), 0), [txns])

  return (
    <Card>
      <CardHeader
        title={t('projects.wh.title')}
        icon={<WarehouseIcon className="h-4 w-4" />}
        subtitle={`${txns.length} ${t('common.count')} · ${formatCurrency(totalValue, 'IQD', lang)}`}
      />
      <CardBody className="p-0">
        <ArabicTable
          columns={columns}
          data={txns}
          loading={loading}
          rowKey={(x) => x.id}
          searchPlaceholder={t('common.search')}
          exportName={`project-${projectId}-inventory`}
          emptyTitle={t('projects.wh.empty')}
        />
      </CardBody>
    </Card>
  )
}
