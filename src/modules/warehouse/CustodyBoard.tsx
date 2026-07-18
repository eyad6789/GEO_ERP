import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, HandCoins, Undo2 } from 'lucide-react'
import { Badge, Button, LoadingState } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useToast } from '../../components/ui/Toast'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, formatNumber } from '../../lib/format'
import { apiPost } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { Warehouse } from '../../types'
import { type CustodyRow, shortWarehouseName } from './helpers'

const UNSPECIFIED = { ar: 'غير محدد', en: 'Unspecified' }

/** Days elapsed between an ISO date and now (never negative). */
function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)))
}

/**
 * Custody board — "who's holding what?" View for loaned-out materials (عهدة):
 * open loans grouped/filterable by recipient, with a one-click return that
 * posts the mirroring RETURN movement server-side.
 */
export function CustodyBoard({ onChanged }: { onChanged: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { data, loading, refetch } = useApi<CustodyRow[]>('/warehouse/custody')
  const { data: warehouses } = useResource<Warehouse>('warehouses')
  const [person, setPerson] = useState<string>('ALL')
  const [returningId, setReturningId] = useState<string | null>(null)
  const [showReturned, setShowReturned] = useState(false)

  const warehouseMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses])
  const whShortName = (id: string) => {
    const w = warehouseMap.get(id)
    const name = w ? (lang === 'ar' ? w.name_ar : w.name_en || w.name_ar) : id
    return shortWarehouseName(name)
  }

  const rows = data ?? []
  const openRows = useMemo(() => rows.filter((r) => !r.returned_at), [rows])
  const returnedRows = useMemo(() => rows.filter((r) => r.returned_at), [rows])

  const personCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of openRows) {
      const key = r.received_by || UNSPECIFIED[lang]
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return m
  }, [openRows, lang])
  const people = useMemo(() => [...personCounts.keys()], [personCounts])

  const personLabel = (r: CustodyRow) => r.received_by || UNSPECIFIED[lang]

  const filteredOpen = useMemo(
    () => (person === 'ALL' ? openRows : openRows.filter((r) => personLabel(r) === person)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openRows, person, lang],
  )

  const markReturned = async (id: string) => {
    setReturningId(id)
    try {
      await apiPost(`/warehouse/loan-returned/${id}`, {})
      toast.success(t('warehouse.custody.returned_ok'))
      refetch()
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setReturningId(null)
    }
  }

  if (loading) return <LoadingState label={t('common.loading')} />

  return (
    <div className="space-y-6">
      {/* Person filter chips */}
      {openRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-400">{t('warehouse.custody.by_person')}</span>
          <button
            type="button"
            onClick={() => setPerson('ALL')}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              person === 'ALL'
                ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200',
            )}
          >
            {t('common.all')} <span className="tabular-nums opacity-70">{formatNumber(openRows.length, lang)}</span>
          </button>
          {people.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerson((cur) => (cur === p ? 'ALL' : p))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition',
                person === p
                  ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200',
              )}
            >
              {p} <span className="tabular-nums opacity-70">{formatNumber(personCounts.get(p) ?? 0, lang)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Open loans */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('warehouse.custody.open')}{' '}
            <span className="tabular-nums text-slate-400 dark:text-slate-400">{formatNumber(filteredOpen.length, lang)}</span>
          </span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        {filteredOpen.length === 0 ? (
          <div className="card">
            <EmptyState title={t('warehouse.custody.empty')} icon={<HandCoins className="h-7 w-7" />} />
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-slate-700">
            {filteredOpen.map((r) => {
              const days = daysSince(r.date)
              const dayColor = days > 90 ? 'text-red-600 dark:text-red-300' : days > 30 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-slate-400'
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{personLabel(r)}</span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {whShortName(r.warehouse_id)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{r.items_text}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                      {formatDate(r.date, lang)} ·{' '}
                      <span className={cn('font-medium', dayColor)}>
                        {t('warehouse.custody.since')} {formatNumber(days, lang)} {t('warehouse.custody.days')}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-primary/30 text-primary hover:border-primary/50 hover:bg-primary/5"
                    disabled={returningId === r.id}
                    onClick={() => markReturned(r.id)}
                  >
                    <Undo2 className="h-4 w-4" />
                    {t('warehouse.custody.mark_returned')}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Returned (collapsed by default) */}
      {returnedRows.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowReturned((v) => !v)}
            className="mb-2 flex w-full items-center gap-3 text-start"
          >
            <span className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-400">
              {t('warehouse.custody.returned')}{' '}
              <span className="tabular-nums text-slate-300">{formatNumber(returnedRows.length, lang)}</span>
            </span>
            <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            {showReturned ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" />
            )}
          </button>

          {showReturned && (
            <div className="card divide-y divide-slate-100 dark:divide-slate-700 opacity-80">
              {returnedRows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{personLabel(r)}</span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {whShortName(r.warehouse_id)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{r.items_text}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{formatDate(r.date, lang)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge color="green" dot>
                      {t('warehouse.custody.returned')}
                    </Badge>
                    <span className="text-xs text-slate-400 dark:text-slate-400">{formatDate(r.returned_at, lang)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
