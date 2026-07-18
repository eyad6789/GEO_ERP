import { useEffect, useRef, useState } from 'react'
import { Terminal, Trash2, Pause, Play } from 'lucide-react'
import { useT } from '../../context/LangContext'
import { cn } from '../../lib/cn'
import { Panel } from './ui'
import { nextLog, seedLogs, stamp, type LogLevel, type LogLine } from './lib'

const LEVEL_STYLE: Record<LogLevel, string> = {
  ERROR: 'text-red-400',
  WARN: 'text-amber-400',
  INFO: 'text-sky-400',
  DEBUG: 'text-slate-500 dark:text-slate-400',
}

const LEVELS: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG']

export function LogsPanel() {
  const t = useT()
  const [lines, setLines] = useState<LogLine[]>(() => seedLogs())
  const [filter, setFilter] = useState<LogLevel | 'ALL'>('ALL')
  const [paused, setPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // stream new mock lines
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return
      setLines((l) => [...l.slice(-180), nextLog()])
    }, 2200)
    return () => clearInterval(id)
  }, [])

  // autoscroll to bottom
  useEffect(() => {
    if (paused) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, paused])

  const shown = filter === 'ALL' ? lines : lines.filter((l) => l.level === filter)
  const counts = LEVELS.reduce<Record<string, number>>((acc, lv) => {
    acc[lv] = lines.filter((l) => l.level === lv).length
    return acc
  }, {})

  return (
    <Panel
      title={t('debug.logs.title')}
      subtitle={`${shown.length} ${t('debug.logs.lines')}`}
      icon={<Terminal className="h-4 w-4" />}
      action={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-debug-bg p-0.5">
            {(['ALL', ...LEVELS] as const).map((lv) => (
              <button
                key={lv}
                onClick={() => setFilter(lv)}
                className={cn(
                  'rounded-md px-2 py-1 font-mono text-[11px] font-semibold transition',
                  filter === lv ? 'bg-debug-line text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-300',
                  lv !== 'ALL' && filter !== lv && LEVEL_STYLE[lv as LogLevel],
                )}
              >
                {lv === 'ALL' ? t('debug.logs.all') : lv}
                {lv !== 'ALL' && <span className="ms-1 opacity-60">{counts[lv] ?? 0}</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1 rounded-lg border border-debug-line px-2 py-1 text-xs text-slate-300 transition hover:bg-debug-line"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? t('debug.logs.resume') : t('debug.logs.pause')}
          </button>
          <button
            onClick={() => setLines([])}
            className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-2 py-1 text-xs text-red-300 transition hover:bg-red-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('debug.logs.clear')}
          </button>
        </div>
      }
    >
      <div
        ref={scrollRef}
        className="h-[440px] overflow-y-auto bg-debug-bg/60 p-3 font-mono text-[12.5px] leading-relaxed"
        style={{ direction: 'ltr' }}
      >
        {shown.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-600 dark:text-slate-300">
            <span className="font-mono">— {t('debug.logs.empty')} —</span>
          </div>
        ) : (
          shown.map((l) => (
            <div key={l.id} className="flex gap-2 whitespace-pre-wrap break-words py-0.5 hover:bg-white/[0.02]">
              <span className="shrink-0 text-slate-600 dark:text-slate-300">{stamp(l.ts)}</span>
              <span className={cn('w-12 shrink-0 font-bold', LEVEL_STYLE[l.level])}>{l.level}</span>
              <span className="shrink-0 text-purple-400/80">[{l.source}]</span>
              <span className="text-slate-300">{l.message}</span>
            </div>
          ))
        )}
        {!paused && shown.length > 0 && (
          <div className="flex gap-2 py-0.5 text-slate-600 dark:text-slate-300">
            <span className="animate-pulse">▋</span>
          </div>
        )}
      </div>
    </Panel>
  )
}
