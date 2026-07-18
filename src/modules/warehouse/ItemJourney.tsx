import { useMemo } from 'react'
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  MapPin,
  PackageOpen,
  PackageX,
  Route,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import { Badge, LoadingState } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { InventoryTransaction, InventoryTxnType, Warehouse } from '../../types'
import {
  categoryLabel,
  subCategoryLabel,
  shortWarehouseName,
  TXN_TYPE_COLOR,
  type CategoryDef,
  type ItemDetailResponse,
  type ItemMoveRow,
} from './helpers'
import { categoryMeta } from './categoryMeta'

// Dot color per movement type on the journey spine — literal Tailwind classes
// (never built dynamically, so Tailwind's purge always sees them).
const MOVE_DOT_COLOR: Record<InventoryTxnType, string> = {
  IN: 'bg-emerald-500',
  OUT: 'bg-red-500',
  TRANSFER: 'bg-blue-500',
  RETURN: 'bg-amber-500',
  ADJUST: 'bg-purple-500',
}

/**
 * "Where is this pipe right now?" — item-centric view: header card, current
 * distribution across warehouses, and a story-like timeline of every move.
 */
export function ItemJourney({
  itemId,
  transactions,
  onOpenTxn,
}: {
  itemId: string
  transactions: InventoryTransaction[]
  onOpenTxn: (txn: InventoryTransaction) => void
}) {
  const t = useT()
  const { lang } = useLang()

  const { data, loading } = useApi<ItemDetailResponse>(`/warehouse/item/${itemId}`)
  const { data: taxonomy } = useApi<CategoryDef[]>('/warehouse/categories')
  const { data: warehouses } = useResource<Warehouse>('warehouses')

  const totalQty = useMemo(() => (data?.stock ?? []).reduce((s, r) => s + (r.quantity || 0), 0), [data])

  if (loading || !data || !data.item) {
    return <LoadingState label={t('common.loading')} />
  }

  const { item, stock, moves } = data
  const meta = categoryMeta(item.category || 'OTHER')
  const Icon = meta.icon
  const lastMove = moves[0]

  return (
    <div className="space-y-6">
      {/* Item header card */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', meta.tile)}>
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">{pickName(item, lang)}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{item.code}</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                  meta.chip,
                )}
              >
                {categoryLabel(taxonomy, item.category, lang)}
                {item.sub_category && (
                  <>
                    <ChevronRight className="h-3 w-3 opacity-50 rtl:rotate-180" />
                    {subCategoryLabel(taxonomy, item.sub_category, lang)}
                  </>
                )}
              </span>
              {item.size_label && (
                <span dir="ltr" className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {item.size_label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-end">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-400">{t('warehouse.track.last_move')}</p>
          {lastMove ? (
            <div className="mt-1.5 flex items-center justify-end gap-2">
              <Badge color={TXN_TYPE_COLOR[lastMove.type]} dot>
                {t(`warehouse.type.${lastMove.type}`)}
              </Badge>
              <span className="text-slate-300">·</span>
              <span className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-300">{formatDate(lastMove.date, lang)}</span>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-400">{t('warehouse.track.no_moves')}</p>
          )}
        </div>
      </div>

      {/* Where is it now */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <MapPin className="h-4 w-4 text-primary" />
          {t('warehouse.track.now_title')}
        </h4>
        {stock.length === 0 ? (
          <div className="card">
            <EmptyState title={t('warehouse.track.no_stock')} icon={<PackageX className="h-7 w-7" />} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {stock.map((s) => {
              const isProject = s.type === 'PROJECT'
              const WIcon = isProject ? MapPin : WarehouseIcon
              return (
                <div key={s.warehouse_id} className="card flex items-center gap-3 p-4">
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      isProject ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                    )}
                  >
                    <WIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                      {shortWarehouseName(pickName({ name_ar: s.name_ar, name_en: s.name_en ?? undefined }, lang))}
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatNumber(s.quantity, lang)}
                      <span className="ms-1 text-xs font-normal text-slate-400 dark:text-slate-400">{item.uom}</span>
                    </p>
                  </div>
                </div>
              )
            })}
            <div className="card flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Boxes className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary/70">{t('warehouse.track.total_now')}</p>
                <p className="text-2xl font-bold tabular-nums text-primary">
                  {formatNumber(totalQty, lang)}
                  <span className="ms-1 text-xs font-normal text-primary/60">{item.uom}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item journey — the story, newest first */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Route className="h-4 w-4 text-primary" />
          {t('warehouse.track.history_title')}
        </h4>
        <div className="card p-5">
          <MovementTimeline moves={moves} warehouses={warehouses} transactions={transactions} onOpenMove={onOpenTxn} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MovementTimeline — shared vertical timeline of item moves, newest first.
// Reused by ItemJourney (full story, click-through to the source transaction)
// and ItemDetailDialog (compact list, read-only — no `transactions`/`onOpenMove`).
// ---------------------------------------------------------------------------
export function MovementTimeline({
  moves,
  warehouses,
  transactions,
  onOpenMove,
  compact = false,
}: {
  moves: ItemMoveRow[]
  warehouses: Warehouse[]
  /** When provided together with onOpenMove, cards with a matching transaction become clickable. */
  transactions?: InventoryTransaction[]
  onOpenMove?: (txn: InventoryTransaction) => void
  compact?: boolean
}) {
  const t = useT()
  const { lang } = useLang()

  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses])
  const txnMap = useMemo(() => new Map((transactions ?? []).map((tx) => [tx.id, tx])), [transactions])
  const whName = (id: string | null) => {
    if (!id) return '—'
    const w = warehouseMap.get(id)
    return w ? shortWarehouseName(pickName(w, lang)) : id
  }

  if (moves.length === 0) {
    return <EmptyState title={t('warehouse.track.no_moves')} icon={<PackageOpen className="h-7 w-7" />} />
  }

  const chip = (label: string) => (
    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
  )

  return (
    <ol className={cn('relative border-s-2 border-slate-200 dark:border-slate-700', compact ? 'ms-3' : 'ms-4')}>
      {moves.map((m) => {
        const txn = txnMap.get(m.id)
        const clickable = Boolean(txn && onOpenMove)

        const route =
          m.type === 'TRANSFER' ? (
            <>
              <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.track.from')}</span>
              {chip(whName(m.from_warehouse_id))}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
              {chip(whName(m.warehouse_id))}
            </>
          ) : m.type === 'IN' ? (
            <>
              <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.flow.external_in')}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
              {chip(whName(m.warehouse_id))}
            </>
          ) : m.type === 'OUT' ? (
            <>
              {chip(whName(m.warehouse_id))}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
              <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.flow.external_out')}</span>
            </>
          ) : (
            chip(whName(m.warehouse_id))
          )

        const body = (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={TXN_TYPE_COLOR[m.type]} dot>
                {t(`warehouse.type.${m.type}`)}
              </Badge>
              <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {formatNumber(m.quantity, lang)}
                <span className="ms-1 text-xs font-normal text-slate-400 dark:text-slate-400">{m.uom}</span>
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5">{route}</p>
            <p className="mt-1.5 truncate text-xs text-slate-400 dark:text-slate-400">
              {formatDate(m.date, lang)}
              {m.notes && <span> · {m.notes}</span>}
            </p>
          </>
        )

        return (
          <li key={m.id} className={cn('relative ps-6', compact ? 'pb-4 last:pb-0' : 'pb-6 last:pb-0')}>
            <span
              className={cn(
                'absolute -start-[7px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-800',
                MOVE_DOT_COLOR[m.type],
              )}
            />
            {clickable ? (
              <button
                type="button"
                onClick={() => onOpenMove!(txn!)}
                className="-m-2 w-[calc(100%+1rem)] rounded-lg p-2 text-start transition hover:bg-primary/5"
              >
                {body}
              </button>
            ) : (
              <div>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
