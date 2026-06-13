import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  Users,
  FolderKanban,
  Wallet,
  MapPin,
  Network,
  ArrowLeft,
  Layers,
} from 'lucide-react'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { PageHeader, StatusBadge } from '../../components/shared'
import { Avatar, Spinner } from '../../components/ui'
import { formatCompact, formatNumber, pickName } from '../../lib/format'
import type { Company, Employee, Project } from '../../types'

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

interface CompanyStat {
  employees: number
  projects: number
  contractValue: number
}

export function CompaniesList() {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()

  const { data: companies, loading } = useResource<Company>('companies')
  const { data: employees } = useResource<Employee>('employees')
  const { data: projects } = useResource<Project>('projects')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  // Per-company counts computed once, client-side.
  const stats = useMemo(() => {
    const map = new Map<string, CompanyStat>()
    for (const c of companies) map.set(c.id, { employees: 0, projects: 0, contractValue: 0 })
    for (const e of employees) {
      const s = map.get(e.company_id)
      if (s) s.employees += 1
    }
    for (const p of projects) {
      const s = map.get(p.company_id)
      if (s) {
        s.projects += 1
        s.contractValue += p.contract_value || 0
      }
    }
    return map
  }, [companies, employees, projects])

  const parent = useMemo(() => companies.find((c) => c.type === 'PARENT'), [companies])
  const subsidiaries = useMemo(() => companies.filter((c) => c.type === 'SUBSIDIARY'), [companies])

  // Consolidated totals across the whole group.
  const consolidated = useMemo(() => {
    return {
      subsidiaries: subsidiaries.length,
      employees: employees.length,
      projects: projects.length,
      contractValue: projects.reduce((sum, p) => sum + (p.contract_value || 0), 0),
    }
  }, [subsidiaries.length, employees.length, projects])

  const filteredSubsidiaries = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subsidiaries.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (!q) return true
      return [c.name_ar, c.name_en, c.city, c.code].some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [subsidiaries, query, statusFilter])

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: t('companies.filter_all') },
    { key: 'ACTIVE', label: t('companies.filter_active') },
    { key: 'INACTIVE', label: t('companies.filter_inactive') },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader
          title={t('companies.title')}
          subtitle={t('companies.subtitle')}
          icon={<Building2 className="h-6 w-6" />}
        />
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('companies.title')}
        subtitle={t('companies.subtitle')}
        icon={<Building2 className="h-6 w-6" />}
        actions={
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
            <Network className="h-4 w-4" />
            {formatNumber(companies.length, lang)} {t('companies.companies_count')}
          </span>
        }
      />

      {/* ---- Parent hero card ---- */}
      {parent && <ParentHero parent={parent} consolidated={consolidated} onOpen={() => navigate(`/companies/${parent.id}`)} />}

      {/* ---- Group companies header + toolbar ---- */}
      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Layers className="h-5 w-5 text-primary" />
          {t('companies.group_companies')}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {formatNumber(filteredSubsidiaries.length, lang)}
          </span>
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('companies.search')}
              className="input-base h-9 w-64 ps-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={
                  'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                  (statusFilter === f.key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-500 hover:text-slate-700')
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Subsidiary grid ---- */}
      {filteredSubsidiaries.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300" />
          <p className="text-base font-semibold text-slate-600">{t('companies.no_companies')}</p>
          <p className="text-sm text-slate-400">{t('companies.no_companies_hint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubsidiaries.map((c) => (
            <SubsidiaryCard
              key={c.id}
              company={c}
              stat={stats.get(c.id) ?? { employees: 0, projects: 0, contractValue: 0 }}
              onClick={() => navigate(`/companies/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function ParentHero({
  parent,
  consolidated,
  onOpen,
}: {
  parent: Company
  consolidated: { subsidiaries: number; employees: number; projects: number; contractValue: number }
  onOpen: () => void
}) {
  const t = useT()
  const { lang } = useLang()

  const heroStats = [
    {
      icon: Network,
      label: t('companies.subsidiaries_count'),
      value: formatNumber(consolidated.subsidiaries, lang),
    },
    {
      icon: Users,
      label: t('companies.total_employees'),
      value: formatNumber(consolidated.employees, lang),
    },
    {
      icon: FolderKanban,
      label: t('companies.total_projects'),
      value: formatNumber(consolidated.projects, lang),
    },
    {
      icon: Wallet,
      label: t('companies.total_contract_value'),
      value: formatCompact(consolidated.contractValue, lang),
    },
  ]

  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-dark p-6 text-white shadow-card transition hover:shadow-card-hover sm:p-8"
    >
      {/* decorative rings */}
      <div className="pointer-events-none absolute -end-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -end-24 top-12 h-56 w-56 rounded-full bg-white/5" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg ring-2 ring-white/30"
            style={{ backgroundColor: parent.logo_color }}
          >
            {pickName(parent, lang).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
          </span>
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
              <Building2 className="h-3.5 w-3.5" />
              {t('companies.parent')}
            </div>
            <h2 className="text-2xl font-bold">{pickName(parent, lang)}</h2>
            <p className="mt-0.5 text-sm text-white/70">
              {lang === 'ar' ? parent.name_en : parent.name_ar} · {parent.code}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
              <MapPin className="h-3.5 w-3.5" />
              {parent.city}، {parent.country}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium opacity-0 transition group-hover:opacity-100">
          {t('companies.view_company')}
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1 rtl:rotate-180" />
        </span>
      </div>

      {/* consolidated stats */}
      <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {heroStats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-white/70">
              <s.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function SubsidiaryCard({
  company,
  stat,
  onClick,
}: {
  company: Company
  stat: CompanyStat
  onClick: () => void
}) {
  const t = useT()
  const { lang } = useLang()

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={pickName(company, lang)} color={company.logo_color} size="lg" />
          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-800">{pickName(company, lang)}</h3>
            <p className="truncate text-xs text-slate-400">
              {lang === 'ar' ? company.name_en : company.name_ar}
            </p>
            <p className="mt-0.5 font-mono text-xs text-primary">{company.code}</p>
          </div>
        </div>
        <StatusBadge status={company.status} />
      </div>

      <p className="mt-3 flex items-center gap-1 text-sm text-slate-500">
        <MapPin className="h-3.5 w-3.5 text-slate-400" />
        {company.city}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tabular-nums text-slate-800">{formatNumber(stat.employees, lang)}</p>
            <p className="text-[11px] text-slate-400">{t('companies.employees')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <FolderKanban className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tabular-nums text-slate-800">{formatNumber(stat.projects, lang)}</p>
            <p className="text-[11px] text-slate-400">{t('companies.projects')}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
        {t('companies.view_company')}
        <ArrowLeft className="ms-1 h-4 w-4 transition group-hover:-translate-x-1 rtl:rotate-180" />
      </div>
    </div>
  )
}
