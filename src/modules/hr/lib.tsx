import { useMemo } from 'react'
import { Avatar } from '@/components/ui'
import { useLang } from '@/context/LangContext'
import { pickName } from '@/lib/format'
import { useResource } from '@/hooks/useResource'
import type { Company, Department, Employee } from '@/types'

/** Map id -> record helper. */
export function indexBy<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const m = new Map<string, T>()
  for (const r of rows) m.set(key(r), r)
  return m
}

/** Shared lookups for HR sections: employees, departments, companies. */
export function useHrLookups(companyId: string | null) {
  const empParams = companyId ? { company_id: companyId } : undefined
  const { data: employees, loading: empLoading, refetch: refetchEmployees } = useResource<Employee>(
    'employees',
    empParams,
  )
  const { data: departments, loading: deptLoading } = useResource<Department>('departments')
  const { data: companies, loading: coLoading } = useResource<Company>('companies')

  const empMap = useMemo(() => indexBy(employees, (e) => e.id), [employees])
  const deptMap = useMemo(() => indexBy(departments, (d) => d.id), [departments])
  const coMap = useMemo(() => indexBy(companies, (c) => c.id), [companies])

  return {
    employees,
    departments,
    companies,
    empMap,
    deptMap,
    coMap,
    refetchEmployees,
    loading: empLoading || deptLoading || coLoading,
  }
}

/** Avatar + name cell for an employee, resolved by id. */
export function EmployeeCell({ employee }: { employee?: Employee }) {
  const { lang } = useLang()
  if (!employee) return <span className="text-slate-400">—</span>
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={pickName(employee, lang)} color={employee.photo_color} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{pickName(employee, lang)}</p>
        <p className="truncate text-xs text-slate-400">{employee.job_title}</p>
      </div>
    </div>
  )
}

/** Compact star rating for performance reviews (0..5). */
export function StarRating({ value }: { value: number }) {
  const full = Math.round(value)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-accent" aria-hidden>
        {'★'.repeat(Math.min(5, Math.max(0, full)))}
        <span className="text-slate-200">{'★'.repeat(Math.max(0, 5 - full))}</span>
      </span>
      <span className="text-xs font-semibold text-slate-600 tabular-nums">{value.toFixed(1)}</span>
    </span>
  )
}
