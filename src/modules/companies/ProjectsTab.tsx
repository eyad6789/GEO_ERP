import { useNavigate } from 'react-router-dom'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { ArabicTable, StatusBadge, type Column } from '../../components/shared'
import { formatCurrency, pickName } from '../../lib/format'
import { ProgressBar } from './ProgressBar'
import type { Project } from '../../types'

export function ProjectsTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { data, loading } = useResource<Project>('projects', { company_id: companyId })

  const columns: Column<Project>[] = [
    {
      key: 'code',
      header: t('companies.proj.code'),
      sortable: true,
      width: '110px',
      render: (p) => <span className="font-mono text-xs text-primary">{p.code}</span>,
    },
    {
      key: 'name',
      header: t('companies.proj.name'),
      accessor: (p) => pickName(p, lang),
      sortable: true,
      render: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">{pickName(p, lang)}</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-400">{p.client}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (p) => p.status,
      align: 'center',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: 'contract_value',
      header: t('companies.proj.contract_value'),
      accessor: (p) => p.contract_value,
      sortable: true,
      align: 'end',
      render: (p) => (
        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {formatCurrency(p.contract_value, p.currency, lang)}
        </span>
      ),
    },
    {
      key: 'progress',
      header: t('companies.proj.progress'),
      accessor: (p) => p.progress,
      sortable: true,
      width: '170px',
      render: (p) => <ProgressBar value={p.progress} />,
    },
  ]

  return (
    <ArabicTable<Project>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(p) => p.id}
      onRowClick={(p) => navigate(`/projects/${p.id}`)}
      searchPlaceholder={t('common.search')}
      exportName={`projects-${companyName}`}
      emptyTitle={t('companies.proj.empty')}
      emptyHint={t('companies.proj.empty_hint')}
    />
  )
}
