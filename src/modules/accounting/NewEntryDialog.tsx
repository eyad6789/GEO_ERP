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
import { isBalanced, type JournalEntryFull } from './shared'
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
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  editId?: string | null
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

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [docNumber, setDocNumber] = useState('')
  const [lines, setLines] = useState<LineState[]>(blankLines(companyId ?? ''))
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // قيد / سند قبض / سند صرف — all three use the same line editor below.
  const [mode, setMode] = useState<'JOURNAL' | 'RECEIPT' | 'PAYMENT'>('JOURNAL')

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

  // A car can be tagged on ANY expense line (not just fuel/maintenance), so the
  // manager can record spending on a vehicle through any expense account and it
  // still posts to that car's real costs. The picker shows on every expense line.
  const vehicleExpenseCodes = useMemo(
    () => new Set(accounts.filter((a) => a.type === 'EXPENSE' && a.is_posting === 1).map((a) => a.code)),
    [accounts],
  )
  const vehicleOptions = useMemo(
    () => vehicles.slice().sort((a, b) => a.code.localeCompare(b.code)).map((v) => ({ value: v.id, label: `${v.code} — ${pickName(v, lang)}` })),
    [vehicles, lang],
  )
  // The vehicle column is hidden entirely until at least one line uses a
  // vehicle-expense account (بنزين/صيانة/…); then it appears for the whole grid.
  const showVehicleCol = lines.some((l) => vehicleExpenseCodes.has(l.account_code))

  // First cash/bank account — used to pre-fill the cash line for قبض / صرف.
  const defaultCashAccount = useMemo(
    () =>
      accounts
        .filter((a) => a.is_posting === 1 && (a.parent_code === '18' || a.parent_code === '183'))
        .sort((a, b) => a.code.localeCompare(b.code))[0]?.code ?? '',
    [accounts],
  )

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

  const updateLine = (uid: number, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)))
  const addLine = () => setLines((ls) => [...ls, blankLine(companyId ?? '')])
  const removeLine = (uid: number) =>
    setLines((ls) => (ls.length <= 2 ? ls : ls.filter((l) => l.uid !== uid)))

  const reset = () => {
    setDate(today)
    setDocNumber('')
    setLines(blankLines(companyId ?? ''))
    setMode('JOURNAL')
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

  const handleClose = () => {
    if (submitting || deleting) return
    reset()
    onClose()
  }

  // Keyboard: F5 saves the entry (without reloading the page), Escape exits
  // without saving. Everything else falls through to the grid navigation.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // F5 saves; Escape exits. Ctrl/Cmd+S is handled at the document level (see
    // the keydown effect below) so it fires regardless of which field has focus.
    if (e.key === 'F5') {
      e.preventDefault()
      if (!submitting && !deleting && canSubmit) handleSubmit()
      return
    }
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
        // Only keep a vehicle tag if the account is actually a vehicle expense.
        vehicle_id: vehicleExpenseCodes.has(l.account_code) ? l.vehicle_id || null : null,
      })),
    }

    setSubmitting(true)
    try {
      if (editId) await apiPut(`/journal_entries/${editId}`, body)
      else await apiPost('/journal_entries', body)
      success(t('accounting.new.saved'))
      reset()
      onCreated()
      onClose()
    } catch (e) {
      error((e as Error)?.message || t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  // Ctrl/Cmd+S saves from anywhere in the dialog. Captured at the document level
  // (capture phase) with preventDefault so the browser's "Save page" never opens.
  // A ref holds the latest save so a single listener always sees current state.
  const saveRef = useRef<() => void>(() => {})
  saveRef.current = () => { if (!submitting && !deleting && canSubmit) handleSubmit() }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="2xl"
      title={
        <span className="flex items-center gap-2">
          {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
          {isEdit ? t('accounting.edit.title') : t('accounting.new.title')}
        </span>
      }
      description={isEdit ? t('accounting.edit.desc') : t('accounting.new.desc')}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <BalanceIndicator balanced={balanced} totalDebit={totalDebit} totalCredit={totalCredit} diff={diff} lang={lang} t={t} />
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
            <Field label={t('accounting.new.doc_number')} required hint={t('accounting.new.doc_number_hint')}>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder={t('accounting.new.doc_number_ph')} className="font-mono" />
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

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2.5 text-start">{t('common.company')}</th>
                  <th className="px-2 py-2.5 text-start">{t('common.project')}</th>
                  <th className="px-2 py-2.5 text-start">{t('accounting.new.line_account')}</th>
                  {showVehicleCol && <th className="w-40 px-2 py-2.5 text-start">{t('accounting.new.line_vehicle')}</th>}
                  <th className="w-28 px-2 py-2.5 text-start">{t('accounting.new.line_debit')}</th>
                  <th className="w-28 px-2 py-2.5 text-start">{t('accounting.new.line_credit')}</th>
                  <th className="px-2 py-2.5 text-start">{t('common.description')}</th>
                  <th className="w-24 px-2 py-2.5 text-start">{t('accounting.new.currency')}</th>
                  <th className="w-28 px-2 py-2.5 text-start">{t('accounting.new.currency_rate')}</th>
                  <th className="w-10 px-1 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr key={line.uid} className="align-top">
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
                        value={line.account_code}
                        onChange={(v) => updateLine(line.uid, { account_code: v, vehicle_id: vehicleExpenseCodes.has(v) ? line.vehicle_id : '' })}
                        options={accountOptions}
                        placeholder={t('accounting.new.line_account_ph')}
                      />
                    </td>
                    {/* Vehicle column appears only once a line uses a vehicle-expense
                        account; the picker itself shows only on those lines. */}
                    {showVehicleCol && (
                      <td className="px-2 py-2">
                        {vehicleExpenseCodes.has(line.account_code) ? (
                          <SearchSelect
                            value={line.vehicle_id}
                            onChange={(v) => updateLine(line.uid, { vehicle_id: v })}
                            options={vehicleOptions}
                            placeholder={t('accounting.new.line_vehicle_ph')}
                          />
                        ) : (
                          <span className="block px-2 py-2 text-xs text-slate-300">—</span>
                        )}
                      </td>
                    )}
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
                      <Input
                        value={line.description}
                        onChange={(e) => {
                          const v = e.target.value
                          // The first line's البيان fills every line (type once).
                          if (idx === 0) setLines((ls) => ls.map((l) => ({ ...l, description: v })))
                          else updateLine(line.uid, { description: v })
                        }}
                        placeholder={t('common.description')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <SearchSelect
                        value={line.currency}
                        onChange={(v) => {
                          const c = v as Currency
                          // Currency is PER LINE so a tasarif (currency exchange) can
                          // mix a USD line with an IQD line in the same entry.
                          updateLine(line.uid, { currency: c, price: rateFor(c, line.price) })
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
                  <td className="px-2 py-2.5 text-end" colSpan={showVehicleCol ? 4 : 3}>{t('common.total')}</td>
                  <td className="px-2 py-2.5 tabular-nums text-emerald-700">{formatCurrency(totalDebit, 'IQD', lang)}</td>
                  <td className="px-2 py-2.5 tabular-nums text-sky-700">{formatCurrency(totalCredit, 'IQD', lang)}</td>
                  <td colSpan={4} />
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
  lang,
  t,
}: {
  balanced: boolean
  totalDebit: number
  totalCredit: number
  diff: number
  lang: 'ar' | 'en'
  t: (k: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className="font-medium text-emerald-700">{t('accounting.new.total_debit')}:</span>
        <span className="tabular-nums">{formatCurrency(totalDebit, 'IQD', lang)}</span>
      </span>
      <span className="text-slate-300">|</span>
      <span className="flex items-center gap-1.5 text-slate-500">
        <span className="font-medium text-sky-700">{t('accounting.new.total_credit')}:</span>
        <span className="tabular-nums">{formatCurrency(totalCredit, 'IQD', lang)}</span>
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
            {t('accounting.new.diff')}: {formatCurrency(Math.abs(diff), 'IQD', lang)}
          </>
        )}
      </span>
    </div>
  )
}
