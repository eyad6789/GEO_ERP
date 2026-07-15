// المتابعة — the owner's per-employee tracking table: every person's month at
// a glance (present / absent / leave days, worked hours, remaining balances).
// Respects the shell's month + employee filters; rows open the employee file.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArabicTable } from '../../components/shared'
import type { Column } from '../../components/shared'
import { useLang, useT } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import type { Employee } from '../../types'
import { EmployeeCell } from './lib'
import { emptyStats, type MonthStats } from './useHrStats'

interface Row {
  emp: Employee
  s: MonthStats
}

export function FollowUpSection({
  employees,
  stats,
  month,
  empFilter,
  loading,
}: {
  employees: Employee[]
  stats: Map<string, MonthStats>
  month: string
  empFilter: string
  loading: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const zero = useMemo(() => emptyStats(month), [month])

  const rows = useMemo<Row[]>(
    () =>
      employees
        .filter((e) => !empFilter || e.id === empFilter)
        .slice()
        .sort((a, b) => (Number(a.employee_number) || 999) - (Number(b.employee_number) || 999))
        .map((emp) => ({ emp, s: stats.get(emp.id) ?? zero })),
    [employees, empFilter, stats, zero],
  )

  const num = (v: number, dec = 0) => <span className="tabular-nums font-semibold">{formatNumber(v, lang, dec)}</span>

  const columns: Column<Row>[] = [
    {
      key: 'employee',
      header: t('hr.emp.employee'),
      accessor: (r) => pickName(r.emp, lang),
      render: (r) => <EmployeeCell employee={r.emp} />,
      sortable: true,
    },
    {
      key: 'present',
      header: t('hr.fu.present'),
      accessor: (r) => r.s.presentDays,
      render: (r) => <span className="tabular-nums font-semibold text-emerald-600">{formatNumber(r.s.presentDays, lang)}</span>,
      align: 'center',
      sortable: true,
    },
    {
      key: 'absent',
      header: t('hr.fu.absent'),
      accessor: (r) => r.s.absentDays,
      render: (r) =>
        r.s.absentDays > 0 ? (
          <span className="tabular-nums font-semibold text-danger">{formatNumber(r.s.absentDays, lang)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
      align: 'center',
      sortable: true,
    },
    {
      key: 'leave',
      header: t('hr.fu.leave'),
      accessor: (r) => r.s.leaveDays,
      render: (r) =>
        r.s.leaveDays > 0 ? (
          <span className="tabular-nums font-semibold text-amber-600">{formatNumber(r.s.leaveDays, lang)}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
      align: 'center',
      sortable: true,
    },
    {
      key: 'worked',
      header: t('hr.att.worked_hours'),
      accessor: (r) => r.s.workedHours,
      render: (r) => <span className="tabular-nums font-bold text-primary">{formatNumber(r.s.workedHours, lang, 1)}</span>,
      align: 'center',
      sortable: true,
    },
    {
      key: 'hours_left',
      header: t('hr.card.hours_left'),
      accessor: (r) => r.s.hoursRemaining,
      render: (r) => num(r.s.hoursRemaining, 1),
      align: 'center',
      sortable: true,
    },
    {
      key: 'leave_left',
      header: t('hr.card.leave_left'),
      accessor: (r) => r.s.leaveDaysRemaining,
      render: (r) => (
        <span className="tabular-nums">
          <span className={r.s.leaveDaysRemaining > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-danger'}>
            {formatNumber(r.s.leaveDaysRemaining, lang)}
          </span>
          <span className="text-xs text-slate-400"> / {formatNumber(r.s.leaveDaysEntitled, lang)}</span>
        </span>
      ),
      align: 'center',
      sortable: true,
    },
    {
      key: 'hourly_left',
      header: t('hr.card.hourly_left'),
      accessor: (r) => r.s.hourlyRemaining,
      render: (r) => (
        <span className="tabular-nums">
          <span className="font-semibold text-slate-700">{formatNumber(r.s.hourlyRemaining, lang, 1)}</span>
          <span className="text-xs text-slate-400"> / {formatNumber(r.s.hourlyAllowance, lang)}</span>
        </span>
      ),
      align: 'center',
      sortable: true,
    },
  ]

  return (
    <ArabicTable<Row>
      columns={columns}
      data={rows}
      loading={loading}
      rowKey={(r) => r.emp.id}
      onRowClick={(r) => navigate(`/hr/employees/${r.emp.id}`)}
      searchPlaceholder={t('hr.emp.search')}
      exportName="hr-followup"
      emptyTitle={t('hr.fu.empty')}
    />
  )
}
