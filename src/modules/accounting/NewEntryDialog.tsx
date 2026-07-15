import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Check, AlertTriangle, BookOpen, Pencil, Printer } from 'lucide-react'
import { Dialog, Button, Field, Input, SearchSelect, useToast } from '../../components/ui'
import { NumberInput } from '../../components/shared'
import { useResource, useApi } from '../../hooks/useResource'
import { useFormNav } from '../../hooks/useFormNav'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiPost, apiPut, apiDelete } from '../../lib/api'
import { formatCurrency, pickName } from '../../lib/format'
import { type Account, type Company, type Project, type Vehicle, type Currency } from '../../types'
import { isBalanced, localToday, resolvePostingDescendants, CASH_BOX_ROOTS, type JournalEntryFull } from './shared'
import { DateField } from './DateField'
import { printJournalEntry } from './printEntry'

interface LineState {
  uid: number
  company_id: string
  project_id: string
  account_code: string
  debit: string
  credit: string
  description: string
  currency: Currency
  price: string // سعر العملة (per-line rate)
  vehicle_id: string // set when the line posts to a vehicle-expense account
}

const CONVERTIBLE: Currency[] = ['IQD', 'USD']
const GENERAL_COMPANY = 'co-gen' // عام — used when a line has no company
const DEFAULT_USD_RATE = '1500' // default USD→IQD rate (editable)

const num = (s: string): number => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// Rate for a given currency: IQD is always 1; USD keeps its value or defaults.
const rateFor = (currency: Currency, current: string): string =>
  currency === 'IQD' ? '1' : num(current) > 1 ? current : DEFAULT_USD_RATE

let lineCounter = 0
const blankLine = (company: string): LineState => ({
  uid: ++lineCounter,
  company_id: company || GENERAL_COMPANY,
  project_id: '',
  account_code: '',
  debit: '',
  credit: '',
  description: '',
  currency: 'IQD',
  price: '1',
  vehicle_id: '',
})

const MIN_ROWS = 10
const blankLines = (company: string) => Array.from({ length: MIN_ROWS }, () => blankLine(company))

export function NewEntryDialog({
  open,
  onClose,
  onCreated,
  editId,
  onOpenExisting,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  editId?: string | null
  /** Called to jump to another journal (typed doc number, or ←/→ browsing).
   *  null = back to the fresh new-entry form. */
  onOpenExisting?: (entryId: string | null) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const { success, error } = useToast()
  const formNav = useFormNav()

  const { data: companies } = useResource<Company>('companies')
  const { data: projects } = useResource<Project>('projects')
  const { data: accounts } = useResource<Account>('accounts')
  const { data: vehicles } = useResource<Vehicle>('vehicles')
  const { data: editEntry } = useApi<JournalEntryFull>(
    open && editId ? `/journal_entries/${editId}/full` : null,
  )
  const isEdit = !!editId
  // Auto document number (رقم وثيقة السند تلقائي) like the legacy software:
  // highest numeric doc number + 1, pre-filled but still editable.
  const { data: nextDoc, refetch: refetchNextDoc } = useApi<{ next: string }>(
    open && !editId ? '/accounting/next-doc' : null,
  )
  const [docNumber, setDocNumber] = useState('')
  // Typing the number of an EXISTING journal offers to jump straight into it —
  // the accountant can check "what's inside" without leaving the entry screen.
  const docQuery = docNumber.trim()
  const { data: existingByDoc } = useApi<Array<{ id: string; doc_number: string }>>(
    open && !editId && docQuery ? '/journal_entries' : null,
    open && !editId && docQuery ? { doc_number: docQuery, limit: 1 } : undefined,
  )
  const existingEntry = !editId && docQuery && existingByDoc?.length ? existingByDoc[0] : null

  const today = localToday()
  const [date, setDate] = useState(today)
  const [lines, setLines] = useState<LineState[]>(blankLines(companyId ?? ''))
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // قيد / سند قبض / سند صرف — all three use the same line editor below.
  // Defaults to سند صرف: most of the office's documents are spent money.
  const [mode, setMode] = useState<'JOURNAL' | 'RECEIPT' | 'PAYMENT'>('PAYMENT')

  // Browse journals with ← / → while no field is focused: → goes to the older
  // journal, ← to the newer one; going newer past the newest returns to the
  // fresh new-entry form (like السابق/التالي in the legacy software).
  const { data: navList } = useApi<Array<{ id: string; date: string }>>(
    open ? '/journal_entries' : null,
    open ? { sort: 'date', order: 'DESC' } : undefined,
  )

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: pickName(c, lang) })),
    [companies, lang],
  )
  const accountOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.is_posting === 1)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.code, label: `${a.code} — ${lang === 'en' ? a.name_en || a.name_ar : a.name_ar}` })),
    [accounts, lang],
  )
  const accMap = useMemo(() => {
    const m: Record<string, Account> = {}
    for (const a of accounts) m[a.code] = a
    return m
  }, [accounts])
  // Project options scoped to the line's company. "عام / General" (value '' →
  // no specific project) is always first, and every option carries a quick-entry
  // digit in its label — like the currency field — so you can Tab into the field,
  // type the number and Enter to pick it (1 = عام, 2 = first project, …).
  const projectOptionsFor = (company: string) => {
    const list = projects.filter((p) => !company || p.company_id === company)
    return [
      { value: '', label: `1 — ${t('accounting.new.general_project')}` },
      ...list.map((p, i) => ({ value: p.id, label: `${i + 2} — ${pickName(p, lang)}` })),
    ]
  }

  // A car can be tagged on ANY line, whatever the account — the tag flows to the
  // fleet module's المالية tab and the car's own ledger (journal_lines.vehicle_id).
  // The list is connected to the line's company: its own vehicles come first,
  // then the rest of the fleet, so nothing is ever un-taggable.
  const vehicleOptionsFor = (company: string) => {
    const sorted = vehicles.slice().sort((a, b) => {
      if (company) {
        const am = a.company_id === company ? 0 : 1
        const bm = b.company_id === company ? 0 : 1
        if (am !== bm) return am - bm
      }
      return a.code.localeCompare(b.code)
    })
    return sorted.map((v) => ({ value: v.id, label: `${v.code} — ${pickName(v, lang)}` }))
  }

  // First cash box — used to pre-fill the cash line for a receipt (قبض).
  // Resolved from CASH_BOX_ROOTS so it works on any chart (Iraqi demo OR the
  // production IFRS chart), instead of hard-coding the demo codes 18/183.
  const defaultCashAccount = useMemo(() => {
    const cashCodes = new Set(resolvePostingDescendants(CASH_BOX_ROOTS, accounts))
    return accounts
      .filter((a) => a.is_posting === 1 && cashCodes.has(a.code))
      .sort((a, b) => a.code.localeCompare(b.code))[0]?.code ?? ''
  }, [accounts])

  // Switching to a voucher type pre-fills the first line's cash account.
  const changeMode = (m: 'JOURNAL' | 'RECEIPT' | 'PAYMENT') => {
    setMode(m)
    // Only a receipt (قبض) pre-fills the cash box on the first line. For a
    // payment (صرف) the accountant picks the account themselves.
    if (m === 'RECEIPT' && defaultCashAccount) {
      setLines((ls) => ls.map((l, i) => (i === 0 && !l.account_code ? { ...l, account_code: defaultCashAccount } : l)))
    }
  }

  // Balance on the DINAR VALUE (amount × rate). A tasarif (currency exchange)
  // mixes currencies per line — e.g. $100 debit vs 150,000 IQD credit — and
  // balances when the dinar values match. IQD lines have rate 1, so ordinary
  // single-currency entries are unaffected.
  const lineRate = (l: LineState) => num(rateFor(l.currency, l.price)) || 1
  const totalDebit = lines.reduce((s, l) => s + num(l.debit) * lineRate(l), 0)
  const totalCredit = lines.reduce((s, l) => s + num(l.credit) * lineRate(l), 0)
  const diff = totalDebit - totalCredit
  const balanced = isBalanced(totalDebit, totalCredit) && totalDebit > 0
  const canSubmit = balanced && !!docNumber.trim()

  // Totals display in the lines' own currency when every amount line shares one
  // (a USD-only entry shows $ totals, not the converted dinar) — same
  // singleCurrency rule as EntryViewDialog/printEntry. Mixed entries keep the
  // balanced dinar value.
  const amountCurrencies = new Set(lines.filter((l) => num(l.debit) > 0 || num(l.credit) > 0).map((l) => l.currency))
  const displayCurrency: Currency = amountCurrencies.size === 1 ? [...amountCurrencies][0] : 'IQD'
  const displayDebit = displayCurrency === 'IQD' ? totalDebit : lines.reduce((s, l) => s + num(l.debit), 0)
  const displayCredit = displayCurrency === 'IQD' ? totalCredit : lines.reduce((s, l) => s + num(l.credit), 0)
  const displayDiff = displayDebit - displayCredit

  const updateLine = (uid: number, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, blankLine(companyId ?? '')])
  const removeLine = (uid: number) =>
    setLines((ls) => (ls.length <= 2 ? ls : ls.filter((l) => l.uid !== uid)))

  const reset = () => {
    setDate(today)
    setDocNumber('')
    setLines(blankLines(companyId ?? ''))
    setMode('PAYMENT') // most documents are سند صرف — start there
  }

  useEffect(() => {
    if (!open) return
    if (editId && editEntry) {
      setMode('JOURNAL') // editing always uses the full journal grid
      setDate(editEntry.date)
      setDocNumber(editEntry.doc_number ?? '')
      const mapped: LineState[] = editEntry.lines.map((l) => ({
        uid: ++lineCounter,
        company_id: l.company_id ?? editEntry.company_id ?? '',
        project_id: l.project_id ?? editEntry.project_id ?? '',
        account_code: l.account_code,
        debit: l.debit ? String(l.debit) : '',
        credit: l.credit ? String(l.credit) : '',
        description: l.description ?? '',
        currency: ((l.currency as Currency) || (editEntry.currency as Currency) || 'IQD'),
        price: l.price && l.price !== 1 ? String(l.price) : editEntry.exchange_rate && editEntry.exchange_rate !== 1 ? String(editEntry.exchange_rate) : '',
        vehicle_id: l.vehicle_id ?? '',
      }))
      while (mapped.length < MIN_ROWS) mapped.push(blankLine(editEntry.company_id ?? companyId ?? ''))
      setLines(mapped)
    } else if (!editId) {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, editEntry])

  // Pre-fill the auto doc number whenever the field is blank (fresh dialog or
  // right after a save-and-continue reset). Typing over it always wins.
  useEffect(() => {
    if (open && !isEdit && nextDoc?.next) setDocNumber((d) => d || nextDoc.next)
  }, [open, isEdit, nextDoc])

  const handleClose = () => {
    if (submitting || deleting) return
    reset()
    onClose()
  }

  // Keyboard: Escape exits without saving. F5 and Ctrl/Cmd+S are handled at the
  // document level (see the keydown effect below) so they fire regardless of
  // which field has focus. Everything else falls through to grid navigation.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
      return
    }
    formNav.onKeyDown(e)
  }

  const handleDelete = async () => {
    if (!editId) return
    if (!window.confirm(t('accounting.edit.confirm_delete'))) return
    setDeleting(true)
    try {
      await apiDelete(`/journal_entries/${editId}`)
      success(t('accounting.edit.deleted'))
      reset()
      onCreated()
      onClose()
    } catch (e) {
      error((e as Error)?.message || t('common.error'))
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmit = async () => {
    const docNo = docNumber.trim()
    if (!docNo) return error(t('accounting.new.err_doc'))
    const valid = lines.filter((l) => num(l.debit) > 0 || num(l.credit) > 0)
    if (valid.length < 2) return error(t('accounting.new.err_lines'))
    if (valid.some((l) => !l.account_code)) return error(t('accounting.new.err_account'))
    if (!isBalanced(totalDebit, totalCredit) || totalDebit <= 0) return error(t('accounting.new.err_balance'))

    // Company is optional per line — fall back to عام (General).
    const company = valid.find((l) => l.company_id)?.company_id || companyId || GENERAL_COMPANY

    const first = valid[0]
    // Use the LAST non-empty البيان as the entry's description (what the journal
    // list shows), so the most recently typed line wins.
    const described = valid.filter((l) => l.description.trim())
    const description = described.length ? described[described.length - 1].description.trim() : ''

    const body = {
      company_id: company,
      project_id: first.project_id || null,
      date,
      // The document number IS the entry number (no auto serial).
      serial_number: docNo,
      doc_number: docNo,
      description,
      currency: first.currency,
      exchange_rate: rateFor(first.currency, first.price) ? num(rateFor(first.currency, first.price)) : 1,
      status: 'APPROVED',
      lines: valid.map((l) => ({
        account_code: l.account_code,
        company_id: l.company_id || GENERAL_COMPANY,
        project_id: l.project_id || null,
        description: l.description.trim(),
        currency: l.currency,
        price: num(rateFor(l.currency, l.price)) || 1,
        debit: num(l.debit),
        credit: num(l.credit),
        // The vehicle tag is kept on any account — it feeds the fleet module's
        // finance views regardless of where the amount was posted.
        vehicle_id: l.vehicle_id || null,
      })),
    }

    setSubmitting(true)
    try {
      if (editId) {
        await apiPut(`/journal_entries/${editId}`, body)
        success(t('accounting.new.saved'))
        reset()
        onCreated()
        onClose()
      } else {
        await apiPost('/journal_entries', body)
        success(t('accounting.new.saved'))
        // Like the legacy software: saving opens a fresh document immediately
        // (dialog stays open, doc number advances) so entries chain without
        // reaching for the mouse.
        reset()
        onCreated()
        refetchNextDoc()
      }
    } catch (e) {
      error((e as Error)?.message || t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  // Ctrl/Cmd+S and F5 save from anywhere in the dialog. Captured at the document
  // level (capture phase) with preventDefault so the browser's "Save page" /
  // refresh never fire. e.code covers Windows Arabic keyboard layouts where
  // e.key is «س» instead of "s". A ref holds the latest handlers so one
  // listener always sees current state.
  const saveRef = useRef<() => void>(() => {})
  saveRef.current = () => { if (!submitting && !deleting && canSubmit) handleSubmit() }
  // ← / → journal browsing (only while no input/select/textarea has focus):
  // → opens the OLDER journal, ← the NEWER one; newer than the newest = the
  // fresh new-entry form again.
  const navRef = useRef<(dir: 1 | -1) => void>(() => {})
  navRef.current = (dir) => {
    if (submitting || deleting || !onOpenExisting) return
    const list = navList ?? []
    if (!list.length) return
    const idx = editId ? list.findIndex((e) => e.id === editId) : -1
    const next = idx + dir
    if (idx === -1 && dir === 1) {
      // From the new-entry form, → dives into the newest existing journal —
      // but never throw away amounts the accountant already typed.
      if (totalDebit > 0 || totalCredit > 0) return
      onOpenExisting(list[0].id)
    } else if (next >= 0 && next < list.length) {
      onOpenExisting(list[next].id)
    } else if (next === -1 && editId) {
      onOpenExisting(null) // back to the new-entry form
    }
  }
  useEffect(() => {
    if (!open) return
    const isField = () => {
      const el = document.activeElement
      return !!el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
        e.preventDefault()
        saveRef.current()
        return
      }
      if (e.key === 'F5') {
        e.preventDefault()
        saveRef.current()
        return
      }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !isField()) {
        e.preventDefault()
        navRef.current(e.key === 'ArrowRight' ? 1 : -1)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="3xl"
      title={
        <span className="flex items-center gap-2">
          {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
          {isEdit ? t('accounting.edit.title') : t('accounting.new.title')}
        </span>
      }
      description={isEdit ? t('accounting.edit.desc') : t('accounting.new.desc')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <BalanceIndicator balanced={balanced} totalDebit={displayDebit} totalCredit={displayCredit} diff={displayDiff} currency={displayCurrency} lang={lang} t={t} />
            <span className="text-[11px] text-slate-400">{t('accounting.new.shortcuts')}</span>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <Button variant="outline" onClick={handleDelete} disabled={submitting || deleting} className="text-danger hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                {deleting ? t('accounting.edit.deleting') : t('accounting.edit.delete')}
              </Button>
            )}
            {isEdit && editEntry && (
              <Button variant="outline" onClick={() => printJournalEntry(editEntry, accMap, lang)} disabled={submitting || deleting}>
                <Printer className="h-4 w-4" />
                {t('accounting.entry.print')}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} disabled={submitting || deleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting || deleting || !canSubmit}>
              {submitting ? t('accounting.new.saving') : t('accounting.new.submit')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5" onKeyDown={onFormKeyDown} onKeyUp={formNav.onKeyUp}>
        {/* Type toggle: قيد / سند قبض / سند صرف (new entries only) */}
        {!isEdit && (
          <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
            {([
              ['JOURNAL', t('accounting.vouchers.journal')],
              ['RECEIPT', t('accounting.vouchers.receipt')],
              ['PAYMENT', t('accounting.vouchers.payment')],
            ] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                className={
                  'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ' +
                  (mode === m ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Header: date + doc number */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('accounting.new.date')} required>
              <DateField value={date} onChange={setDate} />
            </Field>
            <Field label={t('accounting.new.doc_number')} required hint={existingEntry ? undefined : t('accounting.new.doc_number_hint')}>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                onKeyDown={(e) => {
                  // Enter on an existing number jumps into that journal.
                  if (e.key === 'Enter' && existingEntry && onOpenExisting) {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpenExisting(existingEntry.id)
                  }
                }}
                placeholder={t('accounting.new.doc_number_ph')}
                className="font-mono"
              />
              {existingEntry && (
                <button
                  type="button"
                  onClick={() => onOpenExisting?.(existingEntry.id)}
                  className="mt-1.5 flex w-full items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-start text-xs font-medium text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  {t('accounting.new.doc_exists')}
                </button>
              )}
            </Field>
          </div>
        </section>


        {/* Lines editor: الشركة | المشروع | الحساب | مدين | دائن | البيان | العملة | سعر العملة */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">{t('accounting.new.lines')}</h4>
            <Button variant="subtle" size="sm" onClick={addLine}>
              <Plus className="h-4 w-4" />
              {t('accounting.new.add_line')}
            </Button>
          </div>

          {/* Column order mirrors the legacy entry grid the accountant knows:
              م | مدين | دائن | الحساب | الشركة | المشروع | الآلية | البيان | العملة | سعرها | القيمة */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1750px] text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-2 py-2.5 text-center">{t('accounting.new.line_no')}</th>
                  <th className="w-28 px-2 py-2.5 text-start">{t('accounting.new.line_debit')}</th>
                  <th className="w-28 px-2 py-2.5 text-start">{t('accounting.new.line_credit')}</th>
                  <th className="min-w-[230px] px-2 py-2.5 text-start">{t('accounting.new.line_account')}</th>
                  <th className="min-w-[200px] px-2 py-2.5 text-start">{t('common.company')}</th>
                  <th className="min-w-[200px] px-2 py-2.5 text-start">{t('common.project')}</th>
                  <th className="min-w-[200px] px-2 py-2.5 text-start">{t('accounting.new.line_vehicle')}</th>
                  <th className="min-w-[260px] px-2 py-2.5 text-start">{t('common.description')}</th>
                  <th className="w-24 px-2 py-2.5 text-start">{t('accounting.new.currency')}</th>
                  <th className="w-28 px-2 py-2.5 text-start">{t('accounting.new.currency_rate')}</th>
                  <th className="w-32 px-2 py-2.5 text-end">{t('accounting.new.line_value')}</th>
                  <th className="w-10 px-1 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr key={line.uid} className="align-top">
                    <td className="px-2 py-3.5 text-center text-xs tabular-nums text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <NumberInput
                        className="text-start tabular-nums"
                        value={line.debit}
                        onValueChange={(v) => updateLine(line.uid, { debit: v, credit: v ? '' : line.credit })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput
                        className="text-start tabular-nums"
                        value={line.credit}
                        onValueChange={(v) => updateLine(line.uid, { credit: v, debit: v ? '' : line.debit })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <SearchSelect
                        value={line.account_code}
                        onChange={(v) => updateLine(line.uid, { account_code: v })}
                        options={accountOptions}
                        placeholder={t('accounting.new.line_account_ph')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <SearchSelect
                        value={line.company_id}
                        onChange={(v) => updateLine(line.uid, { company_id: v, project_id: '' })}
                        options={companyOptions}
                        placeholder={t('common.select')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <SearchSelect
                        value={line.project_id}
                        onChange={(v) => updateLine(line.uid, { project_id: v })}
                        options={projectOptionsFor(line.company_id)}
                        placeholder={t('accounting.new.no_project')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <SearchSelect
                        value={line.vehicle_id}
                        onChange={(v) => updateLine(line.uid, { vehicle_id: v })}
                        options={vehicleOptionsFor(line.company_id)}
                        placeholder={t('accounting.new.line_vehicle_ph')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        value={line.description}
                        onChange={(e) => {
                          const v = e.target.value
                          // The first line's البيان fills the lines still in sync with
                          // it (blank or matching) — type once on a fresh entry, but
                          // never wipe distinct per-line descriptions when editing.
                          if (idx === 0) {
                            const prev = line.description
                            setLines((ls) =>
                              ls.map((l, i) =>
                                i === 0 || !l.description.trim() || l.description === prev
                                  ? { ...l, description: v }
                                  : l,
                              ),
                            )
                          } else updateLine(line.uid, { description: v })
                        }}
                        placeholder={t('common.description')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <SearchSelect
                        value={line.currency}
                        onChange={(v) => {
                          const c = v as Currency
                          // Changing the FIRST line's currency converts the whole
                          // entry (lines still sharing its previous currency), and
                          // every line stays individually editable — so a tasarif
                          // (currency exchange) can still mix USD and IQD lines.
                          if (idx === 0) {
                            const prev = line.currency
                            setLines((ls) =>
                              ls.map((l, i) =>
                                i === 0 || l.currency === prev
                                  ? { ...l, currency: c, price: rateFor(c, l.price) }
                                  : l,
                              ),
                            )
                          } else updateLine(line.uid, { currency: c, price: rateFor(c, line.price) })
                        }}
                        // Labels carry the quick-entry digit: type 1 → IQD, 2 → USD.
                        options={CONVERTIBLE.map((c, i) => ({ value: c, label: `${i + 1} — ${c}` }))}
                        placeholder={t('common.select')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput
                        className="text-start tabular-nums"
                        value={line.price}
                        disabled={line.currency === 'IQD'}
                        onValueChange={(v) => updateLine(line.uid, { price: v })}
                      />
                    </td>
                    {/* القيمة — the line's dinar value (amount × rate), read-only */}
                    <td className="px-2 py-3.5 text-end text-xs tabular-nums text-slate-500">
                      {num(line.debit) || num(line.credit)
                        ? formatCurrency((num(line.debit) || num(line.credit)) * lineRate(line), 'IQD', lang)
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        tabIndex={-1}
                        title={t('accounting.new.remove_line')}
                        onClick={() => removeLine(line.uid)}
                        disabled={lines.length <= 2}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <td className="px-2 py-2.5 text-start">{t('common.total')}</td>
                  <td className="px-2 py-2.5 tabular-nums text-emerald-700">{formatCurrency(displayDebit, displayCurrency, lang)}</td>
                  <td className="px-2 py-2.5 tabular-nums text-sky-700">{formatCurrency(displayCredit, displayCurrency, lang)}</td>
                  <td colSpan={7} />
                  <td className="px-2 py-2.5 text-end tabular-nums">{formatCurrency(totalDebit, 'IQD', lang)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </Dialog>
  )
}

function BalanceIndicator({
  balanced,
  totalDebit,
  totalCredit,
  diff,
  currency,
  lang,
  t,
}: {
  balanced: boolean
  totalDebit: number
  totalCredit: number
  diff: number
  currency: Currency
  lang: 'ar' | 'en'
  t: (k: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className="font-medium text-emerald-700">{t('accounting.new.total_debit')}:</span>
        <span className="tabular-nums">{formatCurrency(totalDebit, currency, lang)}</span>
      </span>
      <span className="text-slate-300">|</span>
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className="font-medium text-sky-700">{t('accounting.new.total_credit')}:</span>
        <span className="tabular-nums">{formatCurrency(totalCredit, currency, lang)}</span>
      </span>
      <span
        className={
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ' +
          (balanced ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200')
        }
      >
        {balanced ? (
          <>
            <Check className="h-3.5 w-3.5" />
            {t('accounting.new.balanced')}
          </>
        ) : (
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('accounting.new.diff')}: {formatCurrency(Math.abs(diff), currency, lang)}
          </>
        )}
      </span>
    </div>
  )
}
