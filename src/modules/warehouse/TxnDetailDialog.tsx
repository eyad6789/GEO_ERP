import { useMemo } from 'react'
import { Dialog, Badge, Button, LoadingState } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { InventoryLine, InventoryTransaction, Item } from '../../types'
import { TXN_TYPE_COLOR } from './helpers'

export function TxnDetailDialog({
  txn,
  onClose,
}: {
  txn: InventoryTransaction | null
  onClose: () => void
}) {
  const t = useT()
  const { lang } = useLang()

  const { data: lines, loading } = useResource<InventoryLine>(
    'inventory_lines',
    txn ? { transaction_id: txn.id } : undefined,
  )
  const { data: items } = useResource<Item>('items')

  const itemMap = useMemo(() => {
    const m = new Map<string, Item>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  const open = !!txn

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('warehouse.txn.detail_title')}
      description={txn ? `${txn.serial_number} · ${txn.doc_number}` : undefined}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {txn && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Meta label={t('warehouse.txn.type')}>
              <Badge color={TXN_TYPE_COLOR[txn.type]} dot>
                {t(`warehouse.type.${txn.type}`)}
              </Badge>
            </Meta>
            <Meta label={t('warehouse.txn.date')}>{formatDate(txn.date, lang)}</Meta>
            <Meta label={t('warehouse.txn.warehouse')}>{t(`warehouse.wh.${txn.warehouse_id}`) || txn.warehouse_id}</Meta>
            <Meta label={t('warehouse.txn.total_value')}>
              <span className="font-bold text-primary">{formatCurrency(txn.total_value, txn.currency, lang)}</span>
            </Meta>
            {txn.notes && (
              <div className="col-span-2 sm:col-span-4">
                <Meta label={t('warehouse.txn.notes')}>{txn.notes}</Meta>
              </div>
            )}
          </div>

          <h4 className="mb-2 text-sm font-semibold text-slate-700">{t('warehouse.txn.detail_lines')}</h4>
          {loading ? (
            <LoadingState label={t('common.loading')} />
          ) : lines.length === 0 ? (
            <EmptyState title={t('common.empty')} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{t('warehouse.txn.line_item')}</th>
                    <th className="px-3 py-2.5 text-start">{t('warehouse.col.uom')}</th>
                    <th className="px-3 py-2.5 text-end">{t('warehouse.txn.line_qty')}</th>
                    <th className="px-3 py-2.5 text-end">{t('warehouse.txn.line_price')}</th>
                    <th className="px-3 py-2.5 text-end">{t('warehouse.txn.line_total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((ln) => {
                    const it = itemMap.get(ln.item_id)
                    return (
                      <tr key={ln.id} className="text-slate-700">
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{it ? pickName(it, lang) : ln.item_id}</div>
                          {it && <div className="text-xs text-slate-400">{it.code}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{ln.uom || it?.uom || '—'}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">{ln.quantity}</td>
                        <td className="px-3 py-2.5 text-end tabular-nums">
                          {formatCurrency(ln.unit_price, txn.currency, lang)}
                        </td>
                        <td className="px-3 py-2.5 text-end font-medium tabular-nums">
                          {formatCurrency(ln.total, txn.currency, lang)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Dialog>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  )
}
