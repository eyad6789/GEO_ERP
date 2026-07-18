import { useLang } from '../../context/LangContext'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/cn'

export interface GanttTask {
  id: string
  label: string
  start: string // ISO date
  end: string // ISO date
  percent?: number // 0..100
  color?: string
}

/**
 * Lightweight CSS Gantt: one row per task, bar positioned across the overall
 * date range, with a progress overlay. No external Gantt dependency.
 */
export function GanttList({ tasks }: { tasks: GanttTask[] }) {
  const { lang, dir } = useLang()
  if (!tasks.length) return null

  const starts = tasks.map((t) => new Date(t.start).getTime())
  const ends = tasks.map((t) => new Date(t.end).getTime())
  const min = Math.min(...starts)
  const max = Math.max(...ends)
  const span = Math.max(1, max - min)

  const pct = (n: number) => ((n - min) / span) * 100

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => {
        const s = new Date(task.start).getTime()
        const e = new Date(task.end).getTime()
        const left = pct(s)
        const width = Math.max(2, pct(e) - left)
        const color = task.color ?? '#1a5f7a'
        const startEdge = dir === 'rtl' ? 'right' : 'left'
        return (
          <div key={task.id} className="grid grid-cols-[180px_1fr] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{task.label}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {formatDate(task.start, lang)} – {formatDate(task.end, lang)}
              </p>
            </div>
            <div className="relative h-7 rounded-lg bg-slate-100 dark:bg-slate-800">
              <div
                className="absolute top-0 h-7 rounded-lg"
                style={{ [startEdge]: `${left}%`, width: `${width}%`, backgroundColor: `${color}30` }}
              >
                <div
                  className={cn('h-7 rounded-lg transition-all')}
                  style={{ width: `${task.percent ?? 0}%`, backgroundColor: color }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  {task.percent ?? 0}%
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
