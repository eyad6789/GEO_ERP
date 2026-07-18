import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { ArabicTable, StatusBadge, type Column } from '../../components/shared'
import { Avatar, Badge } from '../../components/ui'
import { formatDate, pickName } from '../../lib/format'
import type { Employee } from '../../types'

export function EmployeesTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Employee>('employees', { company_id: companyId })

  const columns: Column<Employee>[] = [
    {
      key: 'employee_number',
      header: t('companies.emp.number'),
      sortable: true,
      width: '120px',
      render: (e) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{e.employee_number}</span>,
    },
    {
      key: 'name',
      header: t('companies.emp.name'),
      accessor: (e) => pickName(e, lang),
      sortable: true,
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={pickName(e, lang)} color={e.photo_color} size="sm" />
          <span className="font-medium text-slate-700 dark:text-slate-200">{pickName(e, lang)}</span>
        </div>
      ),
    },
    {
      key: 'job_title',
      header: t('companies.emp.job_title'),
      accessor: (e) => e.job_title,
      sortable: true,
    },
    {
      key: 'employment_type',
      header: t('companies.emp.type'),
      accessor: (e) => e.employment_type,
      render: (e) => <Badge color="gray">{t(`companies.etype.${e.employment_type}`)}</Badge>,
    },
    {
      key: 'hire_date',
      header: t('companies.emp.hire_date'),
      accessor: (e) => e.hire_date,
      sortable: true,
      render: (e) => formatDate(e.hire_date, lang),
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (e) => e.status,
      align: 'center',
      render: (e) => <StatusBadge status={e.status} />,
    },
  ]

  return (
    <ArabicTable<Employee>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(e) => e.id}
      searchPlaceholder={t('common.search')}
      exportName={`employees-${companyName}`}
      emptyTitle={t('companies.emp.empty')}
      emptyHint={t('companies.emp.empty_hint')}
    />
  )
}
