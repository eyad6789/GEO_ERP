import { useMemo, useState } from 'react'
import { Plus, Lock, Search, X, Wallet } from 'lucide-react'
import { Button, Input, SearchSelect } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Account, Company, Project } from '../../types'
import { NewEntryDialog } from './NewEntryDialog'
import { EntryViewDialog } from './EntryViewDialog'
import { FilterBar, type DateRange } from './FilterBar'
import { canEditAccounting, classifyVoucher, resolvePostingDescendants, BANK_ROOTS, CASH_BOX_ROOTS, ADVANCE_ROOTS, type VoucherRow, type VoucherType, type TrialBalanceResp } from './shared'

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
  // Multi-select type filter: an empty set = show all. Pick any combination of
  // قبض / صرف / قيد at the same time.
  const [types, setTypes] = useState<Set<VoucherType>>(new Set())
  const toggleType = (key: 'ALL' | VoucherType) => {
    if (key === 'ALL') return setTypes(new Set())
    setTypes((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [bankFilter, setBankFilter] = useState('')

  // Company / project / account filters are applied server-side (matching ANY
  // line of the entry) so multi-line and per-line entries are caught.
  const voucherParams = useMemo(() => {
    const p: Record<string, unknown> = {}
    if (companyId) p.company_id = companyId
    if (companyFilter) p.fcompany = companyFilter
    if (projectFilter) p.fproject = projectFilter
    if (accountFilter) p.faccount = accountFilter
    if (bankFilter) p.fbank = bankFilter
    return p
  }, [companyId, companyFilter, projectFilter, accountFilter, bankFilter])

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
  // Bank GL accounts (under المصارف / 183, chart-agnostic) for the bank filter.
  const bankCodeSet = useMemo(() => new Set(resolvePostingDescendants(BANK_ROOTS, accounts)), [accounts])
  const bankOptions = useMemo(
    () => [
      { value: '', label: t('accounting.journal.all_banks') },
      ...accounts
        .filter((a) => bankCodeSet.has(a.code))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.code, label: `${a.code} — ${pickName(a, lang)}` })),
    ],
    [accounts, bankCodeSet, lang, t],
  )

  const allRows: Row[] = useMemo(
    () => (data?.rows ?? []).map((r) => ({ ...r, type: classifyVoucher(r) })),
    [data],
  )

  // Current balance of each cash box (in its own currency), used to anchor the
  // per-entry "remaining in box" column. The anchor must honor the SAME company /
  // project filter as the listed vouchers — otherwise the walk-back starts from
  // the full-account balance and every "balance after" figure is off by the
  // excluded entries' movements.
  const anchorParams = useMemo(() => {
    const p: Record<string, unknown> = {}
    const company = companyFilter || companyId
    if (company) p.company_id = company
    if (projectFilter) p.project_id = projectFilter
    return Object.keys(p).length ? p : undefined
  }, [companyId, companyFilter, projectFilter])
  const { data: trial } = useApi<TrialBalanceResp>('/reports/trial-balance', anchorParams)
  const iqdMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of trial?.rows ?? []) m.set(r.code, r.balance_iqd ?? r.balance)
    return m
  }, [trial])
  const usdMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of trial?.rows ?? []) m.set(r.code, r.balance_usd ?? 0)
    return m
  }, [trial])

  // For every cash voucher, the cash-box balance AFTER that entry. We anchor each
  // box to its real current balance (trial balance) and walk the entries backward
  // (newest → oldest), subtracting each entry's net cash movement. Pure journal
  // entries (no cash line) get nothing.
  const cashAfter = useMemo(() => {
    const after = new Map<string, { value: number; currency: string }>()
    // Keyed by account + currency: a single cash box hit in both IQD and USD
    // keeps a separate running cursor per currency.
    const cursor = new Map<string, number>()
    for (const r of allRows) {
      if (r.type === 'JOURNAL' || !r.cash_account) continue
      const acct = r.cash_account
      const currency = r.currency === 'USD' ? 'USD' : 'IQD'
      const key = `${acct}|${currency}`
      const net = (r.cash_debit || 0) - (r.cash_credit || 0)
      const current = currency === 'USD' ? usdMap.get(acct) ?? 0 : iqdMap.get(acct) ?? 0
      const bal = cursor.has(key) ? (cursor.get(key) as number) : current
      after.set(r.entry_id, { value: bal, currency })
      cursor.set(key, bal - net)
    }
    return after
  }, [allRows, iqdMap, usdMap])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter((e) => {
      if (range.from && e.date < range.from) return false
      if (range.to && e.date > range.to) return false
      if (types.size > 0 && !types.has(e.type)) return false
      if (q) {
        // Search by document number (رقم المستند), the displayed serial, AND the
        // description / البيان — so typing a party name (e.g. محمد) finds every
        // entry mentioning it.
        const hay = [e.doc_number, e.serial_number, e.description].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, range, types, query, nameMap])

  // Total cash boxes — same figures as the الصندوق tab: cash-box balances plus
  // the operational advance («شامل سلفة المشاريع»), per currency.
  const cashTotals = useMemo(() => {
    const cashCodes = new Set(resolvePostingDescendants(CASH_BOX_ROOTS, accounts))
    const isUsdBox = (name: string) => /\$|دولار|usd/i.test(name)
    let iqd = 0
    let usd = 0
    for (const a of accounts) {
      if (!cashCodes.has(a.code) || a.archived === 1) continue
      if (isUsdBox(`${a.name_ar} ${a.name_en}`)) usd += usdMap.get(a.code) ?? 0
      else iqd += iqdMap.get(a.code) ?? 0
    }
    for (const c of resolvePostingDescendants(ADVANCE_ROOTS, accounts)) {
      iqd += iqdMap.get(c) ?? 0
      usd += usdMap.get(c) ?? 0
    }
    return { iqd, usd }
  }, [accounts, iqdMap, usdMap])

  // All entries remain editable through the journal-entry editor.
  const openRow = (r: Row) => {
    if (canEdit) setEntryDialog({ open: true, editId: r.entry_id })
    else setViewId(r.entry_id)
  }

  // Net cash movement of an entry, split into a receipt (قبض, cash in) or a
  // payment (صرف, cash out) amount in the entry's own currency. Pure journal
  // entries (no cash line) yield zero on both.
  const cashFlow = (r: Row) => {
    const currency: 'IQD' | 'USD' = r.currency === 'USD' ? 'USD' : 'IQD'
    const net = (r.cash_debit || 0) - (r.cash_credit || 0)
    return { receipt: net > 0 ? net : 0, payment: net < 0 ? -net : 0, currency }
  }
  const dash = <span className="text-slate-300">—</span>

  const columns: Column<Row>[] = [
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
      key: 'receipt_iqd',
      header: t('accounting.journal.receipt_iqd'),
      align: 'end',
      accessor: (r) => { const f = cashFlow(r); return f.currency === 'IQD' ? f.receipt || '' : '' },
      render: (r) => { const f = cashFlow(r); return f.currency === 'IQD' && f.receipt ? <span className="tabular-nums font-medium text-emerald-700">{formatCurrency(f.receipt, 'IQD', lang)}</span> : dash },
    },
    {
      key: 'receipt_usd',
      header: t('accounting.journal.receipt_usd'),
      align: 'end',
      accessor: (r) => { const f = cashFlow(r); return f.currency === 'USD' ? f.receipt || '' : '' },
      render: (r) => { const f = cashFlow(r); return f.currency === 'USD' && f.receipt ? <span className="tabular-nums font-medium text-emerald-700">{formatCurrency(f.receipt, 'USD', lang)}</span> : dash },
    },
    {
      key: 'payment_iqd',
      header: t('accounting.journal.payment_iqd'),
      align: 'end',
      accessor: (r) => { const f = cashFlow(r); return f.currency === 'IQD' ? f.payment || '' : '' },
      render: (r) => { const f = cashFlow(r); return f.currency === 'IQD' && f.payment ? <span className="tabular-nums font-medium text-rose-700">{formatCurrency(f.payment, 'IQD', lang)}</span> : dash },
    },
    {
      key: 'payment_usd',
      header: t('accounting.journal.payment_usd'),
      align: 'end',
      accessor: (r) => { const f = cashFlow(r); return f.currency === 'USD' ? f.payment || '' : '' },
      render: (r) => { const f = cashFlow(r); return f.currency === 'USD' && f.payment ? <span className="tabular-nums font-medium text-rose-700">{formatCurrency(f.payment, 'USD', lang)}</span> : dash },
    },
    {
      // الملاحظات — like the accountant's Excel cash book, the description sits
      // between the movement columns and the running balances.
      key: 'description',
      header: t('accounting.journal.notes'),
      accessor: (r) => r.description ?? '',
      render: (r) => <span className="block max-w-[260px] truncate text-slate-600" title={r.description ?? ''}>{r.description || dash}</span>,
    },
    {
      key: 'balance_iqd',
      header: t('accounting.journal.balance_iqd'),
      align: 'end',
      accessor: (r) => { const c = cashAfter.get(r.entry_id); return c && c.currency === 'IQD' ? c.value : '' },
      render: (r) => { const c = cashAfter.get(r.entry_id); return c && c.currency === 'IQD' ? <span className="tabular-nums font-medium text-slate-700">{formatCurrency(c.value, 'IQD', lang)}</span> : dash },
    },
    {
      key: 'balance_usd',
      header: t('accounting.journal.balance_usd'),
      align: 'end',
      accessor: (r) => { const c = cashAfter.get(r.entry_id); return c && c.currency === 'USD' ? c.value : '' },
      render: (r) => { const c = cashAfter.get(r.entry_id); return c && c.currency === 'USD' ? <span className="tabular-nums font-medium text-slate-700">{formatCurrency(c.value, 'USD', lang)}</span> : dash },
    },
    {
      key: 'amount',
      header: t('accounting.journal.amount'),
      align: 'end',
      sortable: true,
      accessor: (r) => r.amount,
      render: (r) => <span className="tabular-nums text-slate-700">{formatCurrency(r.amount, r.currency, lang)}</span>,
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
          {/* Category pills — multi-select: pick any combination of قبض / صرف / قيد
              at once. "All" clears the selection. */}
          <div className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1">
            {pills.map((p) => {
              const active = p.key === 'ALL' ? types.size === 0 : types.has(p.key as VoucherType)
              return (
                <button
                  key={p.key}
                  onClick={() => toggleType(p.key)}
                  aria-pressed={active}
                  className={
                    'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                    (active ? 'bg-white text-primary shadow-sm ring-1 ring-primary/20' : 'text-slate-500 hover:text-slate-700')
                  }
                >
                  {p.label}
                </button>
              )
            })}
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
          <div className="w-40 shrink-0"><SearchSelect value={bankFilter} onChange={setBankFilter} options={bankOptions} placeholder={t('accounting.journal.all_banks')} /></div>

          {(companyFilter || projectFilter || accountFilter || bankFilter || query) && (
            <button
              onClick={() => { setCompanyFilter(''); setProjectFilter(''); setAccountFilter(''); setBankFilter(''); setQuery('') }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-danger"
              title={t('accounting.journal.clear_filters')}
            >
              <X className="h-3.5 w-3.5" />
              {t('accounting.journal.clear_filters')}
            </button>
          )}
        </div>
      </div>

      {/* Total-cash boxes (same as the الصندوق tab) — restored per the manager. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          label={t('accounting.cash.total_iqd')}
          value={formatCurrency(cashTotals.iqd, 'IQD', lang)}
          hint={t('accounting.cash.incl_advance')}
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('accounting.cash.total_usd')}
          value={formatCurrency(cashTotals.usd, 'USD', lang)}
          hint={t('accounting.cash.incl_advance')}
          icon={<Wallet className="h-5 w-5" />}
          accent="success"
        />
      </div>

      <ArabicTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r, i) => `${r.entry_id}-${i}`}
        onRowClick={openRow}
        searchable={false}
        exportName="journal_entries"
        emptyTitle={t('accounting.journal.empty')}
        emptyHint={t('accounting.journal.empty_hint')}
      />

      {canEdit && (
        <NewEntryDialog
          open={entryDialog.open}
          editId={entryDialog.editId}
          onClose={() => setEntryDialog((s) => ({ ...s, open: false }))}
          onCreated={refetch}
          onOpenExisting={(id) => setEntryDialog({ open: true, editId: id })}
        />
      )}
      <EntryViewDialog entryId={viewId} onClose={() => setViewId(null)} />
    </div>
  )
}

