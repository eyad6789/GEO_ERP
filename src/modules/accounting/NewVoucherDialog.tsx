import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ReceiptText } from 'lucide-react'
import { Dialog, Button, Field, Input, SearchSelect, useToast } from '../../components/ui'
import { NumberInput } from '../../components/shared'
import { useResource } from '../../hooks/useResource'
import { useFormNav } from '../../hooks/useFormNav'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiPost } from '../../lib/api'
import { formatCurrency, pickName } from '../../lib/format'
import { CURRENCIES, type Account, type Company, type Project, type Currency } from '../../types'
import { CASH_BOX_ROOTS, BANK_ROOTS, localToday, resolvePostingDescendants, firstExistingCode } from './shared'
import { DateField } from './DateField'

type VoucherType = 'RECEIPT' | 'PAYMENT'

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function NewVoucherDialog({
  open,
  onClose,
  onCreated,
  defaultType = 'RECEIPT',
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  defaultType?: VoucherType
}) {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const { success, error } = useToast()
  const formNav = useFormNav()

  const today = localToday()
  const { data: companies } = useResource<Company>('companies')
  const { data: accounts } = useResource<Account>('accounts')

  const [type, setType] = useState<VoucherType>(defaultType)
  const [company, setCompany] = useState(companyId ?? '')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(today)
  const [cashAccount, setCashAccount] = useState('')
  const [counterAccount, setCounterAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [party, setParty] = useState('')
  const [currency, setCurrency] = useState<Currency>('IQD')
  const [submitting, setSubmitting] = useState(false)

  const { data: projects } = useResource<Project>('projects', company ? { company_id: company } : undefined)

  // Cash / bank posting accounts, resolved from whichever chart is loaded
  // (181/182/183 in the demo, or 1111/1112 in the production IFRS chart) — never
  // hardcode '181', which does not exist on the production chart.
  const cashCodes = useMemo(() => resolvePostingDescendants([...CASH_BOX_ROOTS, ...BANK_ROOTS], accounts), [accounts])
  const cashCodeSet = useMemo(() => new Set(cashCodes), [cashCodes])
  const defaultCash = useMemo(
    () => firstExistingCode([...CASH_BOX_ROOTS, ...BANK_ROOTS], cashCodeSet) ?? cashCodes[0] ?? '',
    [cashCodes, cashCodeSet],
  )

  // sync the toggle to the type chosen from the "new" menu each time it opens
  useEffect(() => {
    if (open) setType(defaultType)
  }, [open, defaultType])

  // Default the cash box once the chart has loaded (or the dialog re-opens empty).
  useEffect(() => {
    if (open && !cashAccount && defaultCash) setCashAccount(defaultCash)
  }, [open, cashAccount, defaultCash])

  const nameOf = (code: string) => {
    const a = accounts.find((x) => x.code === code)
    return a ? `${code} — ${pickName(a, lang)}` : code
  }
  const cashOptions = useMemo(
    () =>
      accounts
        .filter((a) => cashCodeSet.has(a.code))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.code, label: `${a.code} — ${pickName(a, lang)}` })),
    [accounts, cashCodeSet, lang],
  )
  const counterOptions = useMemo(
    () =>
      accounts
        .filter((a) => a.is_posting === 1 && !cashCodeSet.has(a.code))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.code, label: `${a.code} — ${pickName(a, lang)}` })),
    [accounts, cashCodeSet, lang],
  )

  // Smart autofill for the beneficiary/payer field: companies, projects and
  // counter-account names are all plausible parties.
  const partySuggestions = useMemo(() => {
    const set = new Set<string>()
    companies.forEach((c) => set.add(pickName(c, lang)))
    projects.forEach((p) => set.add(pickName(p, lang)))
    accounts
      .filter((a) => a.is_posting === 1 && !cashCodeSet.has(a.code))
      .forEach((a) => set.add(pickName(a, lang)))
    return Array.from(set).filter(Boolean)
  }, [companies, projects, accounts, cashCodeSet, lang])

  // Selecting the counter account automatically categorises the voucher:
  // revenue / asset → receipt (money in); expense / liability → payment (out).
  const handleCounterChange = (code: string) => {
    setCounterAccount(code)
    const a = accounts.find((x) => x.code === code)
    if (!a) return
    if (a.type === 'REVENUE' || a.type === 'ASSET') setType('RECEIPT')
    else if (a.type === 'EXPENSE' || a.type === 'LIABILITY') setType('PAYMENT')
  }

  const reset = () => {
    setType(defaultType)
    setCompany(companyId ?? '')
    setProjectId('')
    setDate(today)
    setCashAccount(defaultCash)
    setCounterAccount('')
    setAmount('')
    setParty('')
    setCurrency('IQD')
  }

  const close = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const amt = num(amount)
  // Receipt: cash debited, counter credited. Payment: counter debited, cash credited.
  const debitAccount = type === 'RECEIPT' ? cashAccount : counterAccount
  const creditAccount = type === 'RECEIPT' ? counterAccount : cashAccount

  const submit = async () => {
    if (!company || !cashAccount || !counterAccount) return error(t('accounting.voucher.err_fields'))
    if (amt <= 0) return error(t('accounting.voucher.err_amount'))

    const label = type === 'RECEIPT' ? t('accounting.vouchers.receipt') : t('accounting.vouchers.payment')
    const description = party.trim() ? `${label} — ${party.trim()}` : label
    const prefix = type === 'RECEIPT' ? 'RV' : 'PV'

    const body = {
      company_id: company,
      project_id: projectId || null,
      date,
      currency,
      serial_number: `${prefix}-${Date.now().toString().slice(-6)}`,
      description,
      lines: [
        { account_code: debitAccount, debit: amt, credit: 0, description },
        { account_code: creditAccount, debit: 0, credit: amt, description },
      ],
    }

    setSubmitting(true)
    try {
      await apiPost('/journal_entries', body)
      success(t('accounting.voucher.saved'))
      reset()
      onCreated()
      onClose()
    } catch (e) {
      error((e as Error)?.message || t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const isReceipt = type === 'RECEIPT'

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          {t('accounting.voucher.title')}
        </span>
      }
      description={t('accounting.voucher.desc')}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={close} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? t('accounting.new.saving') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4" {...formNav}>
        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('RECEIPT')}
            className={
              'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ' +
              (isReceipt ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800')
            }
          >
            <ArrowDownToLine className="h-5 w-5" />
            {t('accounting.vouchers.receipt')}
          </button>
          <button
            type="button"
            onClick={() => setType('PAYMENT')}
            className={
              'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ' +
              (!isReceipt ? 'border-red-400 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800')
            }
          >
            <ArrowUpFromLine className="h-5 w-5" />
            {t('accounting.vouchers.payment')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('accounting.new.company')} required>
            <SearchSelect
              value={company}
              onChange={(v) => {
                setCompany(v)
                setProjectId('')
              }}
              options={companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))}
              placeholder={t('common.search')}
            />
          </Field>
          <Field label={t('accounting.new.project')}>
            <SearchSelect
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: pickName(p, lang) }))}
              placeholder={t('accounting.new.no_project')}
            />
          </Field>
          <Field label={t('accounting.voucher.cash_account')} required>
            <SearchSelect value={cashAccount} onChange={setCashAccount} options={cashOptions} placeholder={t('common.search')} />
          </Field>
          <Field label={t('accounting.voucher.counter')} required>
            <SearchSelect
              value={counterAccount}
              onChange={handleCounterChange}
              options={counterOptions}
              placeholder={t('common.search')}
            />
          </Field>
          <Field label={t('accounting.voucher.amount')} required>
            <NumberInput value={amount} onValueChange={setAmount} className="tabular-nums" />
          </Field>
          <Field label={t('accounting.new.currency')} required>
            <SearchSelect value={currency} onChange={(v) => setCurrency(v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} placeholder={t('common.search')} />
          </Field>
          <Field label={t('accounting.voucher.party')} className="sm:col-span-2">
            <Input
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder={t('accounting.voucher.party_ph')}
              list="voucher-party-list"
              autoComplete="off"
            />
            <datalist id="voucher-party-list">
              {partySuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label={t('accounting.new.date')} required className="sm:col-span-2">
            <DateField value={date} onChange={setDate} />
          </Field>
        </div>

        {/* Live entry preview */}
        {amt > 0 && counterAccount && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 text-sm">
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{t('accounting.voucher.preview')}</p>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 dark:text-emerald-300">{nameOf(debitAccount)}</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {t('accounting.new.line_debit')} {formatCurrency(amt, currency, lang)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sky-700 dark:text-sky-300">{nameOf(creditAccount)}</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {t('accounting.new.line_credit')} {formatCurrency(amt, currency, lang)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
