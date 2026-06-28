import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Lock, ArrowDownToLine, ArrowUpFromLine, ReceiptText, FileText, Search, X } from 'lucide-react'
import { Button, Badge, Input, SearchSelect } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Account, Company, Project } from '../../types'
import { canEditAccounting, classifyVoucher, type VoucherRow, type VoucherType } from './shared'
import { NewEntryDialog } from './NewEntryDialog'
import { EntryViewDialog } from './EntryViewDialog'
import { FilterBar, type DateRange } from './FilterBar'

interface Row extends VoucherRow {
  type: VoucherType
}

type Filter = 'ALL' | VoucherType

export function VouchersTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId, role } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [journalOpen, setJournalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [range, setRange] = useState<DateRange>({ from: '', to: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)

  // Company / project / account filters are applied server-side (match ANY line
  // of the entry), exactly like the journal page.
  const voucherParams = useMemo(() => {
    const p: Record<string, unknown> = {}
    if (companyId) p.company_id = companyId
    if (companyFilter) p.fcompany = companyFilter
    if (projectFilter) p.fproject = projectFilter
    if (accountFilter) p.faccount = accountFilter
    return p
  }, [companyId, companyFilter, projectFilter, accountFilter])

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
      ...accounts.filter((a) => a.is_posting === 1).sort((a, b) => a.code.localeCompare(b.code)).map((a) => ({ value: a.code, label: `${a.code} — ${pickName(a, lang)}` })),
    ],
    [accounts, lang, t],
  )

  const rows: Row[] = useMemo(() => (data?.rows ?? []).map((r) => ({ ...r, type: classifyVoucher(r) })), [data])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== 'ALL' && r.type !== filter) return false
      if (range.from && r.date < range.from) return false
      if (range.to && r.date > range.to) return false
      if (q) {
        const hay = [r.doc_number, r.serial_number, r.description].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, filter, query, range])

  // KPI cards are IQD figures and follow the VISIBLE (filtered) rows. USD cash
  // lines are excluded so a dollar amount never gets summed into the dinar total.
  const totals = useMemo(() => {
    const iqd = filtered.filter((r) => r.currency !== 'USD')
    const inflow = iqd.filter((r) => r.type === 'RECEIPT').reduce((s, r) => s + r.cash_debit, 0)
    const outflow = iqd.filter((r) => r.type === 'PAYMENT').reduce((s, r) => s + r.cash_credit, 0)
    const journals = filtered.filter((r) => r.type === 'JOURNAL').length
    return { inflow, outflow, net: inflow - outflow, journals }
  }, [filtered])

  const typeBadge = (type: VoucherType) => {
    if (type === 'RECEIPT')
      return <Badge color="green"><ArrowDownToLine className="h-3 w-3" />{t('accounting.vouchers.receipt')}</Badge>
    if (type === 'PAYMENT')
      return <Badge color="red"><ArrowUpFromLine className="h-3 w-3" />{t('accounting.vouchers.payment')}</Badge>
    return <Badge color="blue"><FileText className="h-3 w-3" />{t('accounting.vouchers.journal')}</Badge>
  }

  const columns: Column<Row>[] = [
    { key: 'type', header: t('accounting.vouchers.kind'), render: (r) => typeBadge(r.type) },
    { key: 'date', header: t('accounting.journal.date'), accessor: (r) => r.date, sortable: true, render: (r) => formatDate(r.date, lang) },
    { key: 'serial_number', header: t('accounting.journal.serial'), render: (r) => <span className="font-mono text-xs font-semibold text-primary">{r.serial_number}</span> },
    {
      key: 'cash_account',
      header: t('accounting.vouchers.cash_account'),
      render: (r) => (r.type === 'JOURNAL' ? <span className="text-slate-400">{t('accounting.vouchers.no_cash')}</span> : nameOf(r.cash_account)),
    },
    {
      key: 'counter_account',
      header: t('accounting.vouchers.counter'),
      render: (r) =>
        r.counter_account ? (
          <span className="inline-flex items-center gap-1.5">
            <Link to={`/accounting/accounts/${r.counter_account}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              {nameOf(r.counter_account)}
            </Link>
            {r.type === 'JOURNAL' && r.line_count > 2 && (
              <span className="text-[10px] text-slate-400">+{r.line_count - 1}</span>
            )}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'description', header: t('accounting.journal.desc'), render: (r) => <span className="text-slate-600">{r.description || '—'}</span> },
    {
      key: 'amount',
      header: t('accounting.vouchers.amount'),
      align: 'end',
      accessor: (r) => r.amount,
      sortable: true,
      render: (r) => {
        const cls = r.type === 'RECEIPT' ? 'text-emerald-700' : r.type === 'PAYMENT' ? 'text-red-600' : 'text-slate-700'
        const sign = r.type === 'RECEIPT' ? '+' : r.type === 'PAYMENT' ? '−' : ''
        return <span className={'tabular-nums font-semibold ' + cls}>{sign}{formatCurrency(r.amount, r.currency, lang)}</span>
      },
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
      <FilterBar range={range} onChange={setRange} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1">
          {pills.map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={
                'rounded-md px-3.5 py-1.5 text-sm font-medium transition ' +
                (filter === p.key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700')
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {canEdit ? (
          <Button variant="primary" onClick={() => setJournalOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('accounting.journal.new')}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            {t('accounting.readonly.badge')}
          </span>
        )}
      </div>

      {/* Filters: search + company / project / account (server-side, like the journal) */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('accounting.journal.search_ph')} className="h-10 ps-9" />
          </div>
          <div className="w-44 shrink-0"><SearchSelect value={companyFilter} onChange={setCompanyFilter} options={companyOptions} placeholder={t('accounting.filter.all_companies')} /></div>
          <div className="w-44 shrink-0"><SearchSelect value={projectFilter} onChange={setProjectFilter} options={projectOptions} placeholder={t('accounting.journal.all_projects')} /></div>
          <div className="w-48 shrink-0"><SearchSelect value={accountFilter} onChange={setAccountFilter} options={accountOptions} placeholder={t('accounting.journal.all_accounts')} /></div>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t('accounting.vouchers.total_in')} value={formatCurrency(totals.inflow, 'IQD', lang)} icon={<ArrowDownToLine className="h-5 w-5" />} accent="success" />
        <KpiCard label={t('accounting.vouchers.total_out')} value={formatCurrency(totals.outflow, 'IQD', lang)} icon={<ArrowUpFromLine className="h-5 w-5" />} accent="danger" />
        <KpiCard label={t('accounting.vouchers.net')} value={formatCurrency(totals.net, 'IQD', lang)} icon={<ReceiptText className="h-5 w-5" />} accent={totals.net >= 0 ? 'primary' : 'warning'} />
        <KpiCard label={t('accounting.vouchers.journal_count')} value={totals.journals} icon={<FileText className="h-5 w-5" />} accent="info" />
      </div>

      <ArabicTable
        columns={columns}
        data={filtered}
        loading={loading}
        rowKey={(r, i) => `${r.entry_id}-${i}`}
        onRowClick={(r) => { if (!r.entry_id) return; if (canEdit) setEditId(r.entry_id); else setViewId(r.entry_id) }}
        exportName="vouchers"
        pageSize={12}
        emptyTitle={t('accounting.vouchers.empty')}
      />

      {canEdit && (
        <NewEntryDialog
          open={journalOpen || editId !== null}
          editId={editId}
          onClose={() => { setJournalOpen(false); setEditId(null) }}
          onCreated={() => { setJournalOpen(false); setEditId(null); refetch() }}
        />
      )}
      <EntryViewDialog entryId={viewId} onClose={() => setViewId(null)} />
    </div>
  )
}

