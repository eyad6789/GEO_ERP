import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Truck, Scale, ChevronLeft } from 'lucide-react'
import { Card, CardHeader } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, pickName } from '../../lib/format'
import type { Account } from '../../types'
import { AR_PARENT, AP_PARENT, resolvePostingDescendants, type TrialBalanceResp } from './shared'

interface PartyRow {
  code: string
  name: string
  iqd: number
  usd: number
}

export function PartiesTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const navigate = useNavigate()

  const { data: accounts, loading } = useResource<Account>('accounts')
  const { data: trial } = useApi<TrialBalanceResp>('/reports/trial-balance', companyId ? { company_id: companyId } : undefined)

  // Balance per account code, IQD and USD kept separate (never converted).
  const balance = useMemo(() => {
    const iqd = new Map<string, number>()
    const usd = new Map<string, number>()
    for (const r of trial?.rows ?? []) {
      iqd.set(r.code, r.balance_iqd ?? r.balance)
      usd.set(r.code, r.balance_usd ?? 0)
    }
    return { iqd, usd }
  }, [trial])

  // Everything under the debtors root (16 المدينون) = customers/receivables,
  // everything under the creditors root (26 الدائنون) = suppliers/payables —
  // all posting leaves, resolved straight from the chart of accounts.
  const customerCodes = useMemo(() => new Set(resolvePostingDescendants([AR_PARENT], accounts)), [accounts])
  const supplierCodes = useMemo(() => new Set(resolvePostingDescendants([AP_PARENT], accounts)), [accounts])

  const toRows = (codes: Set<string>): PartyRow[] =>
    accounts
      .filter((a) => codes.has(a.code))
      .map((a) => ({ code: a.code, name: pickName(a, lang), iqd: balance.iqd.get(a.code) ?? 0, usd: balance.usd.get(a.code) ?? 0 }))
      .sort((a, b) => Math.abs(b.iqd) - Math.abs(a.iqd))

  const receivables = useMemo(() => toRows(customerCodes), [accounts, customerCodes, balance, lang]) // eslint-disable-line react-hooks/exhaustive-deps
  const payables = useMemo(() => toRows(supplierCodes), [accounts, supplierCodes, balance, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalARi = receivables.reduce((s, r) => s + r.iqd, 0)
  const totalARu = receivables.reduce((s, r) => s + r.usd, 0)
  const totalAPi = payables.reduce((s, r) => s + r.iqd, 0)
  const totalAPu = payables.reduce((s, r) => s + r.usd, 0)

  const dash = <span className="text-slate-300 dark:text-slate-600">—</span>
  const columns = (accent: string): Column<PartyRow>[] => [
    { key: 'name', header: t('accounting.chart.name'), render: (r) => <span className="text-slate-700 dark:text-slate-200">{r.name}</span> },
    {
      key: 'iqd',
      header: t('accounting.parties.balance_iqd'),
      align: 'end',
      accessor: (r) => r.iqd,
      render: (r) => (r.iqd ? <span className={'tabular-nums font-semibold ' + accent}>{formatCurrency(r.iqd, 'IQD', lang)}</span> : dash),
    },
    {
      key: 'usd',
      header: t('accounting.parties.balance_usd'),
      align: 'end',
      accessor: (r) => r.usd,
      render: (r) => (r.usd ? <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(r.usd, 'USD', lang)}</span> : dash),
    },
    { key: 'go', header: '', width: '36px', align: 'end', render: () => <ChevronLeft className="h-4 w-4 text-slate-300 dark:text-slate-600 rtl:rotate-180" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('accounting.parties.total_ar')}
          value={<CurrencyPair iqd={totalARi} usd={totalARu} lang={lang} />}
          icon={<Users className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('accounting.parties.total_ap')}
          value={<CurrencyPair iqd={totalAPi} usd={totalAPu} lang={lang} />}
          icon={<Truck className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label={t('accounting.parties.net')}
          value={<CurrencyPair iqd={totalARi - totalAPi} usd={totalARu - totalAPu} lang={lang} />}
          icon={<Scale className="h-5 w-5" />}
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={t('accounting.parties.receivables')} subtitle={t('accounting.parties.receivables_sub')} icon={<Users className="h-5 w-5" />} />
          <ArabicTable
            columns={columns('text-emerald-700 dark:text-emerald-300')}
            data={receivables}
            loading={loading}
            rowKey={(r) => r.code}
            onRowClick={(r) => navigate(`/accounting/accounts/${r.code}`)}
            searchable={false}
            emptyTitle={t('accounting.parties.empty')}
          />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={t('accounting.parties.payables')} subtitle={t('accounting.parties.payables_sub')} icon={<Truck className="h-5 w-5" />} />
          <ArabicTable
            columns={columns('text-amber-700 dark:text-amber-300')}
            data={payables}
            loading={loading}
            rowKey={(r) => r.code}
            onRowClick={(r) => navigate(`/accounting/accounts/${r.code}`)}
            searchable={false}
            emptyTitle={t('accounting.parties.empty')}
          />
        </Card>
      </div>
    </div>
  )
}

function CurrencyPair({ iqd, usd, lang }: { iqd: number; usd: number; lang: 'ar' | 'en' }) {
  return (
    <span className="inline-flex flex-col">
      <span>{formatCurrency(iqd, 'IQD', lang)}</span>
      {usd ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">{formatCurrency(usd, 'USD', lang)}</span> : null}
    </span>
  )
}
