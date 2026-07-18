import { useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, BookText, TrendingUp } from 'lucide-react'
import { ArabicTable, type Column } from '../../../components/shared/ArabicTable'
import { StatusBadge } from '../../../components/shared/StatusBadge'
import { KpiCard } from '../../../components/shared/KpiCard'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { useResource, useApi } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatCurrency, formatDate } from '../../../lib/format'
import type { JournalEntry } from '../../../types'

interface ProjectPnl {
  revenue: number
  expense: number
  net: number
}

export function AccountingTab({ projectId, currency }: { projectId: string; currency: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: entries, loading } = useResource<JournalEntry>('journal_entries', { project_id: projectId })
  const { data: pnl } = useApi<ProjectPnl>('/reports/project-pnl', { project_id: projectId })

  const totals = useMemo(() => {
    const debit = entries.reduce((s, e) => s + (e.total_debit || 0), 0)
    const credit = entries.reduce((s, e) => s + (e.total_credit || 0), 0)
    return { debit, credit }
  }, [entries])

  const columns: Column<JournalEntry>[] = [
    { key: 'serial_number', header: t('projects.acc.serial'), sortable: true, width: '120px', render: (e) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{e.serial_number}</span> },
    { key: 'doc_number', header: t('projects.acc.doc'), render: (e) => <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{e.doc_number}</span> },
    { key: 'date', header: t('common.date'), accessor: (e) => e.date, sortable: true, render: (e) => formatDate(e.date, lang) },
    { key: 'description', header: t('common.description'), render: (e) => <span className="text-slate-700 dark:text-slate-200">{e.description}</span> },
    { key: 'total_debit', header: t('projects.acc.debit'), accessor: (e) => e.total_debit, sortable: true, align: 'end', render: (e) => <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(e.total_debit, e.currency, lang)}</span> },
    { key: 'total_credit', header: t('projects.acc.credit'), accessor: (e) => e.total_credit, sortable: true, align: 'end', render: (e) => <span className="tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(e.total_credit, e.currency, lang)}</span> },
    { key: 'status', header: t('common.status'), accessor: (e) => e.status, render: (e) => <StatusBadge status={e.status} /> },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('projects.kpi.revenue')} value={formatCurrency(pnl?.revenue ?? 0, currency, lang)} icon={<ArrowUpRight className="h-5 w-5" />} accent="success" />
        <KpiCard label={t('projects.kpi.expense')} value={formatCurrency(pnl?.expense ?? 0, currency, lang)} icon={<ArrowDownRight className="h-5 w-5" />} accent="danger" />
        <KpiCard label={t('projects.kpi.net')} value={formatCurrency(pnl?.net ?? 0, currency, lang)} icon={<TrendingUp className="h-5 w-5" />} accent={(pnl?.net ?? 0) >= 0 ? 'primary' : 'warning'} />
      </div>

      <Card>
        <CardHeader
          title={t('projects.acc.title')}
          icon={<BookText className="h-4 w-4" />}
          subtitle={`${t('projects.acc.debit')}: ${formatCurrency(totals.debit, currency, lang)} · ${t('projects.acc.credit')}: ${formatCurrency(totals.credit, currency, lang)}`}
        />
        <CardBody className="p-0">
          <ArabicTable
            columns={columns}
            data={entries}
            loading={loading}
            rowKey={(e) => e.id}
            searchPlaceholder={t('common.search')}
            exportName={`project-${projectId}-journal`}
            emptyTitle={t('projects.acc.empty')}
          />
        </CardBody>
      </Card>
    </div>
  )
}
