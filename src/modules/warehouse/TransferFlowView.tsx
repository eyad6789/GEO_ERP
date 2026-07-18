// PARKED (2026-07-11): removed from the الحركات tab per user feedback — at this
// data scale (5 warehouses, ~7 routes) the topology map confused more than it
// explained. Replaced by the ActivityFeed. Kept unwired in case the group grows
// to enough sites/routes for a traffic map to earn its place; rewire via
// TransactionsTab or delete after a few months unmissed.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftRight, MapPin, PackageOpen, Truck, Warehouse as WarehouseIcon } from 'lucide-react'
import { Badge, Card, CardBody, CardHeader, LoadingState } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { InventoryTransaction, InventoryTxnType, Warehouse } from '../../types'
import { TXN_TYPE_COLOR, shortWarehouseName, sortWarehouses, type TransferFlowRow } from './helpers'

// Deterministic geometry for the node map — see the "Layout" note near the bottom.
const ROW_H = 96 // px per node row (source/destination column slot)
const COL_W = 224 // px — matches Tailwind's w-56 node column width

const EXTERNAL_IN = 'EXTERNAL_IN'
const EXTERNAL_OUT = 'EXTERNAL_OUT'

type FlowType = 'TRANSFER' | 'IN' | 'OUT'

const EDGE_COLOR: Record<FlowType, string> = {
  TRANSFER: '#2563eb',
  IN: '#16a34a',
  OUT: '#dc2626',
}
const EDGE_TINT: Record<FlowType, string> = {
  TRANSFER: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30',
  IN: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30',
  OUT: 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/30',
}

interface FlowNode {
  id: string
  external: boolean
  warehouse: Warehouse | null
  sent: number
  received: number
}

function isFlowRow(f: TransferFlowRow): f is TransferFlowRow & { type: FlowType } {
  return f.type === 'TRANSFER' || f.type === 'IN' || f.type === 'OUT'
}

/** Source-side node id: the real warehouse, or the external-supply pseudo-node for IN.
 * OUT rows carry no from_warehouse_id — the goods leave warehouse_id itself. */
function edgeFromId(row: TransferFlowRow & { type: FlowType }): string {
  if (row.type === 'IN') return EXTERNAL_IN
  if (row.type === 'OUT') return row.warehouse_id
  return row.from_warehouse_id as string
}
/** Destination-side node id: the real warehouse, or the external-issue pseudo-node for OUT. */
function edgeToId(row: TransferFlowRow & { type: FlowType }): string {
  return row.type === 'OUT' ? EXTERNAL_OUT : row.warehouse_id
}
function edgeKey(row: TransferFlowRow): string {
  return `${row.type}|${row.from_warehouse_id ?? '-'}|${row.warehouse_id}`
}

export function TransferFlowView({
  flows,
  flowsLoading,
  transactions,
  warehouses,
  onOpenTxn,
}: {
  flows: TransferFlowRow[]
  flowsLoading: boolean
  transactions: InventoryTransaction[]
  warehouses: Warehouse[]
  onOpenTxn: (txn: InventoryTransaction) => void
}) {
  const t = useT()
  const { lang, dir } = useLang()

  // Measure the map's rendered width so the SVG curves land exactly on the node
  // columns' inner edges — re-measured on resize (ResizeObserver).
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(el.getBoundingClientRect().width)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses])
  const whLabel = (id: string | null) => {
    if (!id) return '—'
    const w = warehouseMap.get(id)
    return w ? shortWarehouseName(pickName(w, lang)) : id
  }

  // Only TRANSFER/IN/OUT describe a two-node route; RETURN/ADJUST have no
  // meaningful "other side" for the map.
  const relevantFlows = useMemo(() => flows.filter(isFlowRow), [flows])

  const { sourceNodes, destNodes } = useMemo(() => {
    const sourceIds = new Set<string>()
    const destIds = new Set<string>()
    let hasExternalIn = false
    let hasExternalOut = false
    const sent = new Map<string, number>()
    const received = new Map<string, number>()

    for (const f of relevantFlows) {
      const fromId = edgeFromId(f)
      const toId = edgeToId(f)
      sent.set(fromId, (sent.get(fromId) ?? 0) + f.txn_count)
      received.set(toId, (received.get(toId) ?? 0) + f.txn_count)
      if (f.type === 'TRANSFER') {
        sourceIds.add(fromId)
        destIds.add(toId)
      } else if (f.type === 'IN') {
        hasExternalIn = true
        destIds.add(toId)
      } else {
        sourceIds.add(fromId)
        hasExternalOut = true
      }
    }

    const buildList = (ids: Set<string>): FlowNode[] =>
      sortWarehouses([...ids].map((id) => warehouseMap.get(id)).filter((w): w is Warehouse => !!w)).map((w) => ({
        id: w.id,
        external: false,
        warehouse: w,
        sent: sent.get(w.id) ?? 0,
        received: received.get(w.id) ?? 0,
      }))

    const sourceList = buildList(sourceIds)
    if (hasExternalIn) {
      sourceList.push({ id: EXTERNAL_IN, external: true, warehouse: null, sent: sent.get(EXTERNAL_IN) ?? 0, received: 0 })
    }
    const destList = buildList(destIds)
    if (hasExternalOut) {
      destList.push({ id: EXTERNAL_OUT, external: true, warehouse: null, sent: 0, received: received.get(EXTERNAL_OUT) ?? 0 })
    }

    return { sourceNodes: sourceList, destNodes: destList }
  }, [relevantFlows, warehouseMap])

  const sourceIndex = useMemo(() => new Map(sourceNodes.map((n, i) => [n.id, i])), [sourceNodes])
  const destIndex = useMemo(() => new Map(destNodes.map((n, i) => [n.id, i])), [destNodes])

  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<TransferFlowRow | null>(null)

  const routeTxns = useMemo(() => {
    if (!selectedRow) return []
    return transactions
      .filter(
        (tx) =>
          tx.type === selectedRow.type &&
          (tx.from_warehouse_id ?? null) === (selectedRow.from_warehouse_id ?? null) &&
          tx.warehouse_id === selectedRow.warehouse_id,
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [selectedRow, transactions])

  if (flowsLoading) return <LoadingState label={t('common.loading')} />
  if (relevantFlows.length === 0) {
    return <EmptyState title={t('warehouse.txn.empty')} hint={t('warehouse.txn.empty_hint')} />
  }

  const containerHeight = Math.max(1, sourceNodes.length, destNodes.length) * ROW_H
  // In RTL the source column sits on the right (inline-start), so its facing
  // edge is at (width - COL_W); destinations face it from the left. Mirrored in LTR.
  const sourceInnerX = dir === 'rtl' ? width - COL_W : COL_W
  const destInnerX = dir === 'rtl' ? COL_W : width - COL_W

  return (
    <div className="space-y-5">
      <Card className="overflow-x-auto p-5">
        <div ref={containerRef} className="relative min-w-[680px]" style={{ height: containerHeight }}>
          {width > 0 && (
            <>
              {/* Edges */}
              <svg className="absolute inset-0 h-full w-full">
                {relevantFlows.map((f) => {
                  const si = sourceIndex.get(edgeFromId(f))
                  const di = destIndex.get(edgeToId(f))
                  if (si === undefined || di === undefined) return null
                  const y1 = si * ROW_H + ROW_H / 2
                  const y2 = di * ROW_H + ROW_H / 2
                  const midX = (sourceInnerX + destInnerX) / 2
                  const path = `M ${sourceInnerX} ${y1} C ${midX} ${y1} ${midX} ${y2} ${destInnerX} ${y2}`
                  const key = edgeKey(f)
                  const isSelected = selectedRow ? edgeKey(selectedRow) === key : false
                  const isHovered = hoveredKey === key
                  const strokeWidth = 2 + Math.min(6, f.txn_count / 4) + (isSelected ? 1.5 : 0)
                  const opacity = isSelected ? 1 : isHovered ? 0.9 : 0.45
                  return (
                    <g key={key}>
                      <path
                        d={path}
                        fill="none"
                        stroke={EDGE_COLOR[f.type]}
                        strokeWidth={strokeWidth}
                        strokeOpacity={opacity}
                        strokeLinecap="round"
                      />
                      {/* wide invisible hit area */}
                      <path
                        d={path}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={14}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
                        onClick={() => setSelectedRow(f)}
                      />
                    </g>
                  )
                })}
              </svg>

              {/* Movement-count pills at each curve's midpoint */}
              <div className="pointer-events-none absolute inset-0">
                {relevantFlows.map((f) => {
                  const si = sourceIndex.get(edgeFromId(f))
                  const di = destIndex.get(edgeToId(f))
                  if (si === undefined || di === undefined) return null
                  const y1 = si * ROW_H + ROW_H / 2
                  const y2 = di * ROW_H + ROW_H / 2
                  const midX = (sourceInnerX + destInnerX) / 2
                  const midY = (y1 + y2) / 2
                  const key = edgeKey(f)
                  const isSelected = selectedRow ? edgeKey(selectedRow) === key : false
                  const isHovered = hoveredKey === key
                  const expanded = isSelected || isHovered
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedRow(f)}
                      onMouseEnter={() => setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
                      className={cn(
                        'pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset transition',
                        EDGE_TINT[f.type],
                        isSelected && 'ring-2 shadow-sm',
                      )}
                      style={{ left: midX, top: midY }}
                    >
                      {formatNumber(f.txn_count, lang)}
                      {expanded ? ` ${t('warehouse.flow.movements')}` : ''}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Source column */}
          <div className="absolute start-0 top-0" style={{ width: COL_W }}>
            {sourceNodes.map((n, i) => (
              <NodeCard key={n.id} node={n} index={i} />
            ))}
          </div>

          {/* Destination column */}
          <div className="absolute end-0 top-0" style={{ width: COL_W }}>
            {destNodes.map((n, i) => (
              <NodeCard key={n.id} node={n} index={i} />
            ))}
          </div>
        </div>
      </Card>

      {/* Route panel */}
      {!selectedRow ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-8 text-sm text-slate-400 dark:text-slate-400">
          {t('warehouse.flow.pick_route')}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selectedRow.type === 'IN'
                  ? t('warehouse.flow.external_in')
                  : whLabel(selectedRow.type === 'OUT' ? selectedRow.warehouse_id : selectedRow.from_warehouse_id)}
              </span>
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selectedRow.type === 'OUT' ? t('warehouse.flow.external_out') : whLabel(selectedRow.warehouse_id)}
              </span>
              <Badge color={TXN_TYPE_COLOR[selectedRow.type]} dot>
                {t(`warehouse.type.${selectedRow.type}`)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatNumber(selectedRow.txn_count, lang)}</span>{' '}
                {t('warehouse.flow.movements')}
              </span>
              <span>
                {t('warehouse.flow.qty_total')}:{' '}
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatNumber(selectedRow.total_qty, lang)}</span>
              </span>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader
              title={t('warehouse.flow.route_title')}
              subtitle={String(routeTxns.length)}
              icon={<ArrowLeftRight className="h-5 w-5" />}
            />
            <CardBody className="p-0">
              {routeTxns.length === 0 ? (
                <EmptyState title={t('warehouse.txn.empty')} icon={<ArrowLeftRight className="h-8 w-8" />} />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {routeTxns.map((tx) => (
                    <li key={tx.id}>
                      <button
                        onClick={() => onOpenTxn(tx)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-start transition hover:bg-primary/5"
                      >
                        <span className="w-28 shrink-0 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{tx.serial_number}</span>
                        <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{formatDate(tx.date, lang)}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-400 dark:text-slate-400">{tx.notes || '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Node card — icon tile + warehouse name + sent/received stats. Absolutely
// positioned at a deterministic ROW_H slot; the SVG edges connect to the
// vertical center of that same slot (index * ROW_H + ROW_H / 2).
// ---------------------------------------------------------------------------
function NodeCard({ node, index }: { node: FlowNode; index: number }) {
  const t = useT()
  const { lang } = useLang()
  const isProject = node.warehouse?.type === 'PROJECT'
  const isExternalIn = node.id === EXTERNAL_IN
  const Icon = node.external ? (isExternalIn ? Truck : PackageOpen) : isProject ? MapPin : WarehouseIcon
  const name = node.external
    ? t(isExternalIn ? 'warehouse.flow.external_in' : 'warehouse.flow.external_out')
    : shortWarehouseName(pickName(node.warehouse!, lang))
  const tileClass = node.external
    ? 'border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-400'
    : isProject
      ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'

  return (
    <div className="absolute inset-x-0" style={{ top: index * ROW_H, height: ROW_H }}>
      <div className="flex h-full items-center">
        <div className={cn('card flex w-full items-center gap-2.5 p-3', node.external && 'border-dashed')}>
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tileClass)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-400 tabular-nums">
              {t('warehouse.flow.sent')} {formatNumber(node.sent, lang)} · {t('warehouse.flow.received')}{' '}
              {formatNumber(node.received, lang)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
