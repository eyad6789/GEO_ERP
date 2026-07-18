import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarDays,
  FolderKanban,
  LayoutGrid,
  MapPin,
  Rows3,
  Search,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { KpiCard } from '../../components/shared/KpiCard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { ArabicTable, type Column } from '../../components/shared/ArabicTable'
import { Select } from '../../components/ui/Select'
import { LoadingState } from '../../components/ui/Spinner'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, formatCompact, pickName } from '../../lib/format'
import type { Company, Employee, Project, ProjectStatus } from '../../types'
import { ProgressBar } from './ProgressBar'

const STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']

export function ProjectsList() {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { companyId } = useCompany()

  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const params = useMemo(
    () => ({ company_id: companyId ?? undefined, status: status || undefined }),
    [companyId, status],
  )
  const { data: projects, loading } = useResource<Project>('projects', params)
  const { data: companies } = useResource<Company>('companies')
  const { data: employees } = useResource<Employee>('employees', { company_id: companyId ?? undefined })

  const companyById = useMemo(() => {
    const m = new Map<string, Company>()
    companies.forEach((c) => m.set(c.id, c))
    return m
  }, [companies])

  const employeeById = useMemo(() => {
    const m = new Map<string, Employee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  const managerName = (p: Project) =>
    (p.manager_id && pickName(employeeById.get(p.manager_id), lang)) || t('projects.field.unassigned')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      [p.code, p.name_ar, p.name_en, p.client, p.location, p.contract_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [projects, query])

  // KPIs
  const kpis = useMemo(() => {
    const total = projects.length
    const active = projects.filter((p) => p.status === 'ACTIVE').length
    const contractTotal = projects.reduce((s, p) => s + (p.contract_value || 0), 0)
    const avgProgress = total ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / total) : 0
    return { total, active, contractTotal, avgProgress }
  }, [projects])

  const columns: Column<Project>[] = [
    { key: 'code', header: t('common.code'), sortable: true, width: '120px', render: (p) => <span className="font-mono text-xs font-semibold text-primary">{p.code}</span> },
    {
      key: 'name',
      header: t('common.name'),
      accessor: (p) => pickName(p, lang),
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">{pickName(p, lang)}</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-400">{p.client}</p>
        </div>
      ),
    },
    { key: 'company', header: t('projects.field.company'), accessor: (p) => pickName(companyById.get(p.company_id), lang), render: (p) => pickName(companyById.get(p.company_id), lang) },
    { key: 'status', header: t('common.status'), accessor: (p) => p.status, render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'contract_value',
      header: t('projects.field.contract_value'),
      accessor: (p) => p.contract_value,
      sortable: true,
      align: 'end',
      render: (p) => <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(p.contract_value, p.currency, lang)}</span>,
    },
    {
      key: 'progress',
      header: t('projects.field.progress'),
      accessor: (p) => p.progress,
      sortable: true,
      width: '160px',
      render: (p) => <ProgressBar value={p.progress} showLabel size="sm" />,
    },
    { key: 'end_date', header: t('projects.field.end_date'), accessor: (p) => p.end_date, sortable: true, render: (p) => formatDate(p.end_date, lang) },
  ]

  return (
    <div>
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        icon={<FolderKanban className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setView('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition ${view === 'grid' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              aria-label="grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition ${view === 'table' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              aria-label="table"
            >
              <Rows3 className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('projects.kpi.total')} value={kpis.total} icon={<FolderKanban className="h-5 w-5" />} accent="primary" />
        <KpiCard label={t('projects.kpi.active')} value={kpis.active} icon={<TrendingUp className="h-5 w-5" />} accent="success" hint={`${kpis.total ? Math.round((kpis.active / kpis.total) * 100) : 0}%`} />
        <KpiCard label={t('projects.kpi.contract_total')} value={formatCompact(kpis.contractTotal, lang)} icon={<Wallet className="h-5 w-5" />} accent="accent" hint={formatCurrency(kpis.contractTotal, 'IQD', lang)} />
        <KpiCard label={t('projects.kpi.avg_progress')} value={`${kpis.avgProgress}%`} icon={<TrendingUp className="h-5 w-5" />} accent="info" />
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('projects.search')}
            className="input-base ps-9"
          />
        </div>
        <div className="w-52">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder={t('projects.filter.all_statuses')}>
            <option value="">{t('projects.filter.all_statuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Content */}
      {view === 'table' ? (
        <ArabicTable
          columns={columns}
          data={filtered}
          loading={loading}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/projects/${p.id}`)}
          searchable={false}
          exportName="projects"
          emptyTitle={t('projects.empty')}
          emptyHint={t('projects.empty_hint')}
        />
      ) : loading ? (
        <LoadingState label={t('common.loading')} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title={t('projects.empty')} hint={t('projects.empty_hint')} icon={<FolderKanban className="h-7 w-7" />} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              companyName={pickName(companyById.get(p.company_id), lang)}
              managerName={managerName(p)}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project: p,
  companyName,
  managerName,
  onClick,
}: {
  project: Project
  companyName: string
  managerName: string
  onClick: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  return (
    <button
      onClick={onClick}
      className="card group flex flex-col gap-4 p-5 text-start transition hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-xs font-semibold text-primary">{p.code}</span>
          <h3 className="mt-0.5 line-clamp-2 font-bold leading-snug text-slate-800 dark:text-slate-100 group-hover:text-primary">
            {pickName(p, lang)}
          </h3>
        </div>
        <StatusBadge status={p.status} />
      </div>

      {/* Client + company */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
          {p.client || '—'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
          {companyName}
        </span>
        {p.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
            {p.location}
          </span>
        )}
      </div>

      {/* Contract value */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400">{t('projects.field.contract_value')}</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(p.contract_value, p.currency, lang)}</p>
      </div>

      {/* Progress */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500 dark:text-slate-400">{t('projects.field.progress')}</span>
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{Math.round(p.progress)}%</span>
        </div>
        <ProgressBar value={p.progress} />
      </div>

      {/* Footer: dates + manager */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/70 pt-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
          {formatDate(p.start_date, lang)} – {formatDate(p.end_date, lang)}
        </span>
        <span className="inline-flex max-w-[45%] items-center gap-1.5 truncate">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
          <span className="truncate">{managerName}</span>
        </span>
      </div>
    </button>
  )
}
