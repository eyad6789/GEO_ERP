import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Coins, Plus, ArrowDownToLine, ArrowUpFromLine, Banknote } from 'lucide-react'
import { Card, CardHeader, Badge } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Account } from '../../types'
import { CASH_PARENT, CASH_BOX_USD, BANKS_ACCOUNT, type TrialBalanceResp, type CashMovement, type AdvanceSplit } from './shared'
import { AdvanceCard } from './AdvanceCard'

interface Movement extends CashMovement {
  type: 'RECEIPT' | 'PAYMENT'
  amount: number
}

export function CashTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()

  const { data: accounts } = useResource<Account>('accounts')
  const { data: trial } = useApi<TrialBalanceResp>('/reports/trial-balance', companyId ? { company_id: companyId } : undefined)
  const { data: mv, loading } = useApi<{ rows: CashMovement[] }>(
    '/accounting/cash-movements',
    companyId ? { company_id: companyId, limit: 10 } : { limit: 10 },
  )

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
  const nameOf = (code: string | null) => {
    const a = accounts.find((x) => x.code === code)
    return a ? pickName(a, lang) : code || '—'
  }

  // Each صندوق under النقود (18), except the banks header (183).
  const cashBoxes = useMemo(() => {
    const isUsd = (a: Account) => a.code === CASH_BOX_USD || /\$|دولار|usd/i.test(`${a.name_ar} ${a.name_en}`)
    return accounts
      .filter((a) => a.parent_code === CASH_PARENT && a.code !== BANKS_ACCOUNT && a.archived !== 1)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((a) => ({
        code: a.code,
        name: pickName(a, lang),
        currency: (isUsd(a) ? 'USD' : 'IQD') as 'IQD' | 'USD',
        iqd: iqdMap.get(a.code) ?? 0,
        usd: usdMap.get(a.code) ?? 0,
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, iqdMap, usdMap, lang])

  const totalIqd = cashBoxes.reduce((s, c) => s + c.iqd, 0)
  const totalUsd = cashBoxes.reduce((s, c) => s + c.usd, 0)
  // Operational advance funded from CASH (split server-side by funding source).
  const { data: advSplit } = useApi<AdvanceSplit>('/accounting/advance-split', companyId ? { company_id: companyId } : undefined)
  const advance = advSplit?.cash ?? { iqd: 0, usd: 0 }

  const movements: Movement[] = useMemo(
    () => (mv?.rows ?? []).map((m) => ({ ...m, type: m.debit > 0 ? 'RECEIPT' : 'PAYMENT', amount: m.debit > 0 ? m.debit : m.credit })),
    [mv],
  )

  const moveColumns: Column<Movement>[] = [
    {
      key: 'type',
      header: t('accounting.vouchers.kind'),
      render: (m) =>
        m.type === 'RECEIPT' ? (
          <Badge color="green"><ArrowDownToLine className="h-3 w-3" />{t('accounting.cash.in')}</Badge>
        ) : (
          <Badge color="red"><ArrowUpFromLine className="h-3 w-3" />{t('accounting.cash.out')}</Badge>
        ),
    },
    { key: 'date', header: t('accounting.journal.date'), render: (m) => formatDate(m.date, lang) },
    { key: 'cash_account', header: t('accounting.vouchers.cash_account'), render: (m) => nameOf(m.cash_account) },
    { key: 'description', header: t('accounting.journal.desc'), render: (m) => <span className="text-slate-600">{m.description || '—'}</span> },
    {
      key: 'amount',
      header: t('accounting.vouchers.amount'),
      align: 'end',
      render: (m) => (
        <span className={'tabular-nums font-semibold ' + (m.type === 'RECEIPT' ? 'text-emerald-700' : 'text-red-600')}>
          {m.type === 'RECEIPT' ? '+' : '−'}
          {formatCurrency(m.amount, m.currency, lang)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('accounting.cash.total_iqd')} value={formatCurrency(totalIqd, 'IQD', lang)} icon={<Wallet className="h-5 w-5" />} accent="primary" />
        <KpiCard label={t('accounting.cash.total_usd')} value={formatCurrency(totalUsd, 'USD', lang)} icon={<Coins className="h-5 w-5" />} accent="success" />
        <AdvanceCard iqd={advance.iqd} usd={advance.usd} lang={lang} t={t} />
      </div>

      <Card>
        <CardHeader
          title={t('accounting.cash.boxes')}
          icon={<Wallet className="h-5 w-5" />}
          action={
            <Link
              to="/accounting?tab=chart"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('accounting.cash.add_box')}
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          {cashBoxes.map((c) => (
            <Link
              key={c.code}
              to={`/accounting/accounts/${c.code}`}
              className={
                'group rounded-2xl border p-6 transition hover:border-primary hover:shadow-card-hover ' +
                (c.currency === 'IQD' ? 'border-primary/30 bg-primary/5' : 'border-slate-200')
              }
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-sm text-slate-400">
                  <Banknote className="h-4 w-4" />
                  {c.code}
                </span>
                <Badge color={c.currency === 'IQD' ? 'blue' : 'green'}>{c.currency}</Badge>
              </div>
              <p className="mt-1.5 text-lg font-bold text-slate-800 group-hover:text-primary">{c.name}</p>
              <p className="mt-3 text-2xl font-bold tabular-nums text-primary">
                {formatCurrency(c.currency === 'USD' ? c.usd : c.iqd, c.currency, lang)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{t('accounting.cash.current_balance')}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={t('accounting.cash.recent')} icon={<Wallet className="h-5 w-5" />} />
        <ArabicTable columns={moveColumns} data={movements} loading={loading} rowKey={(m, i) => `${m.entry_id}-${i}`} searchable={false} pageSize={8} emptyTitle={t('accounting.vouchers.empty')} />
      </Card>
    </div>
  )
}
