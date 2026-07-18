import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Banknote, HandCoins, Scale, Search, ExternalLink, Wallet } from 'lucide-react'
import { Input, SearchSelect, Badge, Dialog, Button } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, formatNumber, pickName } from '../../lib/format'
import type { Advance, Company, Employee, Payroll } from '../../types'
import { SUPPLIER_ROOTS, resolvePostingDescendants, type TrialBalanceResp } from './shared'

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

/** HR ↔ accounting bridge: salaries, outstanding staff advances (from HR) and
 *  the سلف المنتسبين balance (from the chart) side by side, per employee. */
export function HRTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const navigate = useNavigate()

  const { data: employees } = useResource<Employee>('employees')
  const { data: advances } = useResource<Advance>('advances')
  const { data: companies } = useResource<Company>('companies')
  const { data: accounts } = useResource<{ code: string; name_ar: string; name_en: string; is_posting: number }>('accounts')
  const { data: trial } = useApi<TrialBalanceResp>('/reports/trial-balance', companyId ? { company_id: companyId } : undefined)

  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  // Money journal per employee: every salary payment + advance, with details.
  const [selEmp, setSelEmp] = useState<Employee | null>(null)

  const companyOptions = useMemo(
    () => [{ value: '', label: t('accounting.filter.all_companies') }, ...companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))],
    [companies, lang, t],
  )
  const companyName = (id: string) => {
    const c = companies.find((x) => x.id === id)
    return c ? pickName(c, lang) : '—'
  }

  // Balance of the سلف المنتسبين subtree, straight from real postings.
  const staffAdvanceBalance = useMemo(() => {
    const codes = new Set(resolvePostingDescendants(SUPPLIER_ROOTS, accounts as never))
    let iqd = 0
    let usd = 0
    for (const r of trial?.rows ?? []) {
      if (!codes.has(r.code)) continue
      iqd += r.balance_iqd ?? r.balance
      usd += r.balance_usd ?? 0
    }
    return { iqd, usd }
  }, [accounts, trial])

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
  }, [employees, advByEmployee, query, companyFilter, companyId, companies, lang])

  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          salaries: a.salaries + (r.status === 'ACTIVE' ? r.salary : 0),
          adv_iqd: a.adv_iqd + r.advances_iqd,
          adv_usd: a.adv_usd + r.advances_usd,
          active: a.active + (r.status === 'ACTIVE' ? 1 : 0),
        }),
        { salaries: 0, adv_iqd: 0, adv_usd: 0, active: 0 },
      ),
    [rows],
  )

  const dash = <span className="text-slate-300">—</span>
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
      {/* HR-finance summary — live from HR records + the chart of accounts. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('accounting.hr.active_employees')} value={formatNumber(totals.active, lang)} icon={<Users className="h-5 w-5" />} accent="accent" />
        <KpiCard label={t('accounting.hr.monthly_salaries')} value={formatCurrency(totals.salaries, 'IQD', lang)} hint={t('accounting.hr.monthly_salaries_hint')} icon={<Banknote className="h-5 w-5" />} accent="primary" />
        <KpiCard
          label={t('accounting.hr.total_open_advances')}
          value={
            <span className="inline-flex flex-col">
              <span>{formatCurrency(totals.adv_iqd, 'IQD', lang)}</span>
              {totals.adv_usd ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{formatCurrency(totals.adv_usd, 'USD', lang)}</span> : null}
            </span>
          }
          hint={t('accounting.hr.total_open_advances_hint')}
          icon={<HandCoins className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label={t('accounting.hr.staff_advance_account')}
          value={
            <span className="inline-flex flex-col">
              <span>{formatCurrency(staffAdvanceBalance.iqd, 'IQD', lang)}</span>
              {staffAdvanceBalance.usd ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{formatCurrency(staffAdvanceBalance.usd, 'USD', lang)}</span> : null}
            </span>
          }
          hint={t('accounting.hr.staff_advance_account_hint')}
          icon={<Scale className="h-5 w-5" />}
          accent="info"
        />
      </div>

      {/* Toolbar: search + company filter + jump to the HR module */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('accounting.hr.search_ph')} className="h-10 ps-9" />
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
// Money journal for one employee: every salary payment and every advance,
// merged into one dated statement so the accountant sees exactly what was
// spent, when, and how it breaks down.
// ---------------------------------------------------------------------------
interface StatementRow {
  key: string
  date: string // sortable YYYY-MM(-DD)
  kind: 'SALARY' | 'ADVANCE'
  detail: string
  amount: number
  currency: 'IQD' | 'USD'
  status: string
}

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

  const rows: StatementRow[] = useMemo(() => {
    const out: StatementRow[] = []
    for (const p of payroll ?? []) {
      const allowances = (p.housing_allowance ?? 0) + (p.transport_allowance ?? 0) + (p.phone_allowance ?? 0) + (p.overtime ?? 0)
      const deductions = (p.deductions_absence ?? 0) + (p.deductions_advance ?? 0) + (p.other_deductions ?? 0)
      const parts = [
        `${t('accounting.hr.fin.basic')}: ${formatCurrency(p.basic_salary, p.currency, lang)}`,
        allowances ? `${t('accounting.hr.fin.allowances')}: +${formatCurrency(allowances, p.currency, lang)}` : null,
        deductions ? `${t('accounting.hr.fin.deductions')}: −${formatCurrency(deductions, p.currency, lang)}` : null,
        p.deductions_advance ? `(${t('accounting.hr.fin.advance_cut')}: ${formatCurrency(p.deductions_advance, p.currency, lang)})` : null,
      ].filter(Boolean)
      out.push({
        key: `p-${p.id}`,
        date: p.period,
        kind: 'SALARY',
        detail: parts.join(' · '),
        amount: p.net_salary,
        currency: (p.currency as 'IQD' | 'USD') || 'IQD',
        status: p.status || 'PAID',
      })
    }
    for (const a of advances ?? []) {
      const parts = [
        a.reason || null,
        a.monthly_deduction ? `${t('accounting.hr.fin.monthly_cut')}: ${formatCurrency(a.monthly_deduction, a.currency, lang)}` : null,
        `${t('accounting.hr.fin.remaining')}: ${formatCurrency(a.balance_remaining ?? a.amount, a.currency, lang)}`,
      ].filter(Boolean)
      out.push({
        key: `a-${a.id}`,
        date: a.date,
        kind: 'ADVANCE',
        detail: parts.join(' · '),
        amount: a.amount,
        currency: (a.currency as 'IQD' | 'USD') || 'IQD',
        status: a.status,
      })
    }
    return out.sort((x, y) => y.date.localeCompare(x.date))
  }, [payroll, advances, lang, t])

  const totals = useMemo(() => {
    let salaries = 0
    let advTotal = 0
    let advOpen = 0
    for (const p of payroll ?? []) salaries += p.net_salary ?? 0
    for (const a of advances ?? []) {
      advTotal += a.amount ?? 0
      if (a.status !== 'SETTLED') advOpen += a.balance_remaining ?? a.amount ?? 0
    }
    return { salaries, advTotal, advOpen }
  }, [payroll, advances])

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
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-primary/5 p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-primary">{formatCurrency(totals.salaries, 'IQD', lang)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('accounting.hr.fin.total_salaries')}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/15 p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatCurrency(totals.advTotal, 'IQD', lang)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('accounting.hr.fin.total_advances')}</p>
        </div>
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 p-3 text-center">
          <p className="text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300">{formatCurrency(totals.advOpen, 'IQD', lang)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('accounting.hr.fin.open_advances')}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-400">{t('accounting.hr.fin.empty')}</p>
      ) : (
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-start">{t('common.date')}</th>
                <th className="px-3 py-2 text-center">{t('accounting.hr.fin.kind')}</th>
                <th className="px-3 py-2 text-start">{t('accounting.hr.fin.detail')}</th>
                <th className="px-3 py-2 text-end">{t('accounting.hr.fin.amount')}</th>
                <th className="px-3 py-2 text-center">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {rows.map((r) => (
                <tr key={r.key} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">
                    {/^\d{4}-\d{2}$/.test(r.date) ? r.date : formatDate(r.date, lang)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.kind === 'SALARY' ? (
                      <Badge color="blue">{t('accounting.hr.fin.salary')}</Badge>
                    ) : (
                      <Badge color="amber">{t('accounting.hr.fin.advance')}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.detail}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(r.amount, r.currency, lang)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge color={r.kind === 'SALARY' || r.status === 'SETTLED' ? 'green' : r.status === 'PENDING' ? 'gray' : 'amber'}>
                      {t(`accounting.hr.fin.st.${r.status}`) === `accounting.hr.fin.st.${r.status}` ? r.status : t(`accounting.hr.fin.st.${r.status}`)}
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
