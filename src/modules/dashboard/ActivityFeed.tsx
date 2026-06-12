import type { ReactNode } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  LogIn,
  LogOut,
  Activity,
} from 'lucide-react'
import { Card, CardHeader } from '../../components/ui'
import { StatusBadge, EmptyState } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatDateTime } from '../../lib/format'
import type { EventLog, LogAction } from '../../types'

const ACTION_ICON: Record<LogAction, ReactNode> = {
  CREATE: <Plus className="h-4 w-4" />,
  UPDATE: <Pencil className="h-4 w-4" />,
  DELETE: <Trash2 className="h-4 w-4" />,
  APPROVE: <CheckCircle2 className="h-4 w-4" />,
  REJECT: <XCircle className="h-4 w-4" />,
  EXPORT: <Download className="h-4 w-4" />,
  PRINT: <Printer className="h-4 w-4" />,
  LOGIN: <LogIn className="h-4 w-4" />,
  LOGOUT: <LogOut className="h-4 w-4" />,
}

const ACTION_TINT: Record<LogAction, string> = {
  CREATE: 'bg-emerald-50 text-emerald-600',
  UPDATE: 'bg-blue-50 text-blue-600',
  DELETE: 'bg-red-50 text-red-600',
  APPROVE: 'bg-emerald-50 text-emerald-600',
  REJECT: 'bg-red-50 text-red-600',
  EXPORT: 'bg-purple-50 text-purple-600',
  PRINT: 'bg-slate-100 text-slate-500',
  LOGIN: 'bg-sky-50 text-sky-600',
  LOGOUT: 'bg-slate-100 text-slate-500',
}

const MODULE_LABEL = (module: string, t: (k: string) => string): string => {
  const key = `nav.${module?.toLowerCase()}`
  const translated = t(key)
  return translated === key ? module : translated
}

export function ActivityFeed({ logs }: { logs: EventLog[] }) {
  const t = useT()
  const { lang } = useLang()
  const rows = logs ?? []

  return (
    <Card>
      <CardHeader
        title={t('dashboard.activity.title')}
        subtitle={t('dashboard.activity.subtitle')}
        icon={<Activity className="h-4 w-4" />}
      />
      {rows.length ? (
        <ul className="divide-y divide-slate-100">
          {rows.map((log) => {
            const action = (log.action as LogAction) ?? 'UPDATE'
            return (
              <li
                key={log.id}
                className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    ACTION_TINT[action] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {ACTION_ICON[action] ?? <Activity className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-slate-700">
                      {t(`dashboard.action.${action}`)}
                    </span>
                    <span className="truncate text-sm text-slate-500">{log.record_description}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
                      {MODULE_LABEL(log.module, t)}
                    </span>
                    <span>·</span>
                    <span>{log.user_name}</span>
                    <span>·</span>
                    <span className="tabular-nums">{formatDateTime(log.timestamp, lang)}</span>
                  </div>
                </div>
                <span className="shrink-0">
                  <StatusBadge status={log.status} />
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Activity className="h-7 w-7" />}
          title={t('dashboard.activity.empty')}
          hint={t('dashboard.activity.empty_hint')}
        />
      )}
    </Card>
  )
}
