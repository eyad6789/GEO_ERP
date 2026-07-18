import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calculator, BookOpen, Building2, FolderKanban, ListTree, Scale, ReceiptText, Users, Wallet, Landmark, Truck, UserRound, Lock } from 'lucide-react'
import { PageHeader } from '../../components/shared'
import { Tabs, Badge, Button, useToast } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { CompanyDialog } from '../companies/CompanyDialog'
import type { Company } from '../../types'
import { NewProjectDialog } from './NewProjectDialog'
import { NotesButton } from '../../components/notes/ModuleNotes'
import { useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { JournalTab } from './JournalTab'
import { ChartTab } from './ChartTab'
import { TrialBalanceTab } from './TrialBalanceTab'
import { VouchersTab } from './VouchersTab'
import { PartiesTab } from './PartiesTab'
import { CashTab } from './CashTab'
import { BankTab } from './BankTab'
import { VehiclesTab } from './VehiclesTab'
import { HRTab } from './HRTab'
import { canEditAccounting } from './shared'
import type { DateRange } from './FilterBar'

type TabKey = 'journal' | 'chart' | 'trial' | 'vouchers' | 'parties' | 'cash' | 'bank' | 'vehicles' | 'hr'
const TAB_KEYS: TabKey[] = ['journal', 'chart', 'trial', 'vouchers', 'parties', 'cash', 'bank', 'vehicles', 'hr']

const defaultRange = (): DateRange => {
  // Format from LOCAL date parts. Using toISOString() here would convert local
  // midnight to UTC and shift "from" back a day (e.g. 2026-01-01 → 2025-12-31)
  // in any timezone ahead of UTC.
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${now.getFullYear()}-01-01`
  const to = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return { from, to }
}

export default function AccountingPage() {
  const t = useT()
  const { role } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const [searchParams, setSearchParams] = useSearchParams()
  const [range, setRange] = useState<DateRange>(defaultRange())
  const toast = useToast()

  // TEMPORARY: the projects/companies modules aren't finished, so the
  // accountant creates real projects & companies from here. Rows go through
  // the normal API (real DB + audit log).
  const [projectOpen, setProjectOpen] = useState(false)
  const [companyOpen, setCompanyOpen] = useState(false)
  const { data: companies, create: createCompany } = useResource<Company>('companies')
  const handleCreateCompany = async (data: Partial<Company>) => {
    try {
      const parentCo = companies.find((c) => c.type === 'PARENT')
      const colors = ['#0e7490', '#27ae60', '#8e44ad', '#c0392b', '#2980b9', '#d35400']
      await createCompany({
        ...data,
        type: 'SUBSIDIARY',
        parent_id: parentCo?.id ?? null,
        country: 'العراق',
        currency_primary: 'IQD',
        logo_color: colors[companies.length % colors.length],
      })
      toast.success(t('companies.saved'))
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
      throw e
    }
  }

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
    { key: 'vehicles', label: t('accounting.tab.vehicles'), icon: <Truck className="h-4 w-4" /> },
    // Salary/advance data — same rule as HR payroll: accountant + HR manager only.
    ...(role.key === 'accountant' || role.key === 'hr_manager'
      ? [{ key: 'hr', label: t('accounting.tab.hr'), icon: <UserRound className="h-4 w-4" /> }]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title={t('accounting.title')}
        subtitle={t('accounting.subtitle')}
        icon={<Calculator className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            {!canEdit && (
              <Badge color="gray">
                <Lock className="h-3.5 w-3.5" />
                {t('accounting.readonly.badge')}
              </Badge>
            )}
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={() => setProjectOpen(true)}>
                  <FolderKanban className="h-4 w-4" />
                  {t('accounting.temp.new_project')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCompanyOpen(true)}>
                  <Building2 className="h-4 w-4" />
                  {t('accounting.temp.new_company')}
                </Button>
              </>
            )}
            <NotesButton moduleKey="accounting" moduleLabel={t('accounting.title')} />
          </div>
        }
      />

      {!canEdit && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 px-4 py-3 no-print">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t('accounting.readonly.title')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('accounting.readonly.hint')}</p>
          </div>
        </div>
      )}

      <div className="mb-5 no-print">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as TabKey)} variant="underline" wrap />
      </div>

      {tab === 'journal' && <JournalTab range={range} onRange={setRange} />}
      {tab === 'chart' && <ChartTab />}
      {tab === 'trial' && <TrialBalanceTab range={range} onRange={setRange} />}
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'parties' && <PartiesTab />}
      {tab === 'cash' && <CashTab />}
      {tab === 'bank' && <BankTab />}
      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'hr' && (role.key === 'accountant' || role.key === 'hr_manager') && <HRTab />}

      {canEdit && (
        <>
          <NewProjectDialog open={projectOpen} onClose={() => setProjectOpen(false)} />
          <CompanyDialog open={companyOpen} company={null} onClose={() => setCompanyOpen(false)} onSubmit={handleCreateCompany} />
        </>
      )}
    </div>
  )
}
