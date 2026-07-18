import { Paperclip } from 'lucide-react'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { ArabicTable, type Column } from '../../components/shared'
import { Badge } from '../../components/ui'
import { formatDate } from '../../lib/format'
import type { ArchiveDocument, ArchiveDocType } from '../../types'

const DOC_COLOR: Record<ArchiveDocType, 'blue' | 'sky' | 'amber' | 'green' | 'purple' | 'gray'> = {
  CV: 'blue',
  MESSAGE: 'sky',
  EMAIL_EXT: 'amber',
  EMAIL_INT: 'green',
  NEWS: 'purple',
  FINANCIAL: 'gray',
}

export function ArchiveTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<ArchiveDocument>('archive_documents', { company_id: companyId })

  const columns: Column<ArchiveDocument>[] = [
    {
      key: 'ref_number',
      header: t('companies.arc.ref'),
      sortable: true,
      width: '120px',
      render: (d) => <span className="font-mono text-xs text-slate-500">{d.ref_number}</span>,
    },
    {
      key: 'date',
      header: t('common.date'),
      accessor: (d) => d.date,
      sortable: true,
      render: (d) => formatDate(d.date, lang),
    },
    {
      key: 'doc_type',
      header: t('companies.arc.doc_type'),
      accessor: (d) => d.doc_type,
      align: 'center',
      render: (d) => <Badge color={DOC_COLOR[d.doc_type] ?? 'gray'}>{t(`companies.dtype.${d.doc_type}`)}</Badge>,
    },
    {
      key: 'title',
      header: t('companies.arc.title'),
      accessor: (d) => d.title,
      sortable: true,
      render: (d) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-700">{d.title}</p>
          {d.subject && <p className="truncate text-xs text-slate-400">{d.subject}</p>}
        </div>
      ),
    },
    {
      key: 'from_party',
      header: t('companies.arc.from'),
      accessor: (d) => d.from_party,
    },
    {
      key: 'attachments_count',
      header: t('companies.arc.attachments'),
      accessor: (d) => d.attachments_count,
      align: 'center',
      width: '110px',
      render: (d) =>
        d.attachments_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            <Paperclip className="h-3.5 w-3.5" />
            {d.attachments_count}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ]

  return (
    <ArabicTable<ArchiveDocument>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(d) => d.id}
      searchPlaceholder={t('common.search')}
      exportName={`archive-${companyName}`}
      emptyTitle={t('companies.arc.empty')}
      emptyHint={t('companies.arc.empty_hint')}
    />
  )
}
