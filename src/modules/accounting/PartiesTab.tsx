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
import { CUSTOMER_ROOTS, SUPPLIER_ROOTS, resolvePostingDescendants, type TrialBalanceResp } from './shared'

interface PartyRow {
  code: string
  name: string
  balance: number
}

export function PartiesTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const navigate = useNavigate()

  const { data: accounts, loading } = useResource<Account>('accounts')
  const { data: trial } = useApi<TrialBalanceResp>('/reports/trial-balance', companyId ? { company_id: companyId } : undefined)

  const balanceMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of trial?.rows ?? []) m.set(r.code, r.balance)
    return m
  }, [trial])

  // Posting leaves under each configured node (chart-agnostic via the tree).
  const customerCodes = useMemo(() => new Set(resolvePostingDescendants(CUSTOMER_ROOTS, accounts)), [accounts])
  const supplierCodes = useMemo(() => new Set(resolvePostingDescendants(SUPPLIER_ROOTS, accounts)), [accounts])

  // Customers (العملاء) = debit-normal, balance positive. Suppliers (الموردون)
  // here come from the debtors tree, so they read as debit-normal too.
  const receivables: PartyRow[] = useMemo(
    () =>
      accounts
        .filter((a) => customerCodes.has(a.code))
        .map((a) => ({ code: a.code, name: pickName(a, lang), balance: balanceMap.get(a.code) ?? 0 }))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [accounts, customerCodes, balanceMap, lang],
  )
  const payables: PartyRow[] = useMemo(
    () =>
      accounts
        .filter((a) => supplierCodes.has(a.code))
        .map((a) => ({ code: a.code, name: pickName(a, lang), balance: balanceMap.get(a.code) ?? 0 }))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [accounts, supplierCodes, balanceMap, lang],
  )

  const totalAR = receivables.reduce((s, r) => s + r.balance, 0)
  const totalAP = payables.reduce((s, r) => s + r.balance, 0)

  const columns = (accent: string): Column<PartyRow>[] => [
    { key: 'code', header: t('accounting.chart.code'), width: '80px', render: (r) => <span className="font-mono text-xs font-semibold text-slate-500">{r.code}</span> },
    { key: 'name', header: t('accounting.chart.name'), render: (r) => <span className="text-slate-700">{r.name}</span> },
    {
      key: 'balance',
      header: t('accounting.parties.balance'),
      align: 'end',
      accessor: (r) => r.balance,
      render: (r) => <span className={'tabular-nums font-semibold ' + accent}>{formatCurrency(r.balance, 'IQD', lang)}</span>,
    },
    { key: 'go', header: '', width: '36px', align: 'end', render: () => <ChevronLeft className="h-4 w-4 text-slate-300 rtl:rotate-180" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('accounting.parties.total_ar')} value={formatCurrency(totalAR, 'IQD', lang)} icon={<Users className="h-5 w-5" />} accent="info" />
        <KpiCard label={t('accounting.parties.total_ap')} value={formatCurrency(totalAP, 'IQD', lang)} icon={<Truck className="h-5 w-5" />} accent="warning" />
        <KpiCard label={t('accounting.parties.net')} value={formatCurrency(totalAR - totalAP, 'IQD', lang)} icon={<Scale className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title={t('accounting.parties.receivables')} icon={<Users className="h-5 w-5" />} />
          <ArabicTable
            columns={columns('text-emerald-700')}
            data={receivables}
            loading={loading}
            rowKey={(r) => r.code}
            onRowClick={(r) => navigate(`/accounting/accounts/${r.code}`)}
            searchable={false}
            pageSize={20}
            emptyTitle={t('accounting.parties.empty')}
          />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={t('accounting.parties.payables')} icon={<Truck className="h-5 w-5" />} />
          <ArabicTable
            columns={columns('text-amber-700')}
            data={payables}
            loading={loading}
            rowKey={(r) => r.code}
            onRowClick={(r) => navigate(`/accounting/accounts/${r.code}`)}
            searchable={false}
            pageSize={20}
            emptyTitle={t('accounting.parties.empty')}
          />
        </Card>
      </div>
    </div>
  )
}
