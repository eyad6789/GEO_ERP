import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, Printer, Share2, PenLine } from 'lucide-react'
import { Dialog, Badge, Button, LoadingState, useToast } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { apiPost } from '../../lib/api'
import { formatCurrency, formatDate, formatNumber, pickName } from '../../lib/format'
import type { InventoryLine, InventoryTransaction, Item, Warehouse } from '../../types'
import { TXN_TYPE_COLOR } from './helpers'
import { printDeliverySlip, buildDeliveryWhatsAppText, type DeliverySlipLine } from './DeliverySlip'

// The live backend now returns a few columns the shared InventoryTransaction
// type doesn't declare (src/types is off-limits to module agents) — widen
// locally rather than editing the global contract.
type TxnFull = InventoryTransaction & {
  received_by?: string | null
  is_loan?: number | boolean
  returned_at?: string | null
  signature_file?: string | null
}

const SIG_CANVAS_W = 480
const SIG_CANVAS_H = 160

export function TxnDetailDialog({
  txn: txnProp,
  onClose,
}: {
  txn: InventoryTransaction | null
  onClose: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const txn = txnProp as TxnFull | null

  const { data: lines, loading } = useResource<InventoryLine>(
    'inventory_lines',
    txn ? { transaction_id: txn.id } : undefined,
  )
  const { data: items } = useResource<Item>('items')
  const { data: warehouses } = useResource<Warehouse>('warehouses')

  const itemMap = useMemo(() => {
    const m = new Map<string, Item>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])
  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>()
    for (const w of warehouses) m.set(w.id, w)
    return m
  }, [warehouses])
  const whLabel = (id: string) => {
    const w = warehouseMap.get(id)
    return w ? pickName(w, lang) : id
  }

  // "From"/"To" resolution mirrors TransactionsTab's export columns: IN/RETURN
  // arrive from outside the group, OUT leaves to consumption, TRANSFER stays
  // warehouse-to-warehouse, ADJUST touches a single warehouse.
  const fromText = !txn
    ? ''
    : txn.type === 'TRANSFER'
      ? txn.from_warehouse_id
        ? whLabel(txn.from_warehouse_id)
        : '—'
      : txn.type === 'IN' || txn.type === 'RETURN'
        ? t('warehouse.flow.external_in')
        : whLabel(txn.warehouse_id)
  const toText = !txn ? '' : txn.type === 'OUT' ? t('warehouse.flow.external_out') : whLabel(txn.warehouse_id)

  const slipLines: DeliverySlipLine[] = lines.map((ln) => {
    const it = itemMap.get(ln.item_id)
    return {
      name: it ? pickName(it, lang) : ln.item_id,
      size: it?.size_label || it?.spec || '',
      quantity: ln.quantity,
      uom: ln.uom || it?.uom || '',
    }
  })

  // ---- Receiver signature (inline pad) ---------------------------------------
  const [sigOpen, setSigOpen] = useState(false)
  const [sigSaving, setSigSaving] = useState(false)
  const [sigUrl, setSigUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)

  // Reset/sync whenever the dialog switches to a different (or no) transaction.
  useEffect(() => {
    setSigUrl(txn?.signature_file ? `/api/warehouse/item-photos/${txn.signature_file}` : null)
    setSigOpen(false)
  }, [txn?.id, txn?.signature_file])

  // Prime the canvas with a white background + pen style whenever the pad opens.
  useEffect(() => {
    if (!sigOpen) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [sigOpen])

  const posFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPtRef.current = posFromEvent(e)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPtRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pt = posFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPtRef.current = pt
  }
  const onPointerUp = () => {
    drawingRef.current = false
    lastPtRef.current = null
  }
  const clearSig = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  const saveSig = async () => {
    const canvas = canvasRef.current
    if (!canvas || !txn) return
    try {
      setSigSaving(true)
      const dataUrl = canvas.toDataURL('image/png')
      const res = await apiPost<{ url: string }>(`/warehouse/txn-signature/${txn.id}`, { data: dataUrl })
      setSigUrl(res.url)
      setSigOpen(false)
      toast.success(t('warehouse.slip.signed'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSigSaving(false)
    }
  }

  // ---- Print / WhatsApp -------------------------------------------------------
  const handlePrint = () => {
    if (!txn) return
    printDeliverySlip({
      lang,
      serial_number: txn.serial_number,
      doc_number: txn.doc_number,
      date: txn.date,
      fromText,
      toText,
      lines: slipLines,
      notes: txn.notes,
      receivedBy: txn.received_by ?? null,
      signatureUrl: sigUrl,
    })
  }
  const handleWhatsApp = () => {
    if (!txn) return
    const text = buildDeliveryWhatsAppText({
      lang,
      serial_number: txn.serial_number,
      date: txn.date,
      fromText,
      toText,
      lines: slipLines,
      notes: txn.notes,
      receivedBy: txn.received_by ?? null,
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const open = !!txn

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('warehouse.txn.detail_title')}
      description={txn ? `${txn.serial_number} · ${txn.doc_number}` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t('warehouse.slip.print')}
          </Button>
          <Button variant="outline" onClick={handleWhatsApp}>
            <Share2 className="h-4 w-4" />
            {t('warehouse.slip.whatsapp')}
          </Button>
          <Button variant="outline" onClick={() => setSigOpen((v) => !v)}>
            <PenLine className="h-4 w-4" />
            {t('warehouse.slip.capture_sign')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </>
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
            <Meta label={t('warehouse.txn.warehouse')}>
              {txn.type === 'TRANSFER' && txn.from_warehouse_id ? (
                <span className="flex items-center gap-1.5">
                  {whLabel(txn.from_warehouse_id)}
                  <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
                  {whLabel(txn.warehouse_id)}
                </span>
              ) : (
                whLabel(txn.warehouse_id)
              )}
            </Meta>
            {txn.total_value > 0 && (
              <Meta label={t('warehouse.txn.total_value')}>
                <span className="font-bold text-primary">{formatCurrency(txn.total_value, txn.currency, lang)}</span>
              </Meta>
            )}
            {txn.received_by && <Meta label={t('warehouse.txn.received_by')}>{txn.received_by}</Meta>}
            {!!txn.is_loan && (
              <Meta label={t('warehouse.view.custody')}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color="amber" dot>
                    {t('warehouse.txn.is_loan')}
                  </Badge>
                  {txn.returned_at && (
                    <Badge color="green" dot>
                      {t('warehouse.custody.returned')}
                    </Badge>
                  )}
                </div>
              </Meta>
            )}
            {txn.notes && (
              <div className="col-span-2 sm:col-span-4">
                <Meta label={t('warehouse.txn.notes')}>{txn.notes}</Meta>
              </div>
            )}
          </div>

          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('warehouse.txn.detail_lines')}</h4>
          {loading ? (
            <LoadingState label={t('common.loading')} />
          ) : lines.length === 0 ? (
            <EmptyState title={t('common.empty')} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{t('warehouse.txn.line_item')}</th>
                    <th className="px-3 py-2.5 text-start">{t('warehouse.col.uom')}</th>
                    <th className="px-3 py-2.5 text-end">{t('warehouse.txn.line_qty')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {lines.map((ln) => {
                    const it = itemMap.get(ln.item_id)
                    return (
                      <tr key={ln.id} className="text-slate-700 dark:text-slate-200">
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{it ? pickName(it, lang) : ln.item_id}</div>
                          {it && <div className="text-xs text-slate-400 dark:text-slate-400">{it.code}</div>}
                          {it?.spec && <div className="text-xs text-slate-400 dark:text-slate-400">{it.spec}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{ln.uom || it?.uom || '—'}</td>
                        <td className="px-3 py-2.5 text-end font-medium tabular-nums">{formatNumber(ln.quantity, lang)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Receiver signature — inline pad opened from the footer button, or the
              already-stored image (with a small re-sign shortcut). */}
          {(sigOpen || sigUrl) && (
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('warehouse.slip.signature')}</h4>
              {sigOpen ? (
                <div className="max-w-md">
                  <canvas
                    ref={canvasRef}
                    width={SIG_CANVAS_W}
                    height={SIG_CANVAS_H}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    style={{ touchAction: 'none', aspectRatio: `${SIG_CANVAS_W} / ${SIG_CANVAS_H}` }}
                  />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-400">{t('warehouse.slip.sign_here')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={clearSig}>
                      {t('warehouse.slip.sign_clear')}
                    </Button>
                    <Button size="sm" onClick={saveSig} disabled={sigSaving}>
                      {t('warehouse.slip.sign_save')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={sigUrl ?? undefined}
                    alt={t('warehouse.slip.receiver')}
                    className="h-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => setSigOpen(true)}>
                    <PenLine className="h-3.5 w-3.5" />
                    {t('warehouse.slip.capture_sign')}
                  </Button>
                </div>
              )}
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
      <p className="text-xs font-medium text-slate-400 dark:text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{children}</div>
    </div>
  )
}
