import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CalendarClock, ClipboardList, Clock, Layers, Users } from 'lucide-react'
import { KpiCard, PageHeader } from '@/components/shared'
import { Badge, SearchSelect, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import { useCompany } from '@/context/CompanyContext'
import { useLang, useT } from '@/context/LangContext'
import { useApi, useResource } from '@/hooks/useResource'
import { formatCompact, formatNumber, pickName } from '@/lib/format'
import type { Attendance, EmployeeDoc, LeaveRequest } from '@/types'
import { useHrLookups } from './lib'
import { AttendanceSection, DepartmentsSection } from './sections'
import { EmployeeCardsSection } from './EmployeeCards'
import { FollowUpSection } from './FollowUpSection'
import { LeavesBoard } from './LeavesBoard'
import { MonthPicker, monthLabel } from './MonthPicker'
import { currentMonthKey, minutesToHours, todayKey } from './hours'
import { leaveBucket } from './policy'
import { useHrStats } from './useHrStats'

type TabKey = 'employees' | 'followup' | 'departments' | 'attendance' | 'leaves'

export default function HrShell() {
  const t = useT()
  const { lang } = useLang()
  const { companyId, role } = useCompany()
  const [tab, setTab] = useState<TabKey>('employees')

  // HR management actions (add employee, decide leaves, import attendance).
  const isHR = role.key === 'hr_manager'

  const { employees, departments, companies, empMap, deptMap, coMap, refetchEmployees, loading } =
    useHrLookups(companyId)

  // The shell owns attendance + leaves so the KPI strip, cards, leaderboards
  // and the boards all read (and refetch) the same data.
  const { data: attendanceAll, loading: attLoading, refetch: refetchAtt } = useResource<Attendance>('attendance', {
    sort: 'date',
    order: 'DESC',
  })
  const { data: leavesAll, loading: lvLoading, refetch: refetchLeaves } = useResource<LeaveRequest>('leave_requests')
  const { data: allDocs } = useApi<EmployeeDoc[]>('/employee-documents')

  // Month + employee filter — shared across every tab.
  const [month, setMonth] = useState(currentMonthKey())
  const [empFilter, setEmpFilter] = useState('')
  // A company switch reloads the employee list — a leftover id from the old
  // company would silently filter every tab down to nothing.
  useEffect(() => setEmpFilter(''), [companyId])

  const attendance = useMemo(
    () => (companyId ? attendanceAll.filter((a) => empMap.get(a.employee_id)?.company_id === companyId) : attendanceAll),
    [attendanceAll, companyId, empMap],
  )
  const leaves = useMemo(
    () => (companyId ? leavesAll.filter((l) => empMap.get(l.employee_id)?.company_id === companyId) : leavesAll),
    [leavesAll, companyId, empMap],
  )

  // Newest PHOTO document per employee (list arrives created_at DESC).
  const photoMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of allDocs ?? []) {
      if (d.doc_type === 'PHOTO' && d.employee_id && !m.has(d.employee_id)) m.set(d.employee_id, d.id)
    }
    return m
  }, [allDocs])

  const stats = useHrStats(attendance, leaves, month)

  // ---- KPI strip -----------------------------------------------------------
  const today = todayKey()
  const presentToday = useMemo(() => {
    const ids = new Set<string>()
    for (const a of attendance) if (a.date === today && a.status === 'PRESENT') ids.add(a.employee_id)
    return ids.size
  }, [attendance, today])

  const openLeaves = useMemo(() => {
    let pending = 0
    let inquiry = 0
    for (const l of leaves) {
      if (empFilter && l.employee_id !== empFilter) continue
      const b = leaveBucket(l)
      if (b === 'PENDING') pending++
      else if (b === 'INQUIRY') inquiry++
    }
    return { total: pending + inquiry, inquiry }
  }, [leaves, empFilter])

  const monthHours = useMemo(() => {
    // Sum raw minutes and convert once — adding per-employee rounded hours
    // accumulates up to 3 minutes of error per person.
    let sum = 0
    for (const [id, s] of stats) {
      if (empFilter && id !== empFilter) continue
      sum += s.workedMinutes
    }
    return minutesToHours(sum)
  }, [stats, empFilter])

  const tabs: TabItem[] = [
    { key: 'employees', label: t('hr.tab.employees'), icon: <Users className="h-4 w-4" /> },
    { key: 'followup', label: t('hr.tab.followup'), icon: <ClipboardList className="h-4 w-4" /> },
    { key: 'departments', label: t('hr.tab.departments'), icon: <Layers className="h-4 w-4" /> },
    { key: 'attendance', label: t('hr.tab.attendance'), icon: <CalendarCheck className="h-4 w-4" /> },
    {
      key: 'leaves',
      label: t('hr.tab.leaves'),
      icon: <CalendarClock className="h-4 w-4" />,
      badge: openLeaves.total > 0 ? <Badge color="amber">{formatNumber(openLeaves.total, lang)}</Badge> : undefined,
    },
  ]

  return (
    <div>
      <PageHeader title={t('hr.title')} subtitle={t('hr.subtitle')} icon={<Users className="h-6 w-6" />} />

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('hr.kpi.employees')}
          value={loading ? '…' : formatCompact(employees.length, lang)}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('hr.kpi.present_today')}
          value={attLoading ? '…' : formatCompact(presentToday, lang)}
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="success"
          hint={t('hr.kpi.of_total').replace('{n}', formatNumber(employees.length, lang))}
        />
        <KpiCard
          label={t('hr.kpi.pending_requests')}
          value={lvLoading ? '…' : formatCompact(openLeaves.total, lang)}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="warning"
          hint={openLeaves.inquiry > 0 ? t('hr.kpi.inquiries_hint').replace('{n}', formatNumber(openLeaves.inquiry, lang)) : undefined}
        />
        <KpiCard
          label={t('hr.kpi.worked_hours')}
          value={attLoading ? '…' : formatNumber(monthHours, lang, 1)}
          icon={<Clock className="h-5 w-5" />}
          accent="info"
          hint={monthLabel(month, lang === 'en' ? 'en' : 'ar')}
        />
      </div>

      {/* Month + employee filters (stats-bearing tabs only) */}
      {tab !== 'departments' && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <MonthPicker value={month} onChange={setMonth} />
          <div className="ms-auto w-full sm:w-64">
            <SearchSelect
              value={empFilter}
              onChange={setEmpFilter}
              options={[
                { value: '', label: t('hr.filter.all_employees') },
                ...employees.map((e) => ({ value: e.id, label: pickName(e, lang) })),
              ]}
              placeholder={t('hr.filter.employee')}
            />
          </div>
        </div>
      )}

      <div className="mb-5 overflow-x-auto">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as TabKey)} variant="pills" />
      </div>

      <div>
        {tab === 'employees' && (
          <EmployeeCardsSection
            companyId={companyId}
            employees={employees}
            loading={loading}
            refetch={refetchEmployees}
            deptMap={deptMap}
            companies={companies}
            canManage={isHR}
            month={month}
            empFilter={empFilter}
            stats={stats}
            photoMap={photoMap}
          />
        )}
        {tab === 'followup' && (
          <FollowUpSection
            employees={employees}
            stats={stats}
            month={month}
            empFilter={empFilter}
            loading={loading || attLoading || lvLoading}
          />
        )}
        {tab === 'departments' && (
          <DepartmentsSection
            departments={companyId ? departments.filter((d) => d.company_id === companyId) : departments}
            loading={loading}
            employees={employees}
            empMap={empMap}
            coMap={coMap}
          />
        )}
        {tab === 'attendance' && (
          <AttendanceSection
            empMap={empMap}
            attendance={attendance}
            loading={attLoading}
            refetch={refetchAtt}
            canManage={isHR}
            month={month}
            empFilter={empFilter}
          />
        )}
        {tab === 'leaves' && (
          <LeavesBoard
            employees={employees}
            empMap={empMap}
            leaves={leaves}
            loading={lvLoading}
            refetch={refetchLeaves}
            canManage={isHR}
            month={month}
            empFilter={empFilter}
          />
        )}
      </div>
    </div>
  )
}
