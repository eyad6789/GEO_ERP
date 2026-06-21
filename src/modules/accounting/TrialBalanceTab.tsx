import { useMemo, useState } from 'react'
import { Scale, Check, AlertTriangle, Download, X } from 'lucide-react'
import { Card, CardHeader, Button, LoadingState, SearchSelect } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, exportToExcel, pickName } from '../../lib/format'
import type { Company, Project } from '../../types'
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
  const [companyFilter, setCompanyFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  const { data: companies } = useResource<Company>('companies')
  const { data: projects } = useResource<Project>('projects')

  const companyOptions = useMemo(
    () => [{ value: '', label: t('accounting.filter.all_companies') }, ...companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))],
    [companies, lang, t],
  )
  const projectOptions = useMemo(
    () => [{ value: '', label: t('accounting.journal.all_projects') }, ...projects.map((p) => ({ value: p.id, label: pickName(p, lang) }))],
    [projects, lang, t],
  )

  // Page-level company filter takes precedence over the global top-bar company.
  const params = useMemo(() => {
    const p: Record<string, unknown> = {}
    const company = companyFilter || companyId
    if (company) p.company_id = company
    if (projectFilter) p.project_id = projectFilter
    if (range.from) p.from = range.from
    if (range.to) p.to = range.to
    return p
  }, [companyId, companyFilter, projectFilter, range])

  const { data, loading } = useApi<TrialBalanceResp>('/reports/trial-balance', params)
  const rows = data?.rows ?? []
  const totals = data?.totals ?? { debit: 0, credit: 0, debit_usd: 0, credit_usd: 0 }
  const balanced = isBalanced(totals.debit, totals.credit)
  const balancedUsd = isBalanced(totals.debit_usd, totals.credit_usd)
  const hasUsd = totals.debit_usd !== 0 || totals.credit_usd !== 0

  const name = (r: TrialBalanceRow) => (lang === 'en' ? r.name_en || r.name_ar : r.name_ar)

  const handleExport = () => {
    const c = t('accounting.trial.code')
    const n = t('accounting.trial.name')
    const d = t('accounting.trial.debit')
    const cr = t('accounting.trial.credit')
    const b = t('accounting.trial.balance')
    void exportToExcel(
      'trial_balance',
      rows.map((r) => ({
        [c]: r.code,
        [n]: name(r),
        [`${d} (IQD)`]: r.total_debit,
        [`${cr} (IQD)`]: r.total_credit,
        [`${b} (IQD)`]: r.balance,
        [`${d} (USD)`]: r.debit_usd ?? 0,
        [`${cr} (USD)`]: r.credit_usd ?? 0,
        [`${b} (USD)`]: r.balance_usd ?? 0,
      })),
      { sheetName: t('accounting.trial.title') },
    )
  }

  return (
    <div className="space-y-4">
      <FilterBar range={range} onChange={onRange} />

      {/* Company / project filters — applied server-side (like the journal page) */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-48 shrink-0"><SearchSelect value={companyFilter} onChange={setCompanyFilter} options={companyOptions} placeholder={t('accounting.filter.all_companies')} /></div>
          <div className="w-48 shrink-0"><SearchSelect value={projectFilter} onChange={setProjectFilter} options={projectOptions} placeholder={t('accounting.journal.all_projects')} /></div>
          {(companyFilter || projectFilter) && (
            <button
              onClick={() => { setCompanyFilter(''); setProjectFilter('') }}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-danger"
              title={t('accounting.journal.clear_filters')}
            >
              <X className="h-3.5 w-3.5" />
              {t('accounting.journal.clear_filters')}
            </button>
          )}
        </div>
      </div>

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
                      <span className="inline-flex flex-col items-end">
                        <span>{r.total_debit ? formatCurrency(r.total_debit, 'IQD', lang) : '—'}</span>
                        {r.debit_usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(r.debit_usd, 'USD', lang)}</span> : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-sky-700">
                      <span className="inline-flex flex-col items-end">
                        <span>{r.total_credit ? formatCurrency(r.total_credit, 'IQD', lang) : '—'}</span>
                        {r.credit_usd ? <span className="text-[11px] text-sky-600">{formatCurrency(r.credit_usd, 'USD', lang)}</span> : null}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-end font-medium tabular-nums text-slate-800">
                      <span className="inline-flex flex-col items-end">
                        <span>{formatCurrency(Math.abs(r.balance), 'IQD', lang)}</span>
                        {r.balance_usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(Math.abs(r.balance_usd), 'USD', lang)}</span> : null}
                      </span>
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
                    <span className="inline-flex flex-col items-end">
                      <span>{formatCurrency(totals.debit, 'IQD', lang)}</span>
                      {hasUsd ? <span className="text-[11px] font-semibold text-emerald-600">{formatCurrency(totals.debit_usd, 'USD', lang)}</span> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-end tabular-nums text-sky-700">
                    <span className="inline-flex flex-col items-end">
                      <span>{formatCurrency(totals.credit, 'IQD', lang)}</span>
                      {hasUsd ? <span className="text-[11px] font-semibold text-sky-600">{formatCurrency(totals.credit_usd, 'USD', lang)}</span> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-end">
                    <span className="inline-flex flex-col items-end gap-0.5">
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
                      {hasUsd ? (
                        balancedUsd ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <Check className="h-3 w-3" />
                            {t('accounting.trial.balanced')} ($)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            {t('accounting.trial.unbalanced')} ($)
                          </span>
                        )
                      ) : null}
                    </span>
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
