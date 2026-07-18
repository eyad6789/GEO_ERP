import { useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useT } from '../../context/LangContext'

function safeParse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/**
 * Two-column before/after diff rendered from old_values / new_values JSON strings.
 * Rows where the value changed are highlighted.
 */
export function LogDiff({ oldValues, newValues }: { oldValues: string | null; newValues: string | null }) {
  const t = useT()
  const before = useMemo(() => safeParse(oldValues), [oldValues])
  const after = useMemo(() => safeParse(newValues), [newValues])

  const keys = useMemo(() => {
    const set = new Set<string>()
    if (before) Object.keys(before).forEach((k) => set.add(k))
    if (after) Object.keys(after).forEach((k) => set.add(k))
    return Array.from(set)
  }, [before, after])

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-400">
        {t('logs.diff.none')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <tr>
            <th className="px-4 py-2.5 text-start">{t('logs.diff.field')}</th>
            <th className="px-4 py-2.5 text-start">{t('logs.diff.before')}</th>
            <th className="w-8 px-2 py-2.5 text-center">
              <ArrowLeftRight className="mx-auto h-3.5 w-3.5 text-slate-300" />
            </th>
            <th className="px-4 py-2.5 text-start">{t('logs.diff.after')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {keys.map((key) => {
            const bv = before ? before[key] : undefined
            const av = after ? after[key] : undefined
            const changed = display(bv) !== display(av)
            return (
              <tr key={key} className={changed ? 'bg-amber-50/40 dark:bg-amber-500/15' : ''}>
                <td className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">{key}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      changed
                        ? 'rounded bg-red-50 dark:bg-red-500/15 px-1.5 py-0.5 text-red-700 dark:text-red-300 line-through decoration-red-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {display(bv)}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center text-slate-300">→</td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      changed
                        ? 'rounded bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {display(av)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
