import { useMemo } from 'react'
import { Users } from 'lucide-react'
import { ArabicTable, type Column } from '../../../components/shared/ArabicTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { Avatar } from '../../../components/ui/Avatar'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatDate, pickName } from '../../../lib/format'
import type { Employee, ProjectStaff } from '../../../types'

export function StaffTab({ projectId, companyId }: { projectId: string; companyId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: staff, loading } = useResource<ProjectStaff>('project_staff', { project_id: projectId })
  const { data: employees } = useResource<Employee>('employees', { company_id: companyId || undefined })

  const employeeById = useMemo(() => {
    const m = new Map<string, Employee>()
    employees.forEach((e) => m.set(e.id, e))
    return m
  }, [employees])

  const empName = (s: ProjectStaff) => pickName(employeeById.get(s.employee_id), lang)

  const columns: Column<ProjectStaff>[] = [
    {
      key: 'employee',
      header: t('projects.staff.employee'),
      accessor: (s) => empName(s),
      sortable: true,
      render: (s) => {
        const emp = employeeById.get(s.employee_id)
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={empName(s)} color={emp?.photo_color} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">{empName(s)}</p>
              {emp?.job_title && <p className="truncate text-xs text-slate-400 dark:text-slate-400">{emp.job_title}</p>}
            </div>
          </div>
        )
      },
    },
    { key: 'project_role', header: t('projects.staff.role'), sortable: true, render: (s) => <span className="text-slate-700 dark:text-slate-200">{s.project_role}</span> },
    { key: 'start_date', header: t('projects.field.start_date'), accessor: (s) => s.start_date, sortable: true, render: (s) => formatDate(s.start_date, lang) },
    { key: 'end_date', header: t('projects.field.end_date'), accessor: (s) => s.end_date ?? '', sortable: true, render: (s) => (s.end_date ? formatDate(s.end_date, lang) : <span className="text-slate-300">—</span>) },
    { key: 'status', header: t('common.status'), accessor: (s) => s.status, render: (s) => <StatusBadge status={s.status} /> },
  ]

  return (
    <Card>
      <CardHeader title={t('projects.staff.title')} icon={<Users className="h-4 w-4" />} subtitle={`${staff.length} ${t('common.count')}`} />
      <CardBody className="p-0">
        <ArabicTable
          columns={columns}
          data={staff}
          loading={loading}
          rowKey={(s) => s.id}
          searchPlaceholder={t('common.search')}
          exportName={`project-${projectId}-staff`}
          emptyTitle={t('projects.staff.empty')}
        />
      </CardBody>
    </Card>
  )
}
