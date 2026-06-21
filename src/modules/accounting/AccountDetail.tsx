import { useMemo, useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  FolderTree,
  Wallet,
  BookText,
  Layers,
  CornerDownLeft,
  ListTree,
  Coins,
} from 'lucide-react'
import { Card, CardHeader, Badge, Button } from '../../components/ui'
import { KpiCard, PageHeader, EmptyState, ArabicTable, NoteWidget, type Column } from '../../components/shared'
import { useResource, useApi } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { Account, AccountType } from '../../types'
import { ACCOUNT_TYPE_COLOR, canEditAccounting, type TrialBalanceRow, type TrialBalanceResp, type GeneralLedgerResp, type LedgerRow } from './shared'
import { NewEntryDialog } from './NewEntryDialog'
import { EntryViewDialog } from './EntryViewDialog'

interface Rollup {
  iqd: number // balance converted to IQD
  usd: number // raw USD balance
}

/** Roll posting-account balances up the tree so parents show aggregated totals. */
function buildRollup(accounts: Account[], trial: Map<string, TrialBalanceRow>) {
  const childrenByParent = new Map<string, Account[]>()
  for (const a of accounts) {
    if (a.parent_code) {
      const list = childrenByParent.get(a.parent_code) ?? []
      list.push(a)
      childrenByParent.set(a.parent_code, list)
    }
  }
  const memo = new Map<string, Rollup>()
  const calc = (a: Account): Rollup => {
    const cached = memo.get(a.code)
    if (cached) return cached
    let r: Rollup = { iqd: 0, usd: 0 }
    const kids = childrenByParent.get(a.code) ?? []
    if (kids.length === 0) {
      const tb = trial.get(a.code)
      r = tb ? { iqd: tb.balance_iqd ?? tb.balance, usd: tb.balance_usd ?? 0 } : { iqd: 0, usd: 0 }
    } else {
      for (const k of kids) {
        const cr = calc(k)
        r.iqd += cr.iqd
        r.usd += cr.usd
      }
    }
    memo.set(a.code, r)
    return r
  }
  for (const a of accounts) calc(a)
  return memo
}

export default function AccountDetail() {
  const { code } = useParams<{ code: string }>()
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const { companyId, role } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)

  const { data: accounts, loading } = useResource<Account>('accounts')
  const { data: trialResp, refetch: refetchTrial } = useApi<TrialBalanceResp>('/reports/trial-balance', companyId ? { company_id: companyId } : undefined)

  const account = useMemo(() => accounts.find((a) => a.code === code), [accounts, code])
  const children = useMemo(
    () => accounts.filter((a) => a.parent_code === code).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts, code],
  )
  const ancestors = useMemo(() => {
    const chain: Account[] = []
    let cur = account?.parent_code
    const byCode = new Map(accounts.map((a) => [a.code, a]))
    while (cur) {
      const p = byCode.get(cur)
      if (!p) break
      chain.unshift(p)
      cur = p.parent_code
    }
    return chain
  }, [account, accounts])

  const trialMap = useMemo(() => {
    const m = new Map<string, TrialBalanceRow>()
    for (const r of trialResp?.rows ?? []) m.set(r.code, r)
    return m
  }, [trialResp])

  const rollup = useMemo(() => buildRollup(accounts, trialMap), [accounts, trialMap])
  const myRoll = (account && rollup.get(account.code)) || { iqd: 0, usd: 0 }

  const isPosting = account?.is_posting === 1
  // Only fetch the ledger for posting (leaf) accounts.
  const ledgerParams = companyId ? { account_code: code, company_id: companyId } : { account_code: code }
  const { data: ledgerResp, loading: ledgerLoading, refetch: refetchLedger } = useApi<GeneralLedgerResp>(
    isPosting ? '/reports/general-ledger' : null,
    ledgerParams,
  )
  const ledger = ledgerResp?.rows ?? []
  const ledgerTotals = useMemo(() => {
    let dIqd = 0, cIqd = 0, dUsd = 0, cUsd = 0
    for (const r of ledger) {
      dIqd += r.debit_iqd ?? r.debit
      cIqd += r.credit_iqd ?? r.credit
      if (r.currency === 'USD') {
        dUsd += r.debit
        cUsd += r.credit
      }
    }
    return { dIqd, cIqd, dUsd, cUsd }
  }, [ledger])

  if (!loading && !account) {
    return (
      <div>
        <PageHeader title={t('accounting.account.not_found')} icon={<FolderTree className="h-6 w-6" />} />
        <Card>
          <EmptyState
            title={t('accounting.account.not_found')}
            action={
              <Button onClick={() => navigate('/accounting?tab=chart')} variant="outline" size="sm">
                {t('accounting.account.back')}
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const type = (account?.type ?? 'ASSET') as AccountType
  const drCr = (v: number) =>
    v >= 0 ? t('accounting.account.debit_short') : t('accounting.account.credit_short')

  // ---- children table ----
  const childColumns: Column<Account>[] = [
    {
      key: 'code',
      header: t('accounting.chart.code'),
      width: '90px',
      render: (a) => <span className="font-mono text-xs font-semibold text-slate-500">{a.code}</span>,
    },
    {
      key: 'name',
      header: t('accounting.chart.name'),
      accessor: (a) => pickName(a, lang),
      render: (a) => (
        <span className="inline-flex items-center gap-2">
          {a.is_posting ? (
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          ) : (
            <Layers className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span className={a.is_posting ? 'text-slate-700' : 'font-semibold text-slate-800'}>{pickName(a, lang)}</span>
        </span>
      ),
    },
    {
      key: 'kind',
      header: t('accounting.account.kind'),
      align: 'center',
      render: (a) =>
        a.is_posting ? (
          <Badge color="green">{t('accounting.account.posting')}</Badge>
        ) : (
          <Badge color="gray">{t('accounting.account.header')}</Badge>
        ),
    },
    {
      key: 'balance',
      header: t('accounting.account.balance'),
      align: 'end',
      accessor: (a) => rollup.get(a.code)?.iqd ?? 0,
      render: (a) => {
        const r = rollup.get(a.code) ?? { iqd: 0, usd: 0 }
        return (
          <span className="inline-flex flex-col items-end tabular-nums">
            <span className="font-semibold text-slate-700">{formatCurrency(r.iqd, 'IQD', lang)}</span>
            {r.usd !== 0 && <span className="text-[11px] text-emerald-600">{formatCurrency(r.usd, 'USD', lang)}</span>}
          </span>
        )
      },
    },
    {
      key: 'go',
      header: '',
      align: 'end',
      width: '40px',
      render: () => <ChevronLeft className="h-4 w-4 text-slate-300 rtl:rotate-180" />,
    },
  ]

  // ---- ledger table ----
  const ledgerColumns: Column<LedgerRow>[] = [
    { key: 'date', header: t('accounting.reports.ledger_date'), width: '110px', render: (r) => formatDate(r.date, lang) },
    { key: 'doc_number', header: t('accounting.reports.ledger_doc'), render: (r) => <span className="font-mono text-xs">{r.doc_number || r.serial_number}</span> },
    { key: 'description', header: t('accounting.reports.ledger_desc') },
    {
      key: 'debit',
      header: t('accounting.reports.ledger_debit'),
      align: 'end',
      accessor: (r) => r.debit,
      render: (r) =>
        r.debit ? (
          <span className="tabular-nums text-slate-700">
            {formatCurrency(r.debit, r.currency === 'USD' ? 'USD' : 'IQD', lang)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'credit',
      header: t('accounting.reports.ledger_credit'),
      align: 'end',
      accessor: (r) => r.credit,
      render: (r) =>
        r.credit ? (
          <span className="tabular-nums text-slate-700">
            {formatCurrency(r.credit, r.currency === 'USD' ? 'USD' : 'IQD', lang)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'balance',
      header: t('accounting.reports.ledger_balance'),
      align: 'end',
      accessor: (r) => r.balance,
      render: (r) => (
        <span className="font-semibold tabular-nums text-primary">
          {formatCurrency(r.balance, r.currency === 'USD' ? 'USD' : 'IQD', lang)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2.5">
            <span className="font-mono text-primary">{account?.code}</span>
            <span>{account ? pickName(account, lang) : ''}</span>
          </span>
        }
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
            <Link to="/accounting?tab=chart" className="text-slate-400 hover:text-primary">
              {t('accounting.chart.title')}
            </Link>
            {ancestors.map((p) => (
              <span key={p.code} className="inline-flex items-center gap-1.5">
                <ChevronLeft className="h-3 w-3 text-slate-300 rtl:rotate-180" />
                <Link to={`/accounting/accounts/${p.code}`} className="text-slate-400 hover:text-primary">
                  {pickName(p, lang)}
                </Link>
              </span>
            ))}
          </span>
        }
        icon={<FolderTree className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            {account && <NoteWidget recordType="accounts" recordId={account.code} moduleId="accounting" />}
            <Button variant="outline" size="sm" onClick={() => navigate('/accounting?tab=chart')}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {t('accounting.account.back')}
            </Button>
          </div>
        }
      />

      {/* Identity + KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader title={t('accounting.account.info')} icon={<ListTree className="h-5 w-5" />} />
          <div className="space-y-2.5 p-5 text-sm">
            <Row label={t('accounting.chart.code')} value={<span className="font-mono">{account?.code}</span>} />
            <Row label={t('accounting.chart.type')} value={account && <Badge color={ACCOUNT_TYPE_COLOR[type]}>{t(`accounting.type.${type}`)}</Badge>} />
            <Row
              label={t('accounting.account.normal_balance')}
              value={
                <Badge color={account?.normal_balance === 'DEBIT' ? 'blue' : 'amber'}>
                  {account?.normal_balance === 'DEBIT' ? t('accounting.account.debit_nature') : t('accounting.account.credit_nature')}
                </Badge>
              }
            />
            <Row label={t('accounting.account.level')} value={account?.level} />
            <Row
              label={t('accounting.account.kind')}
              value={
                <Badge color={isPosting ? 'green' : 'gray'}>
                  {isPosting ? t('accounting.account.posting') : t('accounting.account.header')}
                </Badge>
              }
            />
            {account?.parent_code && (
              <Row
                label={t('accounting.account.parent')}
                value={
                  <Link to={`/accounting/accounts/${account.parent_code}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <CornerDownLeft className="h-3.5 w-3.5" />
                    {account.parent_code}
                  </Link>
                }
              />
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3 lg:grid-rows-[auto]">
          <KpiCard label={t('accounting.account.balance_iqd')} value={formatCurrency(myRoll.iqd, 'IQD', lang)} icon={<Wallet className="h-5 w-5" />} accent="primary" />
          <KpiCard label={t('accounting.account.balance_usd')} value={formatCurrency(myRoll.usd, 'USD', lang)} icon={<Coins className="h-5 w-5" />} accent="success" />
          <KpiCard
            label={isPosting ? t('accounting.account.txn_count') : t('accounting.account.sub_count')}
            value={isPosting ? ledger.length : children.length}
            icon={<Layers className="h-5 w-5" />}
            accent="info"
          />
        </div>
      </div>

      {/* Sub-accounts (for header accounts) */}
      {children.length > 0 && (
        <div className="mb-5">
          <Card className="overflow-hidden">
            <CardHeader
              title={`${t('accounting.account.sub_accounts')} (${children.length})`}
              subtitle={t('accounting.account.children_hint')}
              icon={<FolderTree className="h-5 w-5" />}
            />
            <ArabicTable
              columns={childColumns}
              data={children}
              rowKey={(a) => a.code}
              onRowClick={(a) => navigate(`/accounting/accounts/${a.code}`)}
              searchable={false}
              pageSize={50}
            />
          </Card>
        </div>
      )}

      {/* Ledger (for posting accounts) */}
      {isPosting && (
        <Card className="overflow-hidden">
          <CardHeader
            title={t('accounting.account.ledger')}
            subtitle={t('accounting.account.ledger_hint')}
            icon={<BookText className="h-5 w-5" />}
          />
          <ArabicTable
            columns={ledgerColumns}
            data={ledger}
            loading={ledgerLoading}
            rowKey={(r, i) => `${r.serial_number}-${i}`}
            onRowClick={(r) => {
              if (!r.entry_id) return
              if (canEdit) setEditId(r.entry_id)
              else setViewId(r.entry_id)
            }}
            searchable={ledger.length > 8}
            searchPlaceholder={t('common.search')}
            exportName={`ledger-${account?.code}`}
            pageSize={15}
            emptyTitle={t('accounting.reports.ledger_empty')}
          />
          {ledger.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">{t('accounting.new.total_debit')}:</span>
                <span className="inline-flex flex-col items-end tabular-nums">
                  <span className="font-bold text-emerald-700">{formatCurrency(ledgerTotals.dIqd, 'IQD', lang)}</span>
                  {ledgerTotals.dUsd !== 0 && <span className="text-[11px] text-emerald-600">{formatCurrency(ledgerTotals.dUsd, 'USD', lang)}</span>}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">{t('accounting.new.total_credit')}:</span>
                <span className="inline-flex flex-col items-end tabular-nums">
                  <span className="font-bold text-sky-700">{formatCurrency(ledgerTotals.cIqd, 'IQD', lang)}</span>
                  {ledgerTotals.cUsd !== 0 && <span className="text-[11px] text-sky-600">{formatCurrency(ledgerTotals.cUsd, 'USD', lang)}</span>}
                </span>
              </span>
              {/* Net balance = total debit − total credit (collects مدين and دائن). */}
              <span className="flex items-center gap-2 border-s border-slate-300 ps-8">
                <span className="font-semibold text-slate-600">{t('accounting.account.net_balance')}:</span>
                <span className="inline-flex flex-col items-end tabular-nums">
                  <span className="font-bold text-primary">{formatCurrency(ledgerTotals.dIqd - ledgerTotals.cIqd, 'IQD', lang)}</span>
                  {(ledgerTotals.dUsd - ledgerTotals.cUsd) !== 0 && (
                    <span className="text-[11px] text-primary/80">{formatCurrency(ledgerTotals.dUsd - ledgerTotals.cUsd, 'USD', lang)}</span>
                  )}
                </span>
              </span>
            </div>
          )}
        </Card>
      )}

      {canEdit && (
        <NewEntryDialog
          open={editId !== null}
          editId={editId}
          onClose={() => setEditId(null)}
          onCreated={() => {
            setEditId(null)
            refetchLedger()
            refetchTrial()
          }}
        />
      )}
      <EntryViewDialog entryId={viewId} onClose={() => setViewId(null)} />
    </div>
  )
}

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value ?? '—'}</span>
    </div>
  )
}
