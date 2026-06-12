import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BookText,
  Building2,
  CalendarRange,
  ChevronLeft,
  FileType2,
  FolderKanban,
  GanttChartSquare,
  MapPin,
  Receipt,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { KpiCard } from '../../components/shared/KpiCard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { NoteWidget } from '../../components/notes/NoteWidget'
import { Tabs, type TabItem } from '../../components/ui/Tabs'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/ui/Spinner'
import { useRecord, useResource, useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Company, Employee, Project, ProjectExpenditure } from '../../types'
import { ProgressBar } from './ProgressBar'
import { AccountingTab } from './tabs/AccountingTab'
import { TimelineTab } from './tabs/TimelineTab'
import { SchedulesTab } from './tabs/SchedulesTab'
import { MachineryTab } from './tabs/MachineryTab'
import { WarehouseTab } from './tabs/WarehouseTab'
import { StaffTab } from './tabs/StaffTab'
import { ExpendituresTab } from './tabs/ExpendituresTab'
import { DiagramsTab } from './tabs/DiagramsTab'

interface ProjectPnl {
  revenue: number
  expense: number
  net: number
}

type TabKey =
  | 'accounting'
  | 'timeline'
  | 'schedules'
  | 'machinery'
  | 'warehouse'
  | 'staff'
  | 'expenditures'
  | 'diagrams'

export function ProjectDetail() {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('accounting')

  const { data: project, loading } = useRecord<Project>('projects', id)
  const { data: companies } = useResource<Company>('companies')
  const { data: expenditures } = useResource<ProjectExpenditure>('project_expenditures', { project_id: id })
  const { data: employees } = useResource<Employee>('employees', project?.company_id ? { company_id: project.company_id } : undefined)
  const { data: pnl } = useApi<ProjectPnl>(id ? '/reports/project-pnl' : null, { project_id: id })

  const company = useMemo(() => companies.find((c) => c.id === project?.company_id) ?? null, [companies, project])
  const manager = employees.find((m) => m.id === project?.manager_id) ?? null
  const spent = useMemo(() => expenditures.reduce((s, e) => s + (e.amount || 0), 0), [expenditures])

  if (loading) return <LoadingState label={t('common.loading')} />

  if (!project || !id) {
    return (
      <div>
        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
            <ArrowRight className="h-4 w-4" />
            {t('projects.back_to_list')}
          </Button>
        </div>
        <div className="card">
          <EmptyState title={t('projects.not_found')} hint={t('projects.not_found_hint')} icon={<FolderKanban className="h-7 w-7" />} />
        </div>
      </div>
    )
  }

  const remaining = (project.contract_value || 0) - spent

  const tabs: TabItem[] = [
    { key: 'accounting', label: t('projects.tab.accounting'), icon: <BookText className="h-4 w-4" /> },
    { key: 'timeline', label: t('projects.tab.timeline'), icon: <GanttChartSquare className="h-4 w-4" /> },
    { key: 'schedules', label: t('projects.tab.schedules'), icon: <CalendarRange className="h-4 w-4" /> },
    { key: 'machinery', label: t('projects.tab.machinery'), icon: <Truck className="h-4 w-4" /> },
    { key: 'warehouse', label: t('projects.tab.warehouse'), icon: <WarehouseIcon className="h-4 w-4" /> },
    { key: 'staff', label: t('projects.tab.staff'), icon: <Users className="h-4 w-4" /> },
    { key: 'expenditures', label: t('projects.tab.expenditures'), icon: <Receipt className="h-4 w-4" /> },
    { key: 'diagrams', label: t('projects.tab.diagrams'), icon: <FileType2 className="h-4 w-4" /> },
  ]

  return (
    <div>
      <PageHeader
        title={pickName(project, lang)}
        subtitle={t('projects.detail.subtitle')}
        icon={<FolderKanban className="h-6 w-6" />}
        breadcrumb={
          <nav className="flex items-center gap-1.5 text-sm text-slate-400">
            <Link to="/projects" className="hover:text-primary">
              {t('projects.title')}
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            <span className="font-mono text-slate-500">{project.code}</span>
          </nav>
        }
        actions={
          <div className="flex items-center gap-2">
            <NoteWidget recordType="project" recordId={project.id} moduleId="projects" />
            <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
              <ArrowRight className="h-4 w-4" />
              {t('projects.back_to_list')}
            </Button>
          </div>
        }
      />

      {/* Summary card */}
      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-semibold text-primary">{project.code}</span>
              <StatusBadge status={project.status} />
              {project.contract_number && (
                <span className="text-xs text-slate-400">
                  {t('projects.field.contract_number')}: <span className="font-mono text-slate-500">{project.contract_number}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-slate-400" />
                {t('projects.field.client')}: <span className="font-medium text-slate-700">{project.client || '—'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                {pickName(company, lang)}
              </span>
              {project.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {project.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-slate-400" />
                {formatDate(project.start_date, lang)} – {formatDate(project.end_date, lang)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4 text-slate-400" />
                {t('projects.field.manager')}: <span className="font-medium text-slate-700">{manager ? pickName(manager, lang) : t('projects.field.unassigned')}</span>
              </span>
            </div>
            {project.description && <p className="max-w-3xl text-sm leading-relaxed text-slate-500">{project.description}</p>}
          </div>

          {/* Progress dial */}
          <div className="w-full max-w-xs shrink-0 rounded-xl bg-slate-50 p-4 sm:w-64">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{t('projects.field.progress')}</span>
              <span className="text-xl font-bold tabular-nums text-slate-800">{Math.round(project.progress)}%</span>
            </div>
            <ProgressBar value={project.progress} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('projects.kpi.contract')} value={formatCurrency(project.contract_value, project.currency, lang)} icon={<Wallet className="h-5 w-5" />} accent="primary" />
        <KpiCard label={t('projects.kpi.spent')} value={formatCurrency(spent, project.currency, lang)} icon={<Receipt className="h-5 w-5" />} accent="danger" hint={`${expenditures.length} ${t('projects.exp.count')}`} />
        <KpiCard
          label={t('projects.kpi.remaining')}
          value={formatCurrency(remaining, project.currency, lang)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent={remaining >= 0 ? 'success' : 'warning'}
        />
        <KpiCard
          label={t('projects.kpi.net')}
          value={formatCurrency(pnl?.net ?? 0, project.currency, lang)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent={(pnl?.net ?? 0) >= 0 ? 'info' : 'warning'}
          hint={`${t('projects.kpi.revenue')}: ${formatCurrency(pnl?.revenue ?? 0, project.currency, lang)}`}
        />
      </div>

      {/* Tabs */}
      <div className="mb-5 overflow-x-auto">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as TabKey)} variant="pills" />
      </div>

      {/* Tab content */}
      <div>
        {tab === 'accounting' && <AccountingTab projectId={id} currency={project.currency} />}
        {tab === 'timeline' && <TimelineTab projectId={id} />}
        {tab === 'schedules' && <SchedulesTab projectId={id} />}
        {tab === 'machinery' && <MachineryTab projectId={id} companyId={project.company_id} />}
        {tab === 'warehouse' && <WarehouseTab projectId={id} />}
        {tab === 'staff' && <StaffTab projectId={id} companyId={project.company_id} />}
        {tab === 'expenditures' && <ExpendituresTab projectId={id} currency={project.currency} />}
        {tab === 'diagrams' && <DiagramsTab projectId={id} />}
      </div>
    </div>
  )
}
