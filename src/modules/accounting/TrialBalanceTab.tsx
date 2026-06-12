import { useMemo } from 'react'
import { Scale, Check, AlertTriangle, Download } from 'lucide-react'
import { Card, CardHeader, Button, LoadingState } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, exportToCsv } from '../../lib/format'
import { isBalanced, type TrialBalanceResp, type TrialBalanceRow } from './shared'
import { FilterBar, type DateRange } from './FilterBar'

export function TrialBalanceTab({
  range,
  onRange,
}: {
  range: DateRange
  onRange: (r: DateRange) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()

  const params = useMemo(() => {
    const p: Record<string, unknown> = {}
    if (companyId) p.company_id = companyId
    if (range.from) p.from = range.from
    if (range.to) p.to = range.to
    return p
  }, [companyId, range])

  const { data, loading } = useApi<TrialBalanceResp>('/reports/trial-balance', params)
  const rows = data?.rows ?? []
  const totals = data?.totals ?? { debit: 0, credit: 0 }
  const balanced = isBalanced(totals.debit, totals.credit)

  const name = (r: TrialBalanceRow) => (lang === 'en' ? r.name_en || r.name_ar : r.name_ar)

  const handleExport = () => {
    exportToCsv(
      'trial_balance',
      rows.map((r) => ({
        code: r.code,
        name: name(r),
        debit: r.total_debit,
        credit: r.total_credit,
        balance: r.balance,
      })),
    )
  }

  return (
    <div className="space-y-4">
      <FilterBar range={range} onChange={onRange} />

      <Card>
        <CardHeader
          title={t('accounting.trial.title')}
          subtitle={t('accounting.trial.subtitle')}
          icon={<Scale className="h-5 w-5" />}
          action={
            <div className="flex items-center gap-2">
              <BalancedPill balanced={balanced} t={t} />
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows.length}>
                <Download className="h-4 w-4" />
                {t('common.export')}
              </Button>
            </div>
          }
        />

        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : rows.length === 0 ? (
          <EmptyState title={t('accounting.trial.empty')} hint={t('common.empty_hint')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start">{t('accounting.trial.code')}</th>
                  <th className="px-4 py-3 text-start">{t('accounting.trial.name')}</th>
                  <th className="px-4 py-3 text-end">{t('accounting.trial.debit')}</th>
                  <th className="px-4 py-3 text-end">{t('accounting.trial.credit')}</th>
                  <th className="px-4 py-3 text-end">{t('accounting.trial.balance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.code} className="hover:bg-primary/5">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.code}</td>
                    <td className="px-4 py-2.5 text-slate-700">{name(r)}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-emerald-700">
                      {r.total_debit ? formatCurrency(r.total_debit, 'IQD', lang) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-sky-700">
                      {r.total_credit ? formatCurrency(r.total_credit, 'IQD', lang) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-end font-medium tabular-nums text-slate-800">
                      {formatCurrency(Math.abs(r.balance), 'IQD', lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-800">
                  <td className="px-4 py-3.5" colSpan={2}>
                    {t('accounting.trial.totals')}
                  </td>
                  <td className="px-4 py-3.5 text-end tabular-nums text-emerald-700">
                    {formatCurrency(totals.debit, 'IQD', lang)}
                  </td>
                  <td className="px-4 py-3.5 text-end tabular-nums text-sky-700">
                    {formatCurrency(totals.credit, 'IQD', lang)}
                  </td>
                  <td className="px-4 py-3.5 text-end">
                    {balanced ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="h-4 w-4" />
                        {t('accounting.trial.balanced')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        {t('accounting.trial.unbalanced')}
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function BalancedPill({ balanced, t }: { balanced: boolean; t: (k: string) => string }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ' +
        (balanced
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200')
      }
    >
      {balanced ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {balanced ? t('accounting.trial.balanced') : t('accounting.trial.unbalanced')}
    </span>
  )
}
