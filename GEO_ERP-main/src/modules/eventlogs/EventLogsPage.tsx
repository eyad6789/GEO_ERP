import { useMemo, useState } from 'react'
import {
  ScrollText,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  X,
} from 'lucide-react'
import { Badge, Button, Field, Select } from '../../components/ui'
import {
  ArabicTable,
  KpiCard,
  PageHeader,
  StatusBadge,
  type Column,
} from '../../components/shared'
import { useResource } from '../../hooks/useResource'
import { useCompany } from '../../context/CompanyContext'
import { useLang, useT } from '../../context/LangContext'
import { formatDateTime, formatNumber } from '../../lib/format'
import type { EventLog } from '../../types'
import { ACTION_COLOR, ACTION_OPTIONS, MODULE_OPTIONS, STATUS_OPTIONS, moduleMeta } from './constants'
import { LogDetailDialog } from './LogDetailDialog'

export function EventLogsPage() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()

  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<EventLog | null>(null)

  // Server filters — only send non-empty values. Server sorts by timestamp desc.
  const params = useMemo(
    () => ({
      company_id: companyId ?? undefined,
      module: moduleFilter || undefined,
      action: actionFilter || undefined,
      status: statusFilter || undefined,
      sort: 'timestamp',
      order: 'DESC',
    }),
    [companyId, moduleFilter, actionFilter, statusFilter],
  )

  const { data, loading } = useResource<EventLog>('event_logs', params)

  // KPI counts from the fetched data
  const stats = useMemo(() => {
    let success = 0
    let failed = 0
    let warning = 0
    for (const log of data) {
      if (log.status === 'SUCCESS') success++
      else if (log.status === 'FAILED') failed++
      else if (log.status === 'WARNING') warning++
    }
    const total = data.length
    const rate = total ? Math.round((success / total) * 100) : 0
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
    return { total, success, failed, warning, rate, pct }
  }, [data])

  const hasFilters = Boolean(moduleFilter || actionFilter || statusFilter)
  const clearFilters = () => {
    setModuleFilter('')
    setActionFilter('')
    setStatusFilter('')
  }

  const columns: Column<EventLog>[] = useMemo(
    () => [
      {
        key: 'timestamp',
        header: t('logs.col.timestamp'),
        accessor: (r) => r.timestamp,
        sortable: true,
        width: '170px',
        render: (r) => (
          <span className="whitespace-nowrap tabular-nums text-slate-600">
            {formatDateTime(r.timestamp, lang)}
          </span>
        ),
      },
      {
        key: 'user_name',
        header: t('logs.col.user'),
        accessor: (r) => r.user_name,
        sortable: true,
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-700">{r.user_name || '—'}</p>
            {r.user_role && <p className="truncate text-xs text-slate-400">{r.user_role}</p>}
          </div>
        ),
      },
      {
        key: 'module',
        header: t('logs.col.module'),
        accessor: (r) => r.module,
        sortable: true,
        render: (r) => {
          const meta = moduleMeta(r.module)
          const Icon = meta.icon
          return (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.className}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-slate-600">{t(`logs.module.${r.module}`)}</span>
            </span>
          )
        },
      },
      {
        key: 'action',
        header: t('logs.col.action'),
        accessor: (r) => r.action,
        sortable: true,
        render: (r) => (
          <Badge color={ACTION_COLOR[r.action] ?? 'gray'}>{t(`logs.action.${r.action}`)}</Badge>
        ),
      },
      {
        key: 'record_description',
        header: t('logs.col.description'),
        accessor: (r) => r.record_description,
        render: (r) => (
          <span className="block max-w-[280px] truncate text-slate-600" title={r.record_description}>
            {r.record_description || '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('logs.col.status'),
        accessor: (r) => r.status,
        sortable: true,
        align: 'center',
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: 'ip_address',
        header: t('logs.col.ip'),
        accessor: (r) => r.ip_address,
        render: (r) => <span className="font-mono text-xs text-slate-500">{r.ip_address || '—'}</span>,
      },
    ],
    [t, lang],
  )

  const moduleOptions = [
    { value: '', label: t('logs.filters.all_modules') },
    ...MODULE_OPTIONS.map((m) => ({ value: m, label: t(`logs.module.${m}`) })),
  ]
  const actionOptions = [
    { value: '', label: t('logs.filters.all_actions') },
    ...ACTION_OPTIONS.map((a) => ({ value: a, label: t(`logs.action.${a}`) })),
  ]
  const statusOptions = [
    { value: '', label: t('logs.filters.all_statuses') },
    ...STATUS_OPTIONS.map((s) => ({ value: s, label: t(`status.${s}`) })),
  ]

  return (
    <div>
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.subtitle')}
        icon={<ScrollText className="h-6 w-6" />}
      />

      {/* Immutable notice banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{t('logs.immutable')}</p>
          <p className="mt-0.5 text-xs text-amber-700/80">{t('logs.immutable_hint')}</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('logs.kpi.total')}
          value={formatNumber(stats.total, lang)}
          icon={<Activity className="h-5 w-5" />}
          accent="primary"
          hint={t('logs.subtitle')}
        />
        <KpiCard
          label={t('logs.kpi.success')}
          value={formatNumber(stats.success, lang)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
          hint={`${t('logs.kpi.success_rate')}: ${stats.rate}%`}
        />
        <KpiCard
          label={t('logs.kpi.failed')}
          value={formatNumber(stats.failed, lang)}
          icon={<XCircle className="h-5 w-5" />}
          accent="danger"
          hint={`${stats.pct(stats.failed)}% ${t('logs.kpi.of_total')}`}
        />
        <KpiCard
          label={t('logs.kpi.warning')}
          value={formatNumber(stats.warning, lang)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="warning"
          hint={t('logs.kpi.needs_review')}
        />
      </div>

      {/* Filters + table */}
      <ArabicTable<EventLog>
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelected(r)}
        searchable
        searchPlaceholder={t('logs.search_placeholder')}
        exportName="event_logs"
        emptyTitle={t('logs.empty.title')}
        emptyHint={t('logs.empty.hint')}
        toolbar={
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('logs.filters.module')} className="min-w-[150px]">
              <Select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                options={moduleOptions}
              />
            </Field>
            <Field label={t('logs.filters.action')} className="min-w-[150px]">
              <Select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                options={actionOptions}
              />
            </Field>
            <Field label={t('logs.filters.status')} className="min-w-[140px]">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={statusOptions}
              />
            </Field>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                {t('logs.filters.clear')}
              </Button>
            )}
          </div>
        }
      />

      <LogDetailDialog log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
