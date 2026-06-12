import { useMemo, useState } from 'react'
import {
  Award,
  CalendarCheck,
  CalendarClock,
  Gift as GiftIcon,
  HandCoins,
  Layers,
  Network,
  Users,
  Wallet,
} from 'lucide-react'
import { KpiCard, PageHeader } from '@/components/shared'
import { Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import { useCompany } from '@/context/CompanyContext'
import { useLang, useT } from '@/context/LangContext'
import { formatCompact } from '@/lib/format'
import { useHrLookups } from './lib'
import {
  AdvancesSection,
  AttendanceSection,
  DepartmentsSection,
  EmployeesSection,
  GiftsSection,
  LeavesSection,
  OrgSection,
  PayrollSection,
  ReviewsSection,
} from './sections'

type TabKey =
  | 'employees'
  | 'org'
  | 'departments'
  | 'attendance'
  | 'leaves'
  | 'gifts'
  | 'payroll'
  | 'advances'
  | 'reviews'

export default function HrShell() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const [tab, setTab] = useState<TabKey>('employees')

  const { employees, departments, companies, empMap, deptMap, coMap, refetchEmployees, loading } =
    useHrLookups(companyId)

  const activeCount = useMemo(() => employees.filter((e) => e.status === 'ACTIVE').length, [employees])
  const deptCount = useMemo(() => {
    if (!companyId) return departments.length
    return departments.filter((d) => d.company_id === companyId).length
  }, [departments, companyId])

  const tabs: TabItem[] = [
    { key: 'employees', label: t('hr.tab.employees'), icon: <Users className="h-4 w-4" /> },
    { key: 'org', label: t('hr.tab.org'), icon: <Network className="h-4 w-4" /> },
    { key: 'departments', label: t('hr.tab.departments'), icon: <Layers className="h-4 w-4" /> },
    { key: 'attendance', label: t('hr.tab.attendance'), icon: <CalendarCheck className="h-4 w-4" /> },
    { key: 'leaves', label: t('hr.tab.leaves'), icon: <CalendarClock className="h-4 w-4" /> },
    { key: 'gifts', label: t('hr.tab.gifts'), icon: <GiftIcon className="h-4 w-4" /> },
    { key: 'payroll', label: t('hr.tab.payroll'), icon: <Wallet className="h-4 w-4" /> },
    { key: 'advances', label: t('hr.tab.advances'), icon: <HandCoins className="h-4 w-4" /> },
    { key: 'reviews', label: t('hr.tab.reviews'), icon: <Award className="h-4 w-4" /> },
  ]

  return (
    <div>
      <PageHeader title={t('hr.title')} subtitle={t('hr.subtitle')} icon={<Users className="h-6 w-6" />} />

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label={t('hr.kpi.employees')}
          value={loading ? '…' : formatCompact(employees.length, lang)}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('hr.kpi.active')}
          value={loading ? '…' : formatCompact(activeCount, lang)}
          icon={<Award className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label={t('hr.kpi.departments')}
          value={loading ? '…' : formatCompact(deptCount, lang)}
          icon={<Layers className="h-5 w-5" />}
          accent="info"
        />
      </div>

      <div className="mb-5 overflow-x-auto">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as TabKey)} variant="pills" />
      </div>

      <div>
        {tab === 'employees' && (
          <EmployeesSection
            companyId={companyId}
            employees={employees}
            loading={loading}
            refetch={refetchEmployees}
            deptMap={deptMap}
            coMap={coMap}
            companies={companies}
          />
        )}
        {tab === 'org' && <OrgSection employees={employees} loading={loading} />}
        {tab === 'departments' && (
          <DepartmentsSection
            departments={
              companyId ? departments.filter((d) => d.company_id === companyId) : departments
            }
            loading={loading}
            employees={employees}
            empMap={empMap}
            coMap={coMap}
          />
        )}
        {tab === 'attendance' && <AttendanceSection companyId={companyId} empMap={empMap} />}
        {tab === 'leaves' && <LeavesSection companyId={companyId} empMap={empMap} />}
        {tab === 'gifts' && <GiftsSection companyId={companyId} empMap={empMap} />}
        {tab === 'payroll' && <PayrollSection companyId={companyId} empMap={empMap} />}
        {tab === 'advances' && <AdvancesSection companyId={companyId} empMap={empMap} />}
        {tab === 'reviews' && <ReviewsSection companyId={companyId} empMap={empMap} />}
      </div>
    </div>
  )
}
