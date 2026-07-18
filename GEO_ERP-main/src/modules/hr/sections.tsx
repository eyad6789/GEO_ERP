import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Fingerprint } from 'lucide-react'
import { ArabicTable, StatusBadge } from '@/components/shared'
import type { Column } from '@/components/shared'
import { Button, Dialog, useToast } from '@/components/ui'
import { useLang, useT } from '@/context/LangContext'
import { apiPost } from '@/lib/api'
import { formatDate, formatNumber, pickName } from '@/lib/format'
import type { Attendance, Company, Department, Employee } from '@/types'
import { EmployeeCell } from './lib'
import { inMonth, minutesToHours, workedMinutes } from './hours'

// ---------------------------------------------------------------------------
// 1. Departments
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

  // Click a department to open its people — the drill-down the manager asked for.
  const navigate = useNavigate()
  const [sel, setSel] = useState<Department | null>(null)
  const selEmployees = useMemo(
    () => (sel ? employees.filter((e) => e.department_id === sel.id) : []),
    [sel, employees],
  )

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: t('common.name'),
      accessor: (d) => pickName(d, lang),
      render: (d) => <span className="font-medium text-primary group-hover:underline">{pickName(d, lang)}</span>,
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
    <>
      <ArabicTable<Department>
        columns={columns}
        data={departments}
        loading={loading}
        rowKey={(d) => d.id}
        onRowClick={(d) => setSel(d)}
        exportName="departments"
        emptyTitle={t('hr.dept.empty')}
      />

      {/* Department drill-down: who works inside it, click-through to each file */}
      <Dialog
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? pickName(sel, lang) : ''}
        description={sel ? `${pickName(coMap.get(sel.company_id), lang)} · ${selEmployees.length} ${t('hr.dept.employees')}` : undefined}
      >
        {selEmployees.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t('hr.dept.no_employees')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {selEmployees.map((e) => (
              <li
                key={e.id}
                onClick={() => { setSel(null); navigate(`/hr/employees/${e.id}`) }}
                className="flex cursor-pointer items-center justify-between gap-3 px-2 py-2.5 transition hover:bg-primary/5"
              >
                <EmployeeCell employee={e} />
                <span className="flex items-center gap-3">
                  {e.job_title && <span className="text-xs text-slate-400">{e.job_title}</span>}
                  <StatusBadge status={e.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// 2. Attendance (month + employee filtered; worked hours from the fingerprint
//    check-in/out; import button feeds /api/hr/attendance-import)
// ---------------------------------------------------------------------------
export function AttendanceSection({
  empMap,
  attendance,
  loading,
  refetch,
  canManage,
  month,
  empFilter,
}: {
  empMap: Map<string, Employee>
  attendance: Attendance[]
  loading: boolean
  refetch: () => void
  canManage: boolean
  month: string
  empFilter: string
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()

  // Import a fingerprint-machine export (.xlsx / .csv): rows become PRESENT
  // days matched by employee number (or exact name), upserted per day.
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const handleImport = async (file: File) => {
    setImporting(true)
    try {
      const data64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(new Error('read failed'))
        r.readAsDataURL(file)
      })
      const res = await apiPost<{ imported: number; updated: number; unmatched_count: number; unmatched: string[] }>(
        '/hr/attendance-import',
        { file_name: file.name, data: data64 },
      )
      let msg = t('hr.att.import_done')
        .replace('{new}', formatNumber(res.imported, lang))
        .replace('{upd}', formatNumber(res.updated, lang))
      if (res.unmatched_count) msg += ` — ${t('hr.att.import_unmatched').replace('{n}', formatNumber(res.unmatched_count, lang))}`
      toast.success(msg)
      refetch()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Click any row to open that employee's full history: every day they came,
  // were absent, on leave, on mission — with counts.
  const [selEmp, setSelEmp] = useState<Employee | null>(null)

  const rows = useMemo(
    () => attendance.filter((a) => inMonth(a.date, month) && (!empFilter || a.employee_id === empFilter)),
    [attendance, month, empFilter],
  )

  // Per-status counts for the filtered month (chips above the table).
  const monthCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of rows) m.set(a.status, (m.get(a.status) ?? 0) + 1)
    return [...m.entries()]
  }, [rows])

  const history = useMemo(
    () => (selEmp ? attendance.filter((a) => a.employee_id === selEmp.id) : []),
    [selEmp, attendance],
  )
  const historyCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of history) m.set(a.status, (m.get(a.status) ?? 0) + 1)
    return [...m.entries()]
  }, [history])

  const hoursCell = (a: Attendance) => {
    const min = workedMinutes(a.check_in, a.check_out)
    return min > 0 ? formatNumber(minutesToHours(min), lang, 1) : '—'
  }

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
    {
      key: 'worked',
      header: t('hr.att.worked_hours'),
      accessor: (a) => workedMinutes(a.check_in, a.check_out),
      render: (a) => <span className="tabular-nums font-semibold text-primary">{hoursCell(a)}</span>,
      align: 'center',
      sortable: true,
    },
  ]

  return (
    <>
      {monthCounts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {monthCounts.map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <StatusBadge status={status} />
              <span className="tabular-nums">{formatNumber(count, lang)}</span> {t('hr.att.days')}
            </span>
          ))}
        </div>
      )}

      <ArabicTable<Attendance>
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(a) => a.id}
        onRowClick={(a) => setSelEmp(empMap.get(a.employee_id) ?? null)}
        exportName="attendance"
        emptyTitle={t('hr.att.empty')}
        emptyHint={t('hr.att.empty_hint')}
        toolbar={
          canManage ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImport(f) }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={importing}>
                <Fingerprint className="h-4 w-4" />
                {importing ? t('hr.att.importing') : t('hr.att.import_btn')}
              </Button>
            </>
          ) : undefined
        }
      />

      <Dialog
        open={!!selEmp}
        onClose={() => setSelEmp(null)}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {t('hr.att.history_title')} — {selEmp ? pickName(selEmp, lang) : ''}
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {historyCounts.map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <StatusBadge status={status} />
              <span className="tabular-nums">{formatNumber(count, lang)}</span> {t('hr.att.days')}
            </span>
          ))}
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start">{t('common.date')}</th>
                <th className="px-3 py-2 text-center">{t('common.status')}</th>
                <th className="px-3 py-2 text-center">{t('hr.att.check_in')}</th>
                <th className="px-3 py-2 text-center">{t('hr.att.check_out')}</th>
                <th className="px-3 py-2 text-center">{t('hr.att.worked_hours')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{formatDate(a.date, lang)}</td>
                  <td className="px-3 py-2 text-center"><StatusBadge status={a.status} /></td>
                  <td className="px-3 py-2 text-center tabular-nums">{a.check_in ?? '—'}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{a.check_out ?? '—'}</td>
                  <td className="px-3 py-2 text-center tabular-nums font-semibold text-primary">{hoursCell(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Dialog>
    </>
  )
}
