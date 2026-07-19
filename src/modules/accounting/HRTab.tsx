import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ExternalLink, Wallet, HandCoins, CalendarDays } from 'lucide-react'
import { Input, SearchSelect, Badge, Dialog, Button } from '../../components/ui'
import { ArabicTable, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Advance, Attendance, Company, Employee, LeaveRequest, Payroll } from '../../types'
import { computeMonthStats } from '../hr/useHrStats'
import { currentMonthKey } from '../hr/hours'
import { typeLabel } from '../hr/LeavesBoard'

interface Row {
  id: string
  name: string
  company: string
  job_title: string
  salary: number
  advances_iqd: number
  advances_usd: number
  status: string
}

const STATUS_KEYS = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']

/** HR ↔ accounting bridge: the employees table (salary + open advances). Row
 *  click opens a per-employee view of advances (given / repaid / owed) plus
 *  leaves & attendance. */
export function HRTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const navigate = useNavigate()

  const { data: employees } = useResource<Employee>('employees')
  const { data: advances } = useResource<Advance>('advances')
  const { data: companies } = useResource<Company>('companies')

  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selEmp, setSelEmp] = useState<Employee | null>(null)

  const companyOptions = useMemo(
    () => [{ value: '', label: t('accounting.filter.all_companies') }, ...companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))],
    [companies, lang, t],
  )
  const statusOptions = useMemo(
    () => [{ value: '', label: t('accounting.hr.all_status') }, ...STATUS_KEYS.map((s) => ({ value: s, label: t(`accounting.hr.st.${s}`) }))],
    [t],
  )
  const companyName = (id: string) => {
    const c = companies.find((x) => x.id === id)
    return c ? pickName(c, lang) : '—'
  }

  // Outstanding HR advances per employee (balance_remaining of open advances).
  const advByEmployee = useMemo(() => {
    const m = new Map<string, { iqd: number; usd: number }>()
    for (const a of advances) {
      if (a.status === 'SETTLED') continue
      const cur = m.get(a.employee_id) ?? { iqd: 0, usd: 0 }
      if (a.currency === 'USD') cur.usd += a.balance_remaining ?? a.amount
      else cur.iqd += a.balance_remaining ?? a.amount
      m.set(a.employee_id, cur)
    }
    return m
  }, [advances])

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees
      .filter((e) => {
        const company = companyFilter || companyId
        if (company && e.company_id !== company) return false
        if (statusFilter && e.status !== statusFilter) return false
        if (!q) return true
        return [e.full_name_ar, e.full_name_en, e.job_title, e.employee_number].some((v) => (v || '').toLowerCase().includes(q))
      })
      .map((e) => {
        const adv = advByEmployee.get(e.id) ?? { iqd: 0, usd: 0 }
        return {
          id: e.id,
          name: lang === 'en' ? e.full_name_en || e.full_name_ar : e.full_name_ar,
          company: companyName(e.company_id),
          job_title: e.job_title,
          salary: e.basic_salary || 0,
          advances_iqd: adv.iqd,
          advances_usd: adv.usd,
          status: e.status,
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, advByEmployee, query, companyFilter, statusFilter, companyId, companies, lang])

  const dash = <span className="text-slate-300 dark:text-slate-600">—</span>
  const columns: Column<Row>[] = [
    { key: 'name', header: t('accounting.hr.employee'), sortable: true, accessor: (r) => r.name, render: (r) => <span className="font-medium text-slate-700 dark:text-slate-200">{r.name}</span> },
    { key: 'company', header: t('common.company'), accessor: (r) => r.company },
    { key: 'job_title', header: t('accounting.hr.job'), accessor: (r) => r.job_title || '' },
    {
      key: 'salary',
      header: t('accounting.hr.salary'),
      align: 'end',
      sortable: true,
      accessor: (r) => r.salary,
      render: (r) => (r.salary ? <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(r.salary, 'IQD', lang)}</span> : dash),
    },
    {
      key: 'advances',
      header: t('accounting.hr.open_advances'),
      align: 'end',
      sortable: true,
      accessor: (r) => r.advances_iqd,
      render: (r) =>
        r.advances_iqd || r.advances_usd ? (
          <span className="inline-flex flex-col items-end tabular-nums text-amber-700 dark:text-amber-300">
            {r.advances_iqd ? <span>{formatCurrency(r.advances_iqd, 'IQD', lang)}</span> : null}
            {r.advances_usd ? <span className="text-[11px]">{formatCurrency(r.advances_usd, 'USD', lang)}</span> : null}
          </span>
        ) : (
          dash
        ),
    },
    {
      key: 'status',
      header: t('accounting.hr.status'),
      render: (r) => <Badge color={r.status === 'ACTIVE' ? 'green' : 'gray'}>{t(`accounting.hr.st.${r.status}`) === `accounting.hr.st.${r.status}` ? r.status : t(`accounting.hr.st.${r.status}`)}</Badge>,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar: search (name / employee no.) + status + company + jump to HR */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('accounting.hr.search_ph')} className="h-10 ps-9" />
          </div>
          <div className="w-40 shrink-0">
            <SearchSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} placeholder={t('accounting.hr.all_status')} />
          </div>
          <div className="w-48 shrink-0">
            <SearchSelect value={companyFilter} onChange={setCompanyFilter} options={companyOptions} placeholder={t('accounting.filter.all_companies')} />
          </div>
          <Link
            to="/hr"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:border-primary hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('accounting.hr.open_hr')}
          </Link>
        </div>
      </div>

      <ArabicTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setSelEmp(employees.find((e) => e.id === r.id) ?? null)}
        searchable={false}
        exportName="hr_finance"
        emptyTitle={t('accounting.hr.empty')}
      />

      <EmployeeFinanceDialog
        employee={selEmp}
        onClose={() => setSelEmp(null)}
        onOpenFile={(id) => { setSelEmp(null); navigate(`/hr/employees/${id}`) }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-employee view: summary tiles (salary paid / advances given / repaid /
// still owed), an advances table, and a leaves & attendance section.
// ---------------------------------------------------------------------------
function EmployeeFinanceDialog({
  employee,
  onClose,
  onOpenFile,
}: {
  employee: Employee | null
  onClose: () => void
  onOpenFile: (id: string) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { data: payroll } = useApi<Payroll[]>(employee ? '/payroll' : null, employee ? { employee_id: employee.id } : undefined)
  const { data: advances } = useApi<Advance[]>(employee ? '/advances' : null, employee ? { employee_id: employee.id } : undefined)
  const { data: attendance } = useApi<Attendance[]>(employee ? '/attendance' : null, employee ? { employee_id: employee.id } : undefined)
  const { data: leaves } = useApi<LeaveRequest[]>(employee ? '/leave_requests' : null, employee ? { employee_id: employee.id } : undefined)

  const month = currentMonthKey()
  const stats = useMemo(() => computeMonthStats(attendance ?? [], leaves ?? [], month), [attendance, leaves, month])

  // Advances newest-first, each with amount / repaid / remaining.
  const advRows = useMemo(
    () =>
      (advances ?? [])
        .map((a) => {
          const amt = a.amount ?? 0
          const rem = a.status === 'SETTLED' ? 0 : a.balance_remaining ?? amt
          return { ...a, _amount: amt, _remaining: rem, _repaid: amt - rem }
        })
        .sort((x, y) => (y.date || '').localeCompare(x.date || '')),
    [advances],
  )
  const leaveRows = useMemo(
    () => (leaves ?? []).slice().sort((x, y) => (y.start_date || '').localeCompare(x.start_date || '')),
    [leaves],
  )

  const totals = useMemo(() => {
    let salaries = 0
    let advanced = 0
    let repaid = 0
    let owed = 0
    for (const p of payroll ?? []) salaries += p.net_salary ?? 0
    for (const a of advances ?? []) {
      const amt = a.amount ?? 0
      const rem = a.status === 'SETTLED' ? 0 : a.balance_remaining ?? amt
      advanced += amt
      repaid += amt - rem
      owed += rem
    }
    return { salaries, advanced, repaid, owed }
  }, [payroll, advances])

  const leaveDuration = (l: LeaveRequest) =>
    l.hours_count
      ? `${l.hours_count} ${t('accounting.hr.fin.unit_hours')}`
      : `${l.days_count || 0} ${t('accounting.hr.fin.unit_days')}`

  return (
    <Dialog
      open={!!employee}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          {t('accounting.hr.fin.title')} — {employee ? pickName(employee, lang) : ''}
        </span>
      }
      description={employee?.job_title}
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => employee && onOpenFile(employee.id)}>
            <ExternalLink className="h-4 w-4" />
            {t('accounting.hr.fin.open_file')}
          </Button>
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
        </div>
      }
    >
      {/* Summary tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile bg="bg-primary/5" fg="text-primary" value={formatCurrency(totals.salaries, 'IQD', lang)} label={t('accounting.hr.fin.total_salaries')} />
        <Tile bg="bg-amber-50 dark:bg-amber-500/15" fg="text-amber-700 dark:text-amber-300" value={formatCurrency(totals.advanced, 'IQD', lang)} label={t('accounting.hr.fin.total_advances')} />
        <Tile bg="bg-emerald-50 dark:bg-emerald-500/15" fg="text-emerald-700 dark:text-emerald-300" value={formatCurrency(totals.repaid, 'IQD', lang)} label={t('accounting.hr.fin.repaid')} />
        <Tile bg="bg-rose-50 dark:bg-rose-500/15" fg="text-rose-700 dark:text-rose-300" value={formatCurrency(totals.owed, 'IQD', lang)} label={t('accounting.hr.fin.open_advances')} />
      </div>

      {/* Advances table */}
      <SectionHeader icon={<HandCoins className="h-4 w-4" />} title={t('accounting.hr.fin.advances_title')} />
      {advRows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-400">{t('accounting.hr.fin.adv.empty')}</p>
      ) : (
        <div className="mb-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-start">{t('common.date')}</th>
                <th className="px-3 py-2 text-start">{t('accounting.hr.fin.adv.reason')}</th>
                <th className="px-3 py-2 text-end">{t('accounting.hr.fin.adv.amount')}</th>
                <th className="px-3 py-2 text-end">{t('accounting.hr.fin.adv.repaid')}</th>
                <th className="px-3 py-2 text-end">{t('accounting.hr.fin.adv.remaining')}</th>
                <th className="px-3 py-2 text-center">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {advRows.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatDate(a.date, lang)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{a.reason || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(a._amount, a.currency, lang)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums text-emerald-700 dark:text-emerald-300">{formatCurrency(a._repaid, a.currency, lang)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums text-rose-700 dark:text-rose-300">{formatCurrency(a._remaining, a.currency, lang)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge color={a.status === 'SETTLED' ? 'green' : a.status === 'PENDING' ? 'gray' : 'amber'}>
                      {t(`accounting.hr.fin.st.${a.status}`) === `accounting.hr.fin.st.${a.status}` ? a.status : t(`accounting.hr.fin.st.${a.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leaves & attendance */}
      <SectionHeader icon={<CalendarDays className="h-4 w-4" />} title={t('accounting.hr.fin.att_title')} />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat value={stats.presentDays} label={t('accounting.hr.fin.worked_days')} />
        <MiniStat value={stats.workedHours} label={t('accounting.hr.fin.worked_hours')} />
        <MiniStat value={stats.absentDays} label={t('accounting.hr.fin.absent_days')} />
        <MiniStat value={stats.leaveDaysTakenMonth} label={t('accounting.hr.fin.leave_days_month')} />
        <MiniStat value={stats.leaveDaysRemaining} label={t('accounting.hr.fin.leave_remaining')} />
        <MiniStat value={stats.hourlyRemaining} label={t('accounting.hr.fin.hourly_remaining')} />
      </div>
      {leaveRows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-400">{t('accounting.hr.fin.lv.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-start">{t('accounting.hr.fin.lv.type')}</th>
                <th className="px-3 py-2 text-start">{t('accounting.hr.fin.lv.period')}</th>
                <th className="px-3 py-2 text-center">{t('accounting.hr.fin.lv.days')}</th>
                <th className="px-3 py-2 text-start">{t('accounting.hr.fin.adv.reason')}</th>
                <th className="px-3 py-2 text-center">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leaveRows.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{typeLabel(l.type, t)}</td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatDate(l.start_date, lang)}{l.end_date && l.end_date !== l.start_date ? ` – ${formatDate(l.end_date, lang)}` : ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-center tabular-nums text-slate-600 dark:text-slate-300">{leaveDuration(l)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{l.reason || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge color={l.status === 'APPROVED' ? 'green' : l.status === 'REJECTED' ? 'red' : 'gray'}>
                      {t(`accounting.hr.fin.lv.st.${l.status}`) === `accounting.hr.fin.lv.st.${l.status}` ? l.status : t(`accounting.hr.fin.lv.st.${l.status}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  )
}

function Tile({ bg, fg, value, label }: { bg: string; fg: string; value: string; label: string }) {
  return (
    <div className={`rounded-xl ${bg} p-3 text-center`}>
      <p className={`text-base font-bold tabular-nums ${fg}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center">
      <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
      <span className="text-primary">{icon}</span>
      {title}
    </h3>
  )
}
