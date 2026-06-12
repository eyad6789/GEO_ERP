import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator, BookOpen, ListTree, Scale, ReceiptText, Users, Wallet, Landmark, Lock } from 'lucide-react'
import { PageHeader } from '../../components/shared'
import { Tabs, Badge } from '../../components/ui'
import { useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { JournalTab } from './JournalTab'
import { ChartTab } from './ChartTab'
import { TrialBalanceTab } from './TrialBalanceTab'
import { VouchersTab } from './VouchersTab'
import { PartiesTab } from './PartiesTab'
import { CashTab } from './CashTab'
import { BankTab } from './BankTab'
import { canEditAccounting } from './shared'
import type { DateRange } from './FilterBar'

type TabKey = 'journal' | 'chart' | 'trial' | 'vouchers' | 'parties' | 'cash' | 'bank'
const TAB_KEYS: TabKey[] = ['journal', 'chart', 'trial', 'vouchers', 'parties', 'cash', 'bank']

const defaultRange = (): DateRange => {
  const now = new Date()
  const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
  const to = now.toISOString().slice(0, 10)
  return { from, to }
}

export default function AccountingPage() {
  const t = useT()
  const { role } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRange>(defaultRange())

  // Tab lives in the URL (?tab=) so returning from an account detail page
  // restores the tab you were on (e.g. the chart) instead of resetting to journal.
  const tabParam = searchParams.get('tab') as TabKey | null
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'journal'
  const setTab = (k: TabKey) =>
    setSearchParams(
      (prev) => {
        prev.set('tab', k)
        return prev
      },
      { replace: true },
    )

  const tabs = [
    { key: 'journal', label: t('accounting.tab.journal'), icon: <BookOpen className="h-4 w-4" /> },
    { key: 'chart', label: t('accounting.tab.chart'), icon: <ListTree className="h-4 w-4" /> },
    { key: 'trial', label: t('accounting.tab.trial'), icon: <Scale className="h-4 w-4" /> },
    { key: 'vouchers', label: t('accounting.tab.vouchers'), icon: <ReceiptText className="h-4 w-4" /> },
    { key: 'parties', label: t('accounting.tab.parties'), icon: <Users className="h-4 w-4" /> },
    { key: 'cash', label: t('accounting.tab.cash'), icon: <Wallet className="h-4 w-4" /> },
    { key: 'bank', label: t('accounting.tab.bank'), icon: <Landmark className="h-4 w-4" /> },
  ]

  return (
    <div>
      <PageHeader
        title={t('accounting.title')}
        subtitle={t('accounting.subtitle')}
        icon={<Calculator className="h-6 w-6" />}
        actions={
          !canEdit ? (
            <Badge color="gray">
              <Lock className="h-3.5 w-3.5" />
              {t('accounting.readonly.badge')}
            </Badge>
          ) : undefined
        }
      />

      {!canEdit && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 no-print">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{t('accounting.readonly.title')}</p>
            <p className="text-xs text-amber-700">{t('accounting.readonly.hint')}</p>
          </div>
        </div>
      )}

      <div className="mb-5 no-print">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as TabKey)} variant="underline" />
      </div>

      {tab === 'journal' && <JournalTab range={range} onRange={setRange} />}
      {tab === 'chart' && <ChartTab />}
      {tab === 'trial' && <TrialBalanceTab range={range} onRange={setRange} />}
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'parties' && <PartiesTab />}
      {tab === 'cash' && <CashTab />}
      {tab === 'bank' && <BankTab />}
    </div>
  )
}
