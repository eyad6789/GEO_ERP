import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Coins, Plus, Pencil, Trash2, Lock } from 'lucide-react'
import { Card, CardHeader, Button, Badge } from '../../components/ui'
import { ArabicTable, KpiCard, EmptyState, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, pickName } from '../../lib/format'
import type { Account, Bank } from '../../types'
import { BANK_ROOTS, resolvePostingDescendants, canEditAccounting, type TrialBalanceResp } from './shared'
import { NewBankDialog } from './NewBankDialog'

export function BankTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId, role } = useCompany()
  const canEdit = canEditAccounting(role.key)

  const { data: banks, loading, refetch, remove } = useResource<Bank>(
    'banks',
    companyId ? { company_id: companyId } : undefined,
  )
  // The chart of accounts + live per-account balances (from the trial balance),
  // so bank balances move with the journal exactly like the Cash tab's boxes.
  const { data: accounts } = useResource<Account>('accounts')
  const { data: trial } = useApi<TrialBalanceResp>(
    '/reports/trial-balance',
    companyId ? { company_id: companyId } : undefined,
  )
  const [bankDialog, setBankDialog] = useState<{ open: boolean; bank: Bank | null }>({ open: false, bank: null })

  // Live balance per account code (IQD and USD kept separate — never converted).
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

  // Bank posting accounts resolved from whichever chart is loaded — the 183
  // sub-accounts (المصارف) in the Iraqi chart, or 1112 in an IFRS chart.
  const bankCodeSet = useMemo(() => new Set(resolvePostingDescendants(BANK_ROOTS, accounts)), [accounts])

  // A managed bank row (branch / account no.) keyed by the GL account it links to.
  const metaByCode = useMemo(() => {
    const m = new Map<string, Bank>()
    for (const b of banks) if (b.account_code) m.set(b.account_code, b)
    return m
  }, [banks])

  // One card per bank account in the chart, with its live balance. A bank added
  // straight into the chart (no managed row) still appears here — that's the
  // "connected to the chart, like cash" behaviour.
  const bankAccounts = useMemo(
    () =>
      accounts
        .filter((a) => bankCodeSet.has(a.code) && a.archived !== 1)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => {
          const meta = metaByCode.get(a.code)
          return {
            code: a.code,
            name: meta ? pickName(meta, lang) : pickName(a, lang),
            branch: meta?.branch ?? null,
            iqd: iqdMap.get(a.code) ?? 0,
            usd: usdMap.get(a.code) ?? 0,
          }
        }),
    [accounts, bankCodeSet, metaByCode, iqdMap, usdMap, lang],
  )

  // Live totals from the chart (each currency summed on its own).
  const totals = useMemo(
    () => ({
      iqd: bankAccounts.reduce((s, b) => s + b.iqd, 0),
      usd: bankAccounts.reduce((s, b) => s + b.usd, 0),
    }),
    [bankAccounts],
  )

  // Live balance for a managed bank: from its linked GL account, else the stored
  // opening balance (for a bank not yet linked to a chart account).
  const liveBankBalance = (b: Bank) => {
    if (b.account_code && (iqdMap.has(b.account_code) || usdMap.has(b.account_code))) {
      return { iqd: iqdMap.get(b.account_code) ?? 0, usd: usdMap.get(b.account_code) ?? 0 }
    }
    return { iqd: b.balance_iqd || 0, usd: b.balance_usd || 0 }
  }

  const handleDelete = async (b: Bank) => {
    if (!window.confirm(t('accounting.bank.confirm_delete'))) return
    await remove(b.id)
  }

  const columns: Column<Bank>[] = [
    { key: 'name', header: t('accounting.bank.name'), render: (b) => <span className="font-medium text-slate-700">{pickName(b, lang)}</span> },
    { key: 'branch', header: t('accounting.bank.branch'), render: (b) => <span className="text-slate-600">{b.branch || '—'}</span> },
    { key: 'balance_iqd', header: t('accounting.bank.balance_iqd'), align: 'end', render: (b) => <span className="tabular-nums text-slate-800">{formatCurrency(liveBankBalance(b).iqd, 'IQD', lang)}</span> },
    { key: 'balance_usd', header: t('accounting.bank.balance_usd'), align: 'end', render: (b) => <span className="tabular-nums text-emerald-700">{formatCurrency(liveBankBalance(b).usd, 'USD', lang)}</span> },
    ...(canEdit
      ? [{
          key: 'actions',
          header: t('common.actions'),
          align: 'center' as const,
          render: (b: Bank) => (
            <div className="flex items-center justify-center gap-1">
              <button type="button" title={t('common.edit')} onClick={(e) => { e.stopPropagation(); setBankDialog({ open: true, bank: b }) }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-primary/10 hover:text-primary">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" title={t('common.delete')} onClick={(e) => { e.stopPropagation(); handleDelete(b) }} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label={t('accounting.bank.total_iqd')} value={formatCurrency(totals.iqd, 'IQD', lang)} icon={<Landmark className="h-5 w-5" />} accent="info" />
        <KpiCard label={t('accounting.bank.total_usd')} value={formatCurrency(totals.usd, 'USD', lang)} icon={<Coins className="h-5 w-5" />} accent="success" />
      </div>

      {/* Bank accounts from the chart of accounts — one live card each, linking to
          the account ledger. Mirrors the Cash tab's boxes. */}
      <Card>
        <CardHeader
          title={t('accounting.bank.accounts')}
          icon={<Landmark className="h-5 w-5" />}
          action={
            <Link
              to="/accounting?tab=chart"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-primary hover:text-primary"
            >
              {t('accounting.bank.accounts_hint')}
            </Link>
          }
        />
        {bankAccounts.length === 0 ? (
          <div className="p-4">
            <EmptyState title={t('accounting.bank.no_accounts')} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {bankAccounts.map((b) => (
              <Link
                key={b.code}
                to={`/accounting/accounts/${b.code}`}
                className="group rounded-2xl border border-slate-200 p-6 transition hover:border-primary hover:shadow-card-hover"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-sm text-slate-400">
                    <Landmark className="h-4 w-4" />
                    {b.code}
                  </span>
                  {b.branch && <Badge color="blue">{b.branch}</Badge>}
                </div>
                <p className="mt-1.5 text-lg font-bold text-slate-800 group-hover:text-primary">{b.name}</p>
                <p className="mt-3 text-2xl font-bold tabular-nums text-primary">{formatCurrency(b.iqd, 'IQD', lang)}</p>
                {b.usd !== 0 && (
                  <p className="mt-1 text-base font-semibold tabular-nums text-emerald-700">{formatCurrency(b.usd, 'USD', lang)}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">{t('accounting.bank.current_balance')}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title={t('accounting.bank.management')}
          icon={<Landmark className="h-5 w-5" />}
          action={
            canEdit ? (
              <Button variant="primary" size="sm" onClick={() => setBankDialog({ open: true, bank: null })}>
                <Plus className="h-4 w-4" />
                {t('accounting.bank.new')}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                {t('accounting.readonly.badge')}
              </span>
            )
          }
        />
        <ArabicTable
          columns={columns}
          data={banks}
          loading={loading}
          rowKey={(b) => b.id}
          searchPlaceholder={t('common.search')}
          pageSize={10}
          emptyTitle={t('accounting.bank.empty')}
          emptyHint={canEdit ? t('accounting.bank.empty_hint') : undefined}
        />
      </Card>

      {canEdit && (
        <NewBankDialog
          open={bankDialog.open}
          editBank={bankDialog.bank}
          onClose={() => setBankDialog({ open: false, bank: null })}
          onSaved={refetch}
        />
      )}
    </div>
  )
}
