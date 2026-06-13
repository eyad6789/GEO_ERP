import { type ReactNode, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CalendarClock,
  HandCoins,
  IdCard,
  Star,
  User,
  Wallet,
} from 'lucide-react'
import {
  ArabicTable,
  Card,
  CardBody,
  CardHeader,
  NoteWidget,
  StatusBadge,
} from '@/components/shared'
import type { Column } from '@/components/shared'
import { Avatar, Spinner, Tabs } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import { useLang, useT } from '@/context/LangContext'
import { useRecord, useResource } from '@/hooks/useResource'
import { formatCurrency, formatDate, pickName } from '@/lib/format'
import type {
  Advance,
  Attendance,
  Company,
  Department,
  Employee,
  LeaveRequest,
  Payroll,
  PerformanceReview,
} from '@/types'
import { StarRating } from './lib'

type DetailTab = 'info' | 'attendance' | 'leaves' | 'payroll' | 'advances' | 'reviews'

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 last:border-0">
      <span className="shrink-0 text-sm text-slate-400">{label}</span>
      <span className="text-end text-sm font-medium text-slate-700">{value || '—'}</span>
    </div>
  )
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} icon={icon} />
      <CardBody className="py-2">{children}</CardBody>
    </Card>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const { lang } = useLang()
  const [tab, setTab] = useState<DetailTab>('info')

  const { data: emp, loading } = useRecord<Employee>('employees', id)
  const { data: company } = useRecord<Company>('companies', emp?.company_id)
  const { data: department } = useRecord<Department>(
    'departments',
    emp?.department_id ?? undefined,
  )
  const { data: manager } = useRecord<Employee>('employees', emp?.manager_id ?? undefined)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!id) return <Navigate to="/hr" replace />
  if (!emp) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>{t('hr.detail.not_found')}</p>
        <Link to="/hr" className="mt-3 inline-block text-primary hover:underline">
          {t('hr.detail.back')}
        </Link>
      </div>
    )
  }

  const tabs: TabItem[] = [
    { key: 'info', label: t('hr.detail.tab.info'), icon: <User className="h-4 w-4" /> },
    { key: 'attendance', label: t('hr.detail.tab.attendance'), icon: <CalendarCheck className="h-4 w-4" /> },
    { key: 'leaves', label: t('hr.detail.tab.leaves'), icon: <CalendarClock className="h-4 w-4" /> },
    { key: 'payroll', label: t('hr.detail.tab.payroll'), icon: <Wallet className="h-4 w-4" /> },
    { key: 'advances', label: t('hr.detail.tab.advances'), icon: <HandCoins className="h-4 w-4" /> },
    { key: 'reviews', label: t('hr.detail.tab.reviews'), icon: <Award className="h-4 w-4" /> },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/hr"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-primary"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        {t('hr.detail.back')}
      </Link>

      {/* Profile header */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar name={pickName(emp, lang)} color={emp.photo_color} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{pickName(emp, lang)}</h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="mt-1 text-primary">{emp.job_title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <IdCard className="h-4 w-4" />
                {emp.employee_number}
              </span>
              <span>{pickName(company, lang)}</span>
              {department && <span>· {pickName(department, lang)}</span>}
            </div>
          </div>
          <NoteWidget recordType="employee" recordId={emp.id} moduleId="hr" />
        </CardBody>
      </Card>

      <div className="mb-5">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as DetailTab)} variant="underline" />
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <InfoCard title={t('hr.info.identity')} icon={<User className="h-5 w-5" />}>
            <InfoRow label={t('hr.f.national_id')} value={emp.national_id} />
            <InfoRow label={t('hr.f.dob')} value={formatDate(emp.dob, lang)} />
            <InfoRow label={t('hr.f.place_of_birth')} value={emp.place_of_birth} />
            <InfoRow label={t('hr.f.nationality')} value={emp.nationality} />
            <InfoRow label={t('hr.f.religion')} value={emp.religion} />
            <InfoRow label={t('hr.f.gender')} value={t(`hr.gender.${emp.gender}`)} />
            <InfoRow label={t('hr.f.marital_status')} value={emp.marital_status} />
            <InfoRow label={t('hr.f.children_count')} value={emp.children_count} />
          </InfoCard>

          <InfoCard title={t('hr.info.contact')} icon={<IdCard className="h-5 w-5" />}>
            <InfoRow label={t('hr.f.phone_primary')} value={<span dir="ltr">{emp.phone_primary}</span>} />
            <InfoRow label={t('hr.f.phone_secondary')} value={<span dir="ltr">{emp.phone_secondary}</span>} />
            <InfoRow label={t('hr.f.email_work')} value={<span dir="ltr">{emp.email_work}</span>} />
            <InfoRow label={t('hr.f.email_personal')} value={<span dir="ltr">{emp.email_personal}</span>} />
            <InfoRow label={t('hr.f.address')} value={emp.address} />
            <InfoRow label={t('hr.f.emergency_name')} value={emp.emergency_name} />
            <InfoRow label={t('hr.f.emergency_phone')} value={<span dir="ltr">{emp.emergency_phone}</span>} />
          </InfoCard>

          <InfoCard title={t('hr.info.employment')} icon={<CalendarCheck className="h-5 w-5" />}>
            <InfoRow label={t('hr.f.company')} value={pickName(company, lang)} />
            <InfoRow label={t('hr.f.department')} value={department ? pickName(department, lang) : '—'} />
            <InfoRow label={t('hr.f.job_title')} value={emp.job_title} />
            <InfoRow label={t('hr.f.employment_type')} value={t(`hr.etype.${emp.employment_type}`)} />
            <InfoRow label={t('hr.f.hire_date')} value={formatDate(emp.hire_date, lang)} />
            <InfoRow label={t('hr.f.contract_end')} value={emp.contract_end_date ? formatDate(emp.contract_end_date, lang) : '—'} />
            <InfoRow label={t('hr.f.manager')} value={manager ? pickName(manager, lang) : '—'} />
            <InfoRow label={t('hr.f.status')} value={<StatusBadge status={emp.status} />} />
          </InfoCard>

          <InfoCard title={t('hr.info.financial')} icon={<Wallet className="h-5 w-5" />}>
            <InfoRow
              label={t('hr.f.basic_salary')}
              value={
                <span className="font-bold text-primary">{formatCurrency(emp.basic_salary, emp.salary_currency, lang)}</span>
              }
            />
            <InfoRow label={t('hr.f.salary_currency')} value={emp.salary_currency} />
            <InfoRow label={t('hr.f.bank_name')} value={emp.bank_name} />
            <InfoRow label={t('hr.f.bank_account')} value={<span dir="ltr">{emp.bank_account}</span>} />
            <InfoRow label={t('hr.f.iban')} value={<span dir="ltr">{emp.iban}</span>} />
          </InfoCard>
        </div>
      )}

      {tab === 'attendance' && <EmployeeAttendance employeeId={emp.id} />}
      {tab === 'leaves' && <EmployeeLeaves employeeId={emp.id} />}
      {tab === 'payroll' && <EmployeePayroll employeeId={emp.id} />}
      {tab === 'advances' && <EmployeeAdvances employeeId={emp.id} />}
      {tab === 'reviews' && <EmployeeReviews employeeId={emp.id} />}
    </div>
  )
}

// --- per-employee sub-tables ------------------------------------------------

function EmployeeAttendance({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Attendance>('attendance', {
    employee_id: employeeId,
    sort: 'date',
    order: 'DESC',
  })
  const columns: Column<Attendance>[] = [
    {
      key: 'date',
      header: t('common.date'),
      accessor: (a) => a.date,
      render: (a) => formatDate(a.date, lang),
      sortable: true,
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (a) => a.status,
      render: (a) => <StatusBadge status={a.status} />,
      align: 'center',
    },
    { key: 'check_in', header: t('hr.att.check_in'), render: (a) => a.check_in ?? '—', align: 'center' },
    { key: 'check_out', header: t('hr.att.check_out'), render: (a) => a.check_out ?? '—', align: 'center' },
    { key: 'notes', header: t('common.notes'), render: (a) => a.notes || '—' },
  ]
  return (
    <ArabicTable<Attendance>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(a) => a.id}
      exportName="employee_attendance"
      emptyTitle={t('hr.att.empty')}
    />
  )
}

function EmployeeLeaves({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<LeaveRequest>('leave_requests', { employee_id: employeeId })
  const columns: Column<LeaveRequest>[] = [
    { key: 'type', header: t('hr.leave.type'), sortable: true },
    {
      key: 'period',
      header: `${t('hr.leave.start')} – ${t('hr.leave.end')}`,
      accessor: (l) => l.start_date,
      render: (l) => (
        <span className="whitespace-nowrap tabular-nums text-slate-600">
          {formatDate(l.start_date, lang)} – {formatDate(l.end_date, lang)}
        </span>
      ),
    },
    {
      key: 'days_count',
      header: t('hr.leave.days'),
      render: (l) => <span className="tabular-nums">{l.days_count}</span>,
      align: 'center',
    },
    { key: 'reason', header: t('hr.leave.reason'), render: (l) => l.reason || '—' },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (l) => l.status,
      render: (l) => <StatusBadge status={l.status} />,
      align: 'center',
    },
  ]
  return (
    <ArabicTable<LeaveRequest>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(l) => l.id}
      exportName="employee_leaves"
      emptyTitle={t('hr.leave.empty')}
    />
  )
}

function EmployeePayroll({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Payroll>('payroll', {
    employee_id: employeeId,
    sort: 'period',
    order: 'DESC',
  })
  const allowances = (p: Payroll) =>
    (p.housing_allowance ?? 0) + (p.transport_allowance ?? 0) + (p.phone_allowance ?? 0) + (p.overtime ?? 0)
  const deductions = (p: Payroll) =>
    (p.deductions_absence ?? 0) + (p.deductions_advance ?? 0) + (p.other_deductions ?? 0)
  const columns: Column<Payroll>[] = [
    { key: 'period', header: t('hr.pay.period'), sortable: true, align: 'center' },
    {
      key: 'basic',
      header: t('hr.pay.basic'),
      accessor: (p) => p.basic_salary,
      render: (p) => <span className="tabular-nums">{formatCurrency(p.basic_salary, p.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'allowances',
      header: t('hr.pay.allowances'),
      accessor: (p) => allowances(p),
      render: (p) => <span className="tabular-nums text-success">+{formatCurrency(allowances(p), p.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'deductions',
      header: t('hr.pay.deductions'),
      accessor: (p) => deductions(p),
      render: (p) => <span className="tabular-nums text-danger">−{formatCurrency(deductions(p), p.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'net',
      header: t('hr.pay.net'),
      accessor: (p) => p.net_salary,
      render: (p) => <span className="tabular-nums font-bold text-primary">{formatCurrency(p.net_salary, p.currency, lang)}</span>,
      align: 'end',
      sortable: true,
    },
  ]
  return (
    <ArabicTable<Payroll>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(p) => p.id}
      exportName="employee_payroll"
      emptyTitle={t('hr.pay.empty')}
    />
  )
}

function EmployeeAdvances({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Advance>('advances', {
    employee_id: employeeId,
    sort: 'date',
    order: 'DESC',
  })
  const columns: Column<Advance>[] = [
    {
      key: 'date',
      header: t('common.date'),
      accessor: (a) => a.date,
      render: (a) => formatDate(a.date, lang),
      sortable: true,
    },
    {
      key: 'amount',
      header: t('hr.adv.amount'),
      accessor: (a) => a.amount,
      render: (a) => <span className="tabular-nums font-medium">{formatCurrency(a.amount, a.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'monthly_deduction',
      header: t('hr.adv.monthly'),
      accessor: (a) => a.monthly_deduction,
      render: (a) => <span className="tabular-nums">{formatCurrency(a.monthly_deduction, a.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'balance_remaining',
      header: t('hr.adv.balance'),
      accessor: (a) => a.balance_remaining,
      render: (a) => (
        <span className="tabular-nums font-semibold text-danger">
          {formatCurrency(a.balance_remaining, a.currency, lang)}
        </span>
      ),
      align: 'end',
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (a) => a.status,
      render: (a) => <StatusBadge status={a.status} />,
      align: 'center',
    },
  ]
  return (
    <ArabicTable<Advance>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(a) => a.id}
      exportName="employee_advances"
      emptyTitle={t('hr.adv.empty')}
    />
  )
}

function EmployeeReviews({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { data, loading } = useResource<PerformanceReview>('performance_reviews', { employee_id: employeeId })

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
  if (data.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="py-10 text-center text-sm text-slate-400">{t('hr.rev.empty')}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {data.map((r) => (
        <Card key={r.id}>
          <CardHeader
            title={r.period}
            icon={<Star className="h-5 w-5" />}
            action={<StarRating value={r.rating_overall} />}
          />
          <CardBody className="space-y-3">
            {r.manager_comments && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400">{t('hr.rev.comments')}</p>
                <p className="text-sm leading-relaxed text-slate-700">{r.manager_comments}</p>
              </div>
            )}
            {r.goals && (
              <div className="rounded-lg bg-primary/5 p-2.5">
                <p className="mb-1 text-xs font-medium text-primary">{t('hr.rev.goals')}</p>
                <p className="text-sm leading-relaxed text-slate-600">{r.goals}</p>
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
