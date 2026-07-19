import type { ReactNode } from 'react'
import {
  User,
  Shield,
  Calendar,
  Globe,
  Monitor,
  Hash,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Dialog, Badge } from '../../components/ui'
import { StatusBadge } from '../../components/shared'
import { useLang, useT } from '../../context/LangContext'
import { formatDateTime } from '../../lib/format'
import type { EventLog } from '../../types'
import { ACTION_COLOR, moduleMeta } from './constants'
import { LogDiff } from './LogDiff'

function InfoRow({ icon, label, children }: { icon: ReactNode; label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 dark:text-slate-400">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium text-slate-700 dark:text-slate-200">{children}</div>
      </div>
    </div>
  )
}

export function LogDetailDialog({ log, onClose }: { log: EventLog | null; onClose: () => void }) {
  const t = useT()
  const { lang } = useLang()

  if (!log) return null

  const meta = moduleMeta(log.module)
  const ModuleIcon = meta.icon
  const hasDiff = Boolean(log.old_values || log.new_values)

  return (
    <Dialog
      open={Boolean(log)}
      onClose={onClose}
      size="lg"
      title={t('logs.detail.title')}
      description={log.record_description || log.record_type}
    >
      <div className="space-y-6">
        {/* Top summary strip */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/60 dark:bg-slate-800/60 px-4 py-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.className}`}>
            <ModuleIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(`logs.module.${log.module}`)}</span>
              <Badge color={ACTION_COLOR[log.action] ?? 'gray'}>{t(`logs.action.${log.action}`)}</Badge>
              <StatusBadge status={log.status} />
            </div>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-400">{formatDateTime(log.timestamp, lang)}</p>
          </div>
        </div>

        {/* Error message (only on failure / warning) */}
        {log.error_message && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 dark:bg-red-500/15 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{t('logs.detail.error')}</p>
              <p className="mt-0.5">{log.error_message}</p>
            </div>
          </div>
        )}

        {/* Two info columns */}
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              {t('logs.detail.actor')}
            </p>
            <InfoRow icon={<User className="h-4 w-4" />} label={t('logs.detail.user')}>
              {log.user_name || '—'}
            </InfoRow>
            <InfoRow icon={<Shield className="h-4 w-4" />} label={t('logs.detail.role')}>
              {log.user_role || '—'}
            </InfoRow>
            <InfoRow icon={<FileText className="h-4 w-4" />} label={t('logs.detail.record_type')}>
              {log.record_type || '—'}
            </InfoRow>
            <InfoRow icon={<Hash className="h-4 w-4" />} label={t('logs.detail.record_id')}>
              <span className="font-mono text-xs">{log.record_id || '—'}</span>
            </InfoRow>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              {t('logs.detail.context')}
            </p>
            <InfoRow icon={<Calendar className="h-4 w-4" />} label={t('logs.detail.timestamp')}>
              {formatDateTime(log.timestamp, lang)}
            </InfoRow>
            <InfoRow icon={<Globe className="h-4 w-4" />} label={t('logs.detail.ip')}>
              <span className="font-mono text-xs">{log.ip_address || '—'}</span>
            </InfoRow>
            <InfoRow icon={<Monitor className="h-4 w-4" />} label={t('logs.detail.device')}>
              {log.device || '—'}
            </InfoRow>
            <InfoRow icon={<Monitor className="h-4 w-4" />} label={t('logs.detail.browser')}>
              {log.browser || '—'}
            </InfoRow>
          </div>
        </div>

        {/* Record description (full) */}
        {log.record_description && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              {t('logs.detail.record_desc')}
            </p>
            <p className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{log.record_description}</p>
          </div>
        )}

        {/* Diff view */}
        {hasDiff && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              {t('logs.diff.title')}
            </p>
            <LogDiff oldValues={log.old_values} newValues={log.new_values} />
          </div>
        )}
      </div>
    </Dialog>
  )
}
