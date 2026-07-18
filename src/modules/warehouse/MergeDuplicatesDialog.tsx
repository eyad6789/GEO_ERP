import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Dialog, Button, LoadingState, useToast } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber } from '../../lib/format'
import { apiPost } from '../../lib/api'
import { cn } from '../../lib/cn'
import { categoryLabel, type CategoryDef, type DuplicateItem } from './helpers'

/** Stable key for a group — the merge candidates it holds never change shape
 * until the group itself is merged away, so sorted-ids is a safe React key
 * and a safe key for the per-group survivor-override map. */
function groupKey(items: DuplicateItem[]): string {
  return items
    .map((i) => i.id)
    .sort()
    .join(',')
}

/** Default survivor: largest quantity wins; ties go to the lowest code. */
function pickDefaultSurvivor(items: DuplicateItem[]): DuplicateItem {
  return [...items].sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity
    return a.code.localeCompare(b.code)
  })[0]
}

export function MergeDuplicatesDialog({
  open,
  onClose,
  onMerged,
}: {
  open: boolean
  onClose: () => void
  onMerged: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()

  const { data: groups, loading, refetch } = useApi<DuplicateItem[][]>(
    open ? '/warehouse/duplicate-candidates' : null,
  )
  const { data: taxonomy } = useApi<CategoryDef[]>(open ? '/warehouse/categories' : null)

  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [mergingKey, setMergingKey] = useState<string | null>(null)

  const list = groups ?? []

  const survivorFor = useMemo(
    () => (items: DuplicateItem[]) => {
      const key = groupKey(items)
      const override = overrides[key]
      if (override && items.some((i) => i.id === override)) return override
      return pickDefaultSurvivor(items).id
    },
    [overrides],
  )

  const doMerge = async (items: DuplicateItem[]) => {
    const key = groupKey(items)
    const survivorId = survivorFor(items)
    const mergedIds = items.filter((i) => i.id !== survivorId).map((i) => i.id)
    if (mergedIds.length === 0) return
    try {
      setMergingKey(key)
      await apiPost('/warehouse/merge-items', { survivor_id: survivorId, merged_ids: mergedIds })
      toast.success(t('warehouse.merge.done'))
      refetch()
      onMerged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setMergingKey(null)
    }
  }

  const close = () => {
    if (mergingKey) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} title={t('warehouse.merge.title')} description={t('warehouse.merge.desc')} size="lg">
      {loading ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-7 w-7" />} title={t('warehouse.merge.empty')} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {formatNumber(list.length, lang)} {t('warehouse.merge.groups')}
          </p>
          {list.map((items) => {
            const key = groupKey(items)
            const survivorId = survivorFor(items)
            const specsVary = new Set(items.map((i) => i.spec || '')).size > 1
            const first = items[0]
            const isMerging = mergingKey === key

            return (
              <div key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{first.name_ar}</span>
                  {first.size_label && (
                    <span dir="ltr" className="text-sm text-slate-500 dark:text-slate-400">
                      {first.size_label}
                    </span>
                  )}
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {categoryLabel(taxonomy, first.category, lang)}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((item) => {
                    const isSurvivor = item.id === survivorId
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition',
                          isSurvivor ? 'border-primary/40 bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
                        )}
                      >
                        <span className="flex shrink-0 items-center gap-1.5">
                          <input
                            type="radio"
                            name={`merge-survivor-${key}`}
                            checked={isSurvivor}
                            onChange={() => setOverrides((o) => ({ ...o, [key]: item.id }))}
                            className="h-4 w-4 accent-primary"
                          />
                          <span
                            className={cn(
                              'text-xs font-medium',
                              isSurvivor ? 'font-semibold text-primary' : 'text-slate-400 dark:text-slate-400',
                            )}
                          >
                            {t('warehouse.merge.keep')}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">{item.code}</span>
                        {specsVary && item.spec && (
                          <span className="truncate text-xs text-slate-400 dark:text-slate-400">{item.spec}</span>
                        )}
                        <span className="ms-auto shrink-0 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {formatNumber(item.quantity, lang)}{' '}
                          <span className="font-normal text-slate-400 dark:text-slate-400">{item.uom}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-3 flex flex-col items-start gap-1.5">
                  <Button size="sm" onClick={() => doMerge(items)} disabled={isMerging}>
                    {isMerging ? `${t('warehouse.merge.do')}…` : t('warehouse.merge.do')}
                  </Button>
                  <p className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.merge.desc')}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}
