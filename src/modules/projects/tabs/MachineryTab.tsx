import { useMemo } from 'react'
import { Truck } from 'lucide-react'
import { ArabicTable, type Column } from '../../../components/shared/ArabicTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatDate, formatNumber, pickName } from '../../../lib/format'
import type { Employee, ProjectMachinery } from '../../../types'

export function MachineryTab({ projectId, companyId }: { projectId: string; companyId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: machinery, loading } = useResource<ProjectMachinery>('project_machinery', { project_id: projectId })
  const { data: employees } = useResource<Employee>('employees', { company_id: companyId || undefined })

  const employeeById = useMemo(() => {
    const m = new Map<string, Employee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  const operatorName = (m: ProjectMachinery) =>
    (m.operator_id && pickName(employeeById.get(m.operator_id), lang)) || t('projects.field.unassigned')

  const columns: Column<ProjectMachinery>[] = [
    { key: 'code', header: t('common.code'), sortable: true, width: '110px', render: (m) => <span className="font-mono text-xs font-semibold text-primary">{m.code}</span> },
    { key: 'name', header: t('projects.mach.name'), accessor: (m) => m.name_ar, sortable: true, render: (m) => <span className="font-medium text-slate-800 dark:text-slate-100">{m.name_ar}</span> },
    { key: 'type', header: t('projects.mach.type'), sortable: true },
    { key: 'operator', header: t('projects.mach.operator'), accessor: (m) => operatorName(m), render: (m) => operatorName(m) },
    { key: 'assigned_date', header: t('projects.mach.assigned'), accessor: (m) => m.assigned_date, sortable: true, render: (m) => formatDate(m.assigned_date, lang) },
    { key: 'hours_worked', header: t('projects.mach.hours'), accessor: (m) => m.hours_worked, sortable: true, align: 'end', render: (m) => <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatNumber(m.hours_worked, lang)}</span> },
    { key: 'fuel_consumed', header: t('projects.mach.fuel'), accessor: (m) => m.fuel_consumed, sortable: true, align: 'end', render: (m) => <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatNumber(m.fuel_consumed, lang)}</span> },
    { key: 'status', header: t('common.status'), accessor: (m) => m.status, render: (m) => <StatusBadge status={m.status} /> },
  ]

  return (
    <Card>
      <CardHeader title={t('projects.mach.title')} icon={<Truck className="h-4 w-4" />} subtitle={`${machinery.length} ${t('common.count')}`} />
      <CardBody className="p-0">
        <ArabicTable
          columns={columns}
          data={machinery}
          loading={loading}
          rowKey={(m) => m.id}
          searchPlaceholder={t('common.search')}
          exportName={`project-${projectId}-machinery`}
          emptyTitle={t('common.empty')}
        />
      </CardBody>
    </Card>
  )
}
