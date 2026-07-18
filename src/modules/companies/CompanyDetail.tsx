import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Building2,
  Info,
  Users,
  FolderKanban,
  Calculator,
  Warehouse,
  Archive,
  ChevronRight,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import { useRecord } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { Avatar, Spinner, Tabs, type TabItem } from '../../components/ui'
import { StatusBadge, NoteWidget, EmptyState } from '../../components/shared'
import { pickName } from '../../lib/format'
import type { Company } from '../../types'
import { InfoTab } from './InfoTab'
import { EmployeesTab } from './EmployeesTab'
import { ProjectsTab } from './ProjectsTab'
import { AccountingTab } from './AccountingTab'
import { WarehouseTab } from './WarehouseTab'
import { ArchiveTab } from './ArchiveTab'

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const { lang } = useLang()
  const { data: company, loading } = useRecord<Company>('companies', id)
  const [tab, setTab] = useState('info')

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!company || !id) {
    return (
      <div className="py-10">
        <EmptyState
          title={t('companies.not_found')}
          hint={t('companies.not_found_hint')}
          icon={<Building2 className="h-10 w-10" />}
          action={
            <Link
              to="/companies"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark"
            >
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t('companies.back_to_list')}
            </Link>
          }
        />
      </div>
    )
  }

  const companyName = pickName(company, lang)

  const tabs: TabItem[] = [
    { key: 'info', label: t('companies.tab.info'), icon: <Info className="h-4 w-4" /> },
    { key: 'employees', label: t('companies.tab.employees'), icon: <Users className="h-4 w-4" /> },
    { key: 'projects', label: t('companies.tab.projects'), icon: <FolderKanban className="h-4 w-4" /> },
    { key: 'accounting', label: t('companies.tab.accounting'), icon: <Calculator className="h-4 w-4" /> },
    { key: 'warehouse', label: t('companies.tab.warehouse'), icon: <Warehouse className="h-4 w-4" /> },
    { key: 'archive', label: t('companies.tab.archive'), icon: <Archive className="h-4 w-4" /> },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-400">
        <Link to="/companies" className="transition hover:text-primary">
          {t('companies.title')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="font-medium text-slate-600 dark:text-slate-300">{companyName}</span>
      </nav>

      {/* Header banner */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card">
        <div className="h-20 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent" style={{ borderBottom: `3px solid ${company.logo_color}` }} />
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5">
          <div className="-mt-9 flex items-end gap-4">
            <span className="rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-md">
              <Avatar name={companyName} color={company.logo_color} size="xl" />
            </span>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{companyName}</h1>
                <StatusBadge status={company.status} />
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {company.type === 'PARENT' ? t('companies.parent') : t('companies.subsidiary')}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-400">
                {lang === 'ar' ? company.name_en : company.name_ar}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-mono text-primary">{company.code}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.city}، {company.country}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1">
            <NoteWidget recordType="companies" recordId={id} moduleId="companies" />
            <Link
              to="/companies"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t('common.back')}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} variant="underline" className="mb-6" />

      {/* Tab content */}
      <div>
        {tab === 'info' && <InfoTab company={company} />}
        {tab === 'employees' && <EmployeesTab companyId={id} companyName={companyName} />}
        {tab === 'projects' && <ProjectsTab companyId={id} companyName={companyName} />}
        {tab === 'accounting' && <AccountingTab companyId={id} />}
        {tab === 'warehouse' && <WarehouseTab companyId={id} companyName={companyName} />}
        {tab === 'archive' && <ArchiveTab companyId={id} companyName={companyName} />}
      </div>
    </div>
  )
}
