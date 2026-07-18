import { useMemo, useState } from 'react'
import { Activity, ArrowRight } from 'lucide-react'
import { Badge, LoadingState } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { InventoryTransaction, InventoryTxnType, Warehouse } from '../../types'
import { shortWarehouseName, TXN_TYPE_COLOR, TXN_TYPES } from './helpers'

// Literal Tailwind classes per movement type — same color family as
// TXN_TYPE_COLOR/Badge (never built dynamically, so purge always sees them).
const TYPE_CHIP_ACTIVE: Record<InventoryTxnType, string> = {
  IN: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/30',
  OUT: 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-200 dark:ring-red-500/30',
  TRANSFER: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-200 dark:ring-blue-500/30',
  RETURN: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-200 dark:ring-amber-500/30',
  ADJUST: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-200 dark:ring-purple-500/30',
}
const CHIP_INACTIVE = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
const CHIP_ALL_ACTIVE = 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'

interface ActivityItemLine {
  name_ar: string
  name_en: string
  quantity: number
  uom: string
}

interface ActivityRow {
  id: string
  serial_number: string
  date: string
  type: InventoryTxnType
  notes: string
  warehouse_id: string
  from_warehouse_id: string | null
  items: ActivityItemLine[]
}

/** Local YYYY-MM-DD key for a given Date, used to detect "today"/"yesterday". */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * "What happened in my warehouses lately?" — a day-grouped, human-readable
 * feed of the last 60 movements. Sibling of ItemJourney's MovementTimeline,
 * but activity-centric (across all items/warehouses) instead of item-centric.
 */
export function ActivityFeed({
  transactions,
  warehouses,
  onOpenTxn,
}: {
  transactions: InventoryTransaction[]
  warehouses: Warehouse[]
  onOpenTxn: (txn: InventoryTransaction) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useApi<ActivityRow[]>('/warehouse/recent-activity')
  const [typeFilter, setTypeFilter] = useState<InventoryTxnType | 'ALL'>('ALL')

  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses])
  const txnMap = useMemo(() => new Map(transactions.map((tx) => [tx.id, tx])), [transactions])
  const whName = (id: string | null) => {
    if (!id) return '—'
    const w = warehouseMap.get(id)
    return w ? shortWarehouseName(pickName(w, lang)) : id
  }

  const rows = data ?? []

  const typeCounts = useMemo(() => {
    const counts = new Map<InventoryTxnType, number>()
    for (const r of rows) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
    return counts
  }, [rows])
  const presentTypes = useMemo(() => TXN_TYPES.filter((tp) => (typeCounts.get(tp) ?? 0) > 0), [typeCounts])

  const filtered = useMemo(
    () => (typeFilter === 'ALL' ? rows : rows.filter((r) => r.type === typeFilter)),
    [rows, typeFilter],
  )

  const groups = useMemo(() => {
    const map = new Map<string, ActivityRow[]>()
    for (const r of filtered) {
      const key = r.date.slice(0, 10)
      const arr = map.get(key)
      if (arr) arr.push(r)
      else map.set(key, [r])
    }
    return [...map.entries()]
  }, [filtered])

  const todayKey = localDateKey(new Date())
  const yesterdayKey = localDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const dayLabel = (key: string) => {
    if (key === todayKey) return t('warehouse.activity.today')
    if (key === yesterdayKey) return t('warehouse.activity.yesterday')
    return formatDate(key, lang)
  }

  if (loading) return <LoadingState label={t('common.loading')} />
  if (rows.length === 0) {
    return (
      <div className="card">
        <EmptyState title={t('warehouse.activity.empty')} icon={<Activity className="h-7 w-7" />} />
      </div>
    )
  }

  const chip = (label: string) => (
    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
  )

  return (
    <div className="space-y-6">
      {/* Type filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter('ALL')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition',
            typeFilter === 'ALL' ? CHIP_ALL_ACTIVE : CHIP_INACTIVE,
          )}
        >
          {t('common.all')} <span className="tabular-nums opacity-70">{formatNumber(rows.length, lang)}</span>
        </button>
        {presentTypes.map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => setTypeFilter((cur) => (cur === tp ? 'ALL' : tp))}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              typeFilter === tp ? TYPE_CHIP_ACTIVE[tp] : CHIP_INACTIVE,
            )}
          >
            {t(`warehouse.type.${tp}`)}{' '}
            <span className="tabular-nums opacity-70">{formatNumber(typeCounts.get(tp) ?? 0, lang)}</span>
          </button>
        ))}
      </div>

      {/* Day groups, newest first */}
      <div className="space-y-6">
        {groups.map(([dayKey, dayRows]) => (
          <div key={dayKey}>
            <div className="mb-2 flex items-center gap-3">
              <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{dayLabel(dayKey)}</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="card divide-y divide-slate-100 dark:divide-slate-700">
              {dayRows.map((r) => {
                const txn = txnMap.get(r.id)
                const clickable = Boolean(txn)
                const itemsShown = r.items.slice(0, 2)
                const moreCount = r.items.length - itemsShown.length

                const route =
                  r.type === 'TRANSFER' ? (
                    <>
                      <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.track.from')}</span>
                      {chip(whName(r.from_warehouse_id))}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
                      {chip(whName(r.warehouse_id))}
                    </>
                  ) : r.type === 'IN' ? (
                    <>
                      <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.flow.external_in')}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
                      {chip(whName(r.warehouse_id))}
                    </>
                  ) : r.type === 'OUT' ? (
                    <>
                      {chip(whName(r.warehouse_id))}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
                      <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.flow.external_out')}</span>
                    </>
                  ) : (
                    chip(whName(r.warehouse_id))
                  )

                const body = (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={TXN_TYPE_COLOR[r.type]} dot>
                        {t(`warehouse.type.${r.type}`)}
                      </Badge>
                      <span className="flex flex-wrap items-center gap-1.5">{route}</span>
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
                      {itemsShown.map((it, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1">
                          {pickName({ name_ar: it.name_ar, name_en: it.name_en }, lang)}
                          <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatNumber(it.quantity, lang)}</span>
                          <span className="text-xs font-normal text-slate-400 dark:text-slate-400">{it.uom}</span>
                        </span>
                      ))}
                      {moreCount > 0 && (
                        <span className="text-xs text-slate-400 dark:text-slate-400">
                          +{formatNumber(moreCount, lang)} {t('warehouse.activity.more_items')}
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-slate-400 dark:text-slate-400">
                      <span className="font-mono">{r.serial_number}</span>
                      {r.notes && <span> · {r.notes}</span>}
                    </p>
                  </>
                )

                return clickable ? (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpenTxn(txn!)}
                    className="block w-full px-4 py-3 text-start transition hover:bg-primary/5"
                  >
                    {body}
                  </button>
                ) : (
                  <div key={r.id} className="px-4 py-3">
                    {body}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
