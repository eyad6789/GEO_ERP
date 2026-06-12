import { useMemo, useState } from 'react'
import { Archive, FileText, Paperclip, Banknote, Clock, Plus, Search } from 'lucide-react'
import {
  PageHeader,
  KpiCard,
  ArabicTable,
  FormDialog,
  type Column,
  type FormFieldConfig,
} from '../../components/shared'
import { Tabs, Select, Badge, Button } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { apiPost } from '../../lib/api'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, formatNumber, pickName } from '../../lib/format'
import type { ArchiveDocument, ArchiveDocType, Company } from '../../types'
import { DOC_TYPES, docTypeIcon, docStatusColor } from './helpers'
import { DocumentDialog } from './DocumentDialog'
import { NewsGrid } from './NewsGrid'

export function ArchivePage() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()

  const [activeType, setActiveType] = useState<ArchiveDocType>('CV')
  const [query, setQuery] = useState('')
  // local company filter overrides the global one (defaults to global)
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [selected, setSelected] = useState<ArchiveDocument | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  // global company filter takes priority unless a local one is set
  const effectiveCompany = companyFilter || companyId || ''

  // Companies for the filter & create form selects
  const { data: companies } = useResource<Company>('companies')
  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: pickName(c, lang) })),
    [companies, lang],
  )

  // Counts across all types (respecting the company filter) for tab badges & KPIs
  const { data: allDocs } = useResource<ArchiveDocument>('archive_documents', {
    company_id: effectiveCompany || undefined,
  })

  const params: Record<string, unknown> = { doc_type: activeType }
  if (effectiveCompany) params.company_id = effectiveCompany
  if (query.trim()) params.q = query.trim()

  const { data, loading, refetch } = useResource<ArchiveDocument>('archive_documents', params)

  // KPIs
  const totalAttachments = useMemo(
    () => allDocs.reduce((sum, d) => sum + (d.attachments_count || 0), 0),
    [allDocs],
  )
  const financialValue = useMemo(
    () => allDocs.filter((d) => d.doc_type === 'FINANCIAL').reduce((s, d) => s + (d.amount || 0), 0),
    [allDocs],
  )
  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return allDocs.filter((d) => new Date(d.date).getTime() >= cutoff).length
  }, [allDocs])

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of allDocs) m[d.doc_type] = (m[d.doc_type] || 0) + 1
    return m
  }, [allDocs])

  const tabs = DOC_TYPES.map((type) => ({
    key: type,
    label: t(`archive.type.${type}`),
    icon: docTypeIcon(type),
    badge:
      typeCounts[type] != null ? (
        <span className="ms-1 rounded-full bg-slate-200/80 px-1.5 text-[11px] font-semibold text-slate-600">
          {typeCounts[type]}
        </span>
      ) : undefined,
  }))

  // ---- columns per type --------------------------------------------------
  const columns = useMemo<Column<ArchiveDocument>[]>(() => {
    const dateCol: Column<ArchiveDocument> = {
      key: 'date',
      header: t('archive.col.date'),
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => <span className="tabular-nums text-slate-500">{formatDate(r.date, lang)}</span>,
    }
    const attachCol: Column<ArchiveDocument> = {
      key: 'attachments_count',
      header: t('archive.col.attachments'),
      align: 'center',
      sortable: true,
      accessor: (r) => r.attachments_count,
      render: (r) =>
        r.attachments_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
            {formatNumber(r.attachments_count, lang)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    }
    const statusCol: Column<ArchiveDocument> = {
      key: 'doc_status',
      header: t('archive.col.doc_status'),
      render: (r) =>
        r.doc_status ? (
          <Badge color={docStatusColor(r.doc_status)} dot>
            {r.doc_status}
          </Badge>
        ) : (
          '—'
        ),
    }
    const refCol: Column<ArchiveDocument> = {
      key: 'ref_number',
      header: t('archive.col.ref_number'),
      sortable: true,
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.ref_number}</span>,
    }

    if (activeType === 'CV') {
      return [
        {
          key: 'title',
          header: t('archive.col.title'),
          sortable: true,
          render: (r) => <span className="font-medium text-slate-800">{r.title}</span>,
        },
        { key: 'category', header: t('archive.col.category'), render: (r) => (r.category ? <Badge color="primary">{r.category}</Badge> : '—') },
        { key: 'author', header: t('archive.col.author'), sortable: true },
        dateCol,
        attachCol,
      ]
    }

    if (activeType === 'FINANCIAL') {
      return [
        refCol,
        {
          key: 'title',
          header: t('archive.col.title'),
          sortable: true,
          render: (r) => <span className="font-medium text-slate-800">{r.title}</span>,
        },
        { key: 'category', header: t('archive.col.category'), render: (r) => (r.category ? <Badge color="amber">{r.category}</Badge> : '—') },
        {
          key: 'amount',
          header: t('archive.col.amount'),
          align: 'end',
          sortable: true,
          accessor: (r) => r.amount ?? 0,
          render: (r) => (
            <span className="font-semibold tabular-nums text-slate-800">
              {formatCurrency(r.amount, r.currency ?? 'IQD', lang)}
            </span>
          ),
        },
        dateCol,
      ]
    }

    // MESSAGE / EMAIL_EXT / EMAIL_INT
    return [
      refCol,
      {
        key: 'subject',
        header: t('archive.col.subject'),
        sortable: true,
        render: (r) => <span className="font-medium text-slate-800">{r.subject || r.title}</span>,
      },
      { key: 'from_party', header: t('archive.col.from'), render: (r) => r.from_party || '—' },
      { key: 'to_party', header: t('archive.col.to'), render: (r) => r.to_party || '—' },
      dateCol,
      statusCol,
    ]
  }, [activeType, lang, t])

  // ---- create form -------------------------------------------------------
  const formFields: FormFieldConfig[] = [
    { name: 'title', label: t('archive.col.title'), required: true, colSpan: 2 },
    {
      name: 'doc_type',
      label: t('archive.form.doc_type'),
      type: 'select',
      required: true,
      options: DOC_TYPES.map((dt) => ({ value: dt, label: t(`archive.type.${dt}`) })),
    },
    { name: 'date', label: t('archive.col.date'), type: 'date', required: true },
    {
      name: 'company_id',
      label: t('archive.col.company'),
      type: 'select',
      options: companyOptions,
      placeholder: t('archive.filter.company'),
    },
    { name: 'subject', label: t('archive.col.subject'), colSpan: 2 },
    { name: 'body', label: t('archive.col.body'), type: 'textarea', colSpan: 2 },
  ]

  const handleCreate = async (values: Record<string, unknown>) => {
    const docType = (values.doc_type as ArchiveDocType) || activeType
    await apiPost('/archive_documents', {
      doc_type: docType,
      title: values.title || '',
      date: values.date || new Date().toISOString().slice(0, 10),
      company_id: values.company_id || null,
      subject: values.subject || '',
      body: values.body || '',
      doc_status: 'مؤرشف',
      attachments_count: 0,
    })
    // jump to the type we just created so the user sees it
    if (docType !== activeType) setActiveType(docType)
    else refetch()
  }

  return (
    <div>
      <PageHeader
        icon={<Archive className="h-6 w-6" />}
        title={t('archive.title')}
        subtitle={t('archive.subtitle')}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('archive.new_document')}
          </Button>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t('archive.kpi.total')}
          value={formatNumber(allDocs.length, lang)}
          icon={<FileText className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('archive.kpi.attachments')}
          value={formatNumber(totalAttachments, lang)}
          hint={t('archive.kpi.attachments_hint')}
          icon={<Paperclip className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('archive.kpi.financial_value')}
          value={formatCurrency(financialValue, 'IQD', lang)}
          hint={t('archive.kpi.financial_hint')}
          icon={<Banknote className="h-5 w-5" />}
          accent="accent"
        />
        <KpiCard
          label={t('archive.kpi.recent')}
          value={formatNumber(recentCount, lang)}
          hint={t('archive.kpi.recent_hint')}
          icon={<Clock className="h-5 w-5" />}
          accent="success"
        />
      </div>

      {/* Shared toolbar: search + company filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('archive.search_placeholder')}
            className="input-base ps-9"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder={t('archive.filter.company')}
            options={companyOptions}
          />
        </div>
      </div>

      {/* Tabs (pills) */}
      <div className="mb-5 overflow-x-auto">
        <Tabs variant="pills" tabs={tabs} value={activeType} onChange={(k) => setActiveType(k as ArchiveDocType)} />
      </div>

      {/* Content */}
      {activeType === 'NEWS' ? (
        <NewsGrid data={data} loading={loading} onSelect={setSelected} />
      ) : (
        <ArabicTable<ArchiveDocument>
          columns={columns}
          data={data}
          loading={loading}
          rowKey={(r) => r.id}
          onRowClick={setSelected}
          searchable={false}
          exportName={`archive-${activeType.toLowerCase()}`}
          emptyTitle={t('archive.empty')}
          emptyHint={t('archive.empty_hint')}
        />
      )}

      <DocumentDialog doc={selected} open={!!selected} onClose={() => setSelected(null)} />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={t('archive.form.title')}
        description={t('archive.form.description')}
        size="lg"
        fields={formFields}
        initial={{ doc_type: activeType, company_id: effectiveCompany }}
        onSubmit={handleCreate}
      />
    </div>
  )
}
