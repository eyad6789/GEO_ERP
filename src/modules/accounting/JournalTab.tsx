import { useMemo, useState } from 'react'
import { Plus, BookOpen, Lock, ArrowDownToLine, ArrowUpFromLine, FileText, Search, X } from 'lucide-react'
import { Button, Badge, Input, SearchSelect } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Account, Company, Project } from '../../types'
import { NewEntryDialog } from './NewEntryDialog'
import { EntryViewDialog } from './EntryViewDialog'
import { FilterBar, type DateRange } from './FilterBar'
import { canEditAccounting, classifyVoucher, type VoucherRow, type VoucherType } from './shared'

interface Row extends VoucherRow {
  type: VoucherType
}
type Filter = 'ALL' | VoucherType

export function JournalTab({ range, onRange }: { range: DateRange; onRange: (r: DateRange) => void }) {
  const t = useT()
  const { lang } = useLang()
  const { companyId, role } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const [entryDialog, setEntryDialog] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null })
  const [viewId, setViewId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')

  // Company / project / account filters are applied server-side (matching ANY
  // line of the entry) so multi-line and per-line entries are caught.
  const voucherParams = useMemo(() => {
    const p: Record<string, unknown> = {}
    if (companyId) p.company_id = companyId
    if (companyFilter) p.fcompany = companyFilter
    if (projectFilter) p.fproject = projectFilter
    if (accountFilter) p.faccount = accountFilter
    return p
  }, [companyId, companyFilter, projectFilter, accountFilter])

  // Use the classified endpoint so every entry carries its auto-category:
  // cash debited → قبض, cash credited → صرف, no cash line → قيد.
  const { data, loading, refetch } = useApi<{ rows: VoucherRow[] }>('/accounting/vouchers', voucherParams)
  const { data: accounts } = useResource<Account>('accounts')
  const { data: companies } = useResource<Company>('companies')
  const { data: projects } = useResource<Project>('projects')
  const nameMap = useMemo(() => new Map(accounts.map((a) => [a.code, a])), [accounts])
  const nameOf = (code: string | null) => (code && nameMap.get(code) ? pickName(nameMap.get(code)!, lang) : code || '—')

  const companyOptions = useMemo(
    () => [{ value: '', label: t('accounting.filter.all_companies') }, ...companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))],
    [companies, lang, t],
  )
  const projectOptions = useMemo(
    () => [{ value: '', label: t('accounting.journal.all_projects') }, ...projects.map((p) => ({ value: p.id, label: pickName(p, lang) }))],
    [projects, lang, t],
  )
  const accountOptions = useMemo(
    () => [
      { value: '', label: t('accounting.journal.all_accounts') },
      ...accounts
        .filter((a) => a.is_posting === 1)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.code, label: `${a.code} — ${pickName(a, lang)}` })),
    ],
    [accounts, lang, t],
  )

  const allRows: Row[] = useMemo(
    () => (data?.rows ?? []).map((r) => ({ ...r, type: classifyVoucher(r) })),
    [data],
  )
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((e) => {
      if (range.from && e.date < range.from) return false
      if (range.to && e.date > range.to) return false
      if (filter !== 'ALL' && e.type !== filter) return false
      if (q) {
        // Search by document number (رقم المستند) only — plus the displayed
        // serial, which is the same entry number. No description/account match.
        const hay = [e.doc_number, e.serial_number].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, range, filter, query, nameMap])

  const totals = useMemo(() => {
    const debit = rows.reduce((s, e) => s + (e.amount || 0), 0)
    return { debit, count: rows.length }
  }, [rows])

  // All entries remain editable through the journal-entry editor.
  const openRow = (r: Row) => {
    if (canEdit) setEntryDialog({ open: true, editId: r.entry_id })
    else setViewId(r.entry_id)
  }

  const typeBadge = (type: VoucherType) => {
    if (type === 'RECEIPT')
      return <Badge color="green"><ArrowDownToLine className="h-3 w-3" />{t('accounting.vouchers.receipt')}</Badge>
    if (type === 'PAYMENT')
      return <Badge color="red"><ArrowUpFromLine className="h-3 w-3" />{t('accounting.vouchers.payment')}</Badge>
    return <Badge color="blue"><FileText className="h-3 w-3" />{t('accounting.vouchers.journal')}</Badge>
  }

  const columns: Column<Row>[] = [
    { key: 'type', header: t('accounting.vouchers.kind'), render: (r) => typeBadge(r.type) },
    {
      key: 'serial_number',
      header: t('accounting.journal.serial'),
      render: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.serial_number}</span>,
    },
    {
      key: 'date',
      header: t('accounting.journal.date'),
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => formatDate(r.date, lang),
    },
    {
      key: 'cash_account',
      header: t('accounting.vouchers.cash_account'),
      render: (r) => (r.type === 'JOURNAL' ? <span className="text-slate-400">{t('accounting.vouchers.no_cash')}</span> : nameOf(r.cash_account)),
    },
    {
      key: 'description',
      header: t('accounting.journal.desc'),
      render: (r) => <span className="text-slate-700">{r.description || '—'}</span>,
    },
    {
      key: 'debit',
      header: t('accounting.journal.debit'),
      align: 'end',
      sortable: true,
      accessor: (r) => r.amount,
      render: (r) => <span className="tabular-nums text-emerald-700">{formatCurrency(r.amount, r.currency, lang)}</span>,
    },
    {
      key: 'credit',
      header: t('accounting.journal.credit'),
      align: 'end',
      render: (r) => <span className="tabular-nums text-sky-700">{formatCurrency(r.amount, r.currency, lang)}</span>,
    },
  ]

  const pills: { key: Filter; label: string }[] = [
    { key: 'ALL', label: t('accounting.vouchers.all') },
    { key: 'RECEIPT', label: t('accounting.vouchers.receipt') },
    { key: 'PAYMENT', label: t('accounting.vouchers.payment') },
    { key: 'JOURNAL', label: t('accounting.vouchers.journal') },
  ]

  return (
    <div className="space-y-4">
      <FilterBar
        range={range}
        onChange={onRange}
        right={
          canEdit ? (
            <Button variant="primary" onClick={() => setEntryDialog({ open: true, editId: null })}>
              <Plus className="h-4 w-4" />
              {t('accounting.journal.new')}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              {t('accounting.readonly.badge')}
            </span>
          )
        }
      />

      {/* One toolbar: category pills · search · filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented category pills */}
          <div className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1">
            {pills.map((p) => (
              <button
                key={p.key}
                onClick={() => setFilter(p.key)}
                className={
                  'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                  (filter === p.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search (grows to fill) */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('accounting.journal.search_ph')}
              className="h-10 ps-9"
            />
          </div>

          {/* Filters */}
          <div className="w-40 shrink-0"><SearchSelect value={companyFilter} onChange={setCompanyFilter} options={companyOptions} placeholder={t('accounting.filter.all_companies')} /></div>
          <div className="w-40 shrink-0"><SearchSelect value={projectFilter} onChange={setProjectFilter} options={projectOptions} placeholder={t('accounting.journal.all_projects')} /></div>
          <div className="w-44 shrink-0"><SearchSelect value={accountFilter} onChange={setAccountFilter} options={accountOptions} placeholder={t('accounting.journal.all_accounts')} /></div>

          {(companyFilter || projectFilter || accountFilter || query) && (
            <button
              onClick={() => { setCompanyFilter(''); setProjectFilter(''); setAccountFilter(''); setQuery('') }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-danger"
              title={t('accounting.journal.clear_filters')}
            >
              <X className="h-3.5 w-3.5" />
              {t('accounting.journal.clear_filters')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('accounting.journal.title')} value={`${totals.count} ${t('accounting.journal.count')}`} icon={<BookOpen className="h-5 w-5" />} accent="primary" />
        <KpiCard label={t('accounting.new.total_debit')} value={formatCurrency(totals.debit, 'IQD', lang)} accent="info" />
        <KpiCard label={t('accounting.new.total_credit')} value={formatCurrency(totals.debit, 'IQD', lang)} accent="success" />
      </div>

      <ArabicTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r, i) => `${r.entry_id}-${i}`}
        onRowClick={openRow}
        searchable={false}
        exportName="journal_entries"
        pageSize={12}
        emptyTitle={t('accounting.journal.empty')}
        emptyHint={t('accounting.journal.empty_hint')}
      />

      {canEdit && (
        <NewEntryDialog
          open={entryDialog.open}
          editId={entryDialog.editId}
          onClose={() => setEntryDialog((s) => ({ ...s, open: false }))}
          onCreated={refetch}
        />
      )}
      <EntryViewDialog entryId={viewId} onClose={() => setViewId(null)} />
    </div>
  )
}

