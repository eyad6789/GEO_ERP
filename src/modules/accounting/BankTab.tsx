import { useMemo, useState } from 'react'
import { Landmark, Coins, Plus, Pencil, Trash2, Lock } from 'lucide-react'
import { Card, CardHeader, Button } from '../../components/ui'
import { ArabicTable, KpiCard, type Column } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, pickName } from '../../lib/format'
import type { Bank } from '../../types'
import { canEditAccounting, type AdvanceSplit } from './shared'
import { NewBankDialog } from './NewBankDialog'
import { AdvanceCard } from './AdvanceCard'

export function BankTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId, role } = useCompany()
  const canEdit = canEditAccounting(role.key)

  const { data: banks, loading, refetch, remove } = useResource<Bank>(
    'banks',
    companyId ? { company_id: companyId } : undefined,
  )
  const { data: advSplit } = useApi<AdvanceSplit>('/accounting/advance-split', companyId ? { company_id: companyId } : undefined)
  const [bankDialog, setBankDialog] = useState<{ open: boolean; bank: Bank | null }>({ open: false, bank: null })

  const totals = useMemo(() => {
    const iqd = banks.reduce((s, b) => s + (b.balance_iqd || 0), 0)
    const usd = banks.reduce((s, b) => s + (b.balance_usd || 0), 0)
    return { iqd, usd }
  }, [banks])

  // Operational advance funded from a BANK (split server-side by funding source).
  const advance = advSplit?.bank ?? { iqd: 0, usd: 0 }

  const handleDelete = async (b: Bank) => {
    if (!window.confirm(t('accounting.bank.confirm_delete'))) return
    await remove(b.id)
  }

  const columns: Column<Bank>[] = [
    { key: 'name', header: t('accounting.bank.name'), render: (b) => <span className="font-medium text-slate-700">{pickName(b, lang)}</span> },
    { key: 'branch', header: t('accounting.bank.branch'), render: (b) => <span className="text-slate-600">{b.branch || '—'}</span> },
    { key: 'balance_iqd', header: t('accounting.bank.balance_iqd'), align: 'end', render: (b) => <span className="tabular-nums text-slate-800">{formatCurrency(b.balance_iqd, 'IQD', lang)}</span> },
    { key: 'balance_usd', header: t('accounting.bank.balance_usd'), align: 'end', render: (b) => <span className="tabular-nums text-emerald-700">{formatCurrency(b.balance_usd, 'USD', lang)}</span> },
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('accounting.bank.total_iqd')} value={formatCurrency(totals.iqd, 'IQD', lang)} icon={<Landmark className="h-5 w-5" />} accent="info" />
        <KpiCard label={t('accounting.bank.total_usd')} value={formatCurrency(totals.usd, 'USD', lang)} icon={<Coins className="h-5 w-5" />} accent="success" />
        <AdvanceCard iqd={advance.iqd} usd={advance.usd} lang={lang} t={t} />
      </div>

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
