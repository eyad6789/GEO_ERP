import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, Star, UserPlus, Wallet, X } from 'lucide-react'
import {
  ArabicTable,
  Card,
  CardBody,
  CardHeader,
  FormDialog,
  KpiCard,
  OrgTree,
  StatusBadge,
  buildOrgTree,
} from '@/components/shared'
import type { Column } from '@/components/shared'
import { Button, useToast } from '@/components/ui'
import { useLang, useT } from '@/context/LangContext'
import { useResource } from '@/hooks/useResource'
import { formatCurrency, formatDate, pickName } from '@/lib/format'
import type {
  Advance,
  Attendance,
  Company,
  Department,
  Employee,
  Gift,
  LeaveRequest,
  Payroll,
  PerformanceReview,
} from '@/types'
import { EmployeeCell, StarRating } from './lib'

// ---------------------------------------------------------------------------
// 1. Employees list
// ---------------------------------------------------------------------------
export function EmployeesSection({
  companyId,
  employees,
  loading,
  refetch,
  deptMap,
  coMap,
  companies,
}: {
  companyId: string | null
  employees: Employee[]
  loading: boolean
  refetch: () => void
  deptMap: Map<string, Department>
  coMap: Map<string, Company>
  companies: Company[]
}) {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { create } = useResource<Employee>('employees')
  const [open, setOpen] = useState(false)

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: t('hr.emp.employee'),
      accessor: (e) => pickName(e, lang),
      render: (e) => <EmployeeCell employee={e} />,
      sortable: true,
    },
    { key: 'employee_number', header: t('hr.emp.number'), sortable: true },
    { key: 'job_title', header: t('hr.emp.job_title'), sortable: true },
    {
      key: 'department',
      header: t('hr.emp.department'),
      accessor: (e) => (e.department_id ? pickName(deptMap.get(e.department_id), lang) : ''),
      render: (e) => (e.department_id ? pickName(deptMap.get(e.department_id), lang) : '—'),
    },
    {
      key: 'company',
      header: t('common.company'),
      accessor: (e) => pickName(coMap.get(e.company_id), lang),
      render: (e) => pickName(coMap.get(e.company_id), lang),
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (e) => e.status,
      render: (e) => <StatusBadge status={e.status} />,
      align: 'center',
    },
  ]

  return (
    <>
      <ArabicTable<Employee>
        columns={columns}
        data={employees}
        loading={loading}
        rowKey={(e) => e.id}
        onRowClick={(e) => navigate(`/hr/employees/${e.id}`)}
        searchPlaceholder={t('hr.emp.search')}
        exportName="employees"
        emptyTitle={t('hr.emp.empty')}
        emptyHint={t('hr.emp.empty_hint')}
        toolbar={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
            {t('hr.emp.new')}
          </Button>
        }
      />

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('hr.emp.new')}
        size="lg"
        initial={{ company_id: companyId ?? '', status: 'ACTIVE', employment_type: 'FULL' }}
        fields={[
          { name: 'full_name_ar', label: t('hr.emp.full_name_ar'), required: true, dir: 'rtl' },
          { name: 'full_name_en', label: t('hr.emp.full_name_en'), dir: 'ltr' },
          { name: 'employee_number', label: t('hr.emp.number'), required: true },
          { name: 'national_id', label: t('hr.f.national_id'), dir: 'ltr' },
          { name: 'job_title', label: t('hr.emp.job_title'), required: true },
          { name: 'phone_primary', label: t('hr.f.phone_primary'), dir: 'ltr' },
          { name: 'address', label: t('hr.f.address'), colSpan: 2 },
          {
            name: 'company_id',
            label: t('common.company'),
            type: 'select',
            required: true,
            options: companies.map((c) => ({ value: c.id, label: pickName(c, lang) })),
          },
          { name: 'basic_salary', label: t('hr.emp.basic_salary'), type: 'number' },
          {
            name: 'employment_type',
            label: t('hr.emp.employment_type'),
            type: 'select',
            options: (['FULL', 'PART', 'CONTRACT', 'TEMP'] as const).map((v) => ({
              value: v,
              label: t(`hr.etype.${v}`),
            })),
          },
          {
            name: 'status',
            label: t('common.status'),
            type: 'select',
            options: (['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'] as const).map((v) => ({
              value: v,
              label: t(`status.${v}`),
            })),
          },
          { name: 'hire_date', label: t('hr.emp.hire_date'), type: 'date' },
        ]}
        onSubmit={async (values) => {
          await create(values as Partial<Employee>)
          refetch()
        }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// 2. Org chart
// ---------------------------------------------------------------------------
export function OrgSection({ employees, loading }: { employees: Employee[]; loading: boolean }) {
  const t = useT()
  const { lang } = useLang()
  const roots = useMemo(
    () =>
      buildOrgTree(employees, {
        id: (e) => e.id,
        parentId: (e) => e.manager_id,
        name: (e) => pickName(e, lang),
        title: (e) => e.job_title,
        color: (e) => e.photo_color,
      }),
    [employees, lang],
  )

  return (
    <Card>
      <CardHeader title={t('hr.tab.org')} icon={<Building2 className="h-5 w-5" />} />
      <CardBody className="overflow-x-auto">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
        ) : roots.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">{t('common.empty')}</p>
        ) : (
          <OrgTree roots={roots} />
        )}
      </CardBody>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// 3. Departments
// ---------------------------------------------------------------------------
export function DepartmentsSection({
  departments,
  loading,
  employees,
  empMap,
  coMap,
}: {
  departments: Department[]
  loading: boolean
  employees: Employee[]
  empMap: Map<string, Employee>
  coMap: Map<string, Company>
}) {
  const t = useT()
  const { lang } = useLang()

  const countByDept = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of employees) {
      if (e.department_id) m.set(e.department_id, (m.get(e.department_id) ?? 0) + 1)
    }
    return m
  }, [employees])

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: t('common.name'),
      accessor: (d) => pickName(d, lang),
      render: (d) => <span className="font-medium text-slate-800">{pickName(d, lang)}</span>,
      sortable: true,
    },
    {
      key: 'company',
      header: t('common.company'),
      accessor: (d) => pickName(coMap.get(d.company_id), lang),
      render: (d) => pickName(coMap.get(d.company_id), lang),
    },
    {
      key: 'manager',
      header: t('hr.dept.manager'),
      accessor: (d) => (d.manager_id ? pickName(empMap.get(d.manager_id), lang) : ''),
      render: (d) => (d.manager_id ? pickName(empMap.get(d.manager_id), lang) : '—'),
    },
    {
      key: 'employees',
      header: t('hr.dept.employees'),
      accessor: (d) => countByDept.get(d.id) ?? 0,
      render: (d) => <span className="tabular-nums font-semibold text-primary">{countByDept.get(d.id) ?? 0}</span>,
      align: 'center',
      sortable: true,
    },
  ]

  return (
    <ArabicTable<Department>
      columns={columns}
      data={departments}
      loading={loading}
      rowKey={(d) => d.id}
      exportName="departments"
      emptyTitle={t('hr.dept.empty')}
    />
  )
}

// ---------------------------------------------------------------------------
// 4. Attendance
// ---------------------------------------------------------------------------
export function AttendanceSection({
  companyId,
  empMap,
}: {
  companyId: string | null
  empMap: Map<string, Employee>
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Attendance>('attendance', { sort: 'date', order: 'DESC' })

  const rows = useMemo(() => {
    if (!companyId) return data
    return data.filter((a) => empMap.get(a.employee_id)?.company_id === companyId)
  }, [data, companyId, empMap])

  const columns: Column<Attendance>[] = [
    {
      key: 'employee',
      header: t('hr.emp.employee'),
      accessor: (a) => pickName(empMap.get(a.employee_id), lang),
      render: (a) => <EmployeeCell employee={empMap.get(a.employee_id)} />,
    },
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
  ]

  return (
    <ArabicTable<Attendance>
      columns={columns}
      data={rows}
      loading={loading}
      rowKey={(a) => a.id}
      exportName="attendance"
      emptyTitle={t('hr.att.empty')}
    />
  )
}

// ---------------------------------------------------------------------------
// 5. Leaves (with approve/reject actions)
// ---------------------------------------------------------------------------
export function LeavesSection({
  companyId,
  empMap,
}: {
  companyId: string | null
  empMap: Map<string, Employee>
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { data, loading, update } = useResource<LeaveRequest>('leave_requests')

  const rows = useMemo(() => {
    if (!companyId) return data
    return data.filter((l) => empMap.get(l.employee_id)?.company_id === companyId)
  }, [data, companyId, empMap])

  const setStatus = async (l: LeaveRequest, status: 'APPROVED' | 'REJECTED') => {
    try {
      await update(l.id, { status })
      toast.success(t(status === 'APPROVED' ? 'hr.leave.approved_toast' : 'hr.leave.rejected_toast'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: t('hr.emp.employee'),
      accessor: (l) => pickName(empMap.get(l.employee_id), lang),
      render: (l) => <EmployeeCell employee={empMap.get(l.employee_id)} />,
    },
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
      sortable: true,
    },
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
      data={rows}
      loading={loading}
      rowKey={(l) => l.id}
      exportName="leave_requests"
      emptyTitle={t('hr.leave.empty')}
      actions={(l) =>
        l.status === 'PENDING' ? (
          <>
            <Button size="sm" variant="subtle" onClick={() => setStatus(l, 'APPROVED')}>
              <Check className="h-4 w-4" />
              {t('hr.leave.approve')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus(l, 'REJECTED')}>
              <X className="h-4 w-4 text-danger" />
              {t('hr.leave.reject')}
            </Button>
          </>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )
      }
    />
  )
}

// ---------------------------------------------------------------------------
// 6. Gifts
// ---------------------------------------------------------------------------
export function GiftsSection({
  companyId,
  empMap,
}: {
  companyId: string | null
  empMap: Map<string, Employee>
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Gift>('gifts', { sort: 'date', order: 'DESC' })

  const rows = useMemo(() => {
    if (!companyId) return data
    return data.filter((g) => empMap.get(g.employee_id)?.company_id === companyId)
  }, [data, companyId, empMap])

  const columns: Column<Gift>[] = [
    {
      key: 'employee',
      header: t('hr.emp.employee'),
      accessor: (g) => pickName(empMap.get(g.employee_id), lang),
      render: (g) => <EmployeeCell employee={empMap.get(g.employee_id)} />,
    },
    {
      key: 'date',
      header: t('common.date'),
      accessor: (g) => g.date,
      render: (g) => formatDate(g.date, lang),
      sortable: true,
    },
    { key: 'occasion', header: t('hr.gift.occasion') },
    {
      key: 'type',
      header: t('hr.gift.type'),
      accessor: (g) => g.type,
      render: (g) => t(`hr.gift.${g.type}`),
      align: 'center',
    },
    {
      key: 'value',
      header: t('hr.gift.value'),
      accessor: (g) => g.value,
      render: (g) => (
        <span className="tabular-nums font-medium text-slate-700">{formatCurrency(g.value, g.currency, lang)}</span>
      ),
      align: 'end',
      sortable: true,
    },
  ]

  return (
    <ArabicTable<Gift>
      columns={columns}
      data={rows}
      loading={loading}
      rowKey={(g) => g.id}
      exportName="gifts"
      emptyTitle={t('hr.gift.empty')}
    />
  )
}

// ---------------------------------------------------------------------------
// 7. Payroll
// ---------------------------------------------------------------------------
export function PayrollSection({
  companyId,
  empMap,
}: {
  companyId: string | null
  empMap: Map<string, Employee>
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Payroll>('payroll', { sort: 'period', order: 'DESC' })

  const rows = useMemo(() => {
    if (!companyId) return data
    return data.filter((p) => empMap.get(p.employee_id)?.company_id === companyId)
  }, [data, companyId, empMap])

  const totalNet = useMemo(() => rows.reduce((s, p) => s + (p.net_salary ?? 0), 0), [rows])
  const allowances = (p: Payroll) =>
    (p.housing_allowance ?? 0) + (p.transport_allowance ?? 0) + (p.phone_allowance ?? 0) + (p.overtime ?? 0)
  const deductions = (p: Payroll) =>
    (p.deductions_absence ?? 0) + (p.deductions_advance ?? 0) + (p.other_deductions ?? 0)

  const columns: Column<Payroll>[] = [
    {
      key: 'employee',
      header: t('hr.emp.employee'),
      accessor: (p) => pickName(empMap.get(p.employee_id), lang),
      render: (p) => <EmployeeCell employee={empMap.get(p.employee_id)} />,
    },
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
      render: (p) => (
        <span className="tabular-nums text-success">+{formatCurrency(allowances(p), p.currency, lang)}</span>
      ),
      align: 'end',
    },
    {
      key: 'deductions',
      header: t('hr.pay.deductions'),
      accessor: (p) => deductions(p),
      render: (p) => (
        <span className="tabular-nums text-danger">−{formatCurrency(deductions(p), p.currency, lang)}</span>
      ),
      align: 'end',
    },
    {
      key: 'net',
      header: t('hr.pay.net'),
      accessor: (p) => p.net_salary,
      render: (p) => (
        <span className="tabular-nums font-bold text-primary">{formatCurrency(p.net_salary, p.currency, lang)}</span>
      ),
      align: 'end',
      sortable: true,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label={t('hr.pay.total_net')}
          value={formatCurrency(totalNet, 'IQD', lang)}
          icon={<Wallet className="h-5 w-5" />}
          accent="success"
          hint={`${rows.length} ${t('common.results')}`}
        />
      </div>
      <ArabicTable<Payroll>
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(p) => p.id}
        exportName="payroll"
        emptyTitle={t('hr.pay.empty')}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 8. Advances
// ---------------------------------------------------------------------------
export function AdvancesSection({
  companyId,
  empMap,
}: {
  companyId: string | null
  empMap: Map<string, Employee>
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Advance>('advances', { sort: 'date', order: 'DESC' })

  const rows = useMemo(() => {
    if (!companyId) return data
    return data.filter((a) => empMap.get(a.employee_id)?.company_id === companyId)
  }, [data, companyId, empMap])

  const columns: Column<Advance>[] = [
    {
      key: 'employee',
      header: t('hr.emp.employee'),
      accessor: (a) => pickName(empMap.get(a.employee_id), lang),
      render: (a) => <EmployeeCell employee={empMap.get(a.employee_id)} />,
    },
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
      sortable: true,
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
      data={rows}
      loading={loading}
      rowKey={(a) => a.id}
      exportName="advances"
      emptyTitle={t('hr.adv.empty')}
    />
  )
}

// ---------------------------------------------------------------------------
// 9. Performance reviews
// ---------------------------------------------------------------------------
export function ReviewsSection({
  companyId,
  empMap,
}: {
  companyId: string | null
  empMap: Map<string, Employee>
}) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<PerformanceReview>('performance_reviews')

  const rows = useMemo(() => {
    if (!companyId) return data
    return data.filter((r) => empMap.get(r.employee_id)?.company_id === companyId)
  }, [data, companyId, empMap])

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="py-10 text-center text-sm text-slate-400">{t('hr.rev.empty')}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => {
        const emp = empMap.get(r.employee_id)
        return (
          <Card key={r.id} className="transition hover:shadow-card-hover">
            <CardHeader
              title={pickName(emp, lang)}
              subtitle={emp?.job_title}
              icon={<Star className="h-5 w-5" />}
              action={<span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{r.period}</span>}
            />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{t('hr.rev.rating')}</span>
                <StarRating value={r.rating_overall} />
              </div>
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
        )
      })}
    </div>
  )
}
