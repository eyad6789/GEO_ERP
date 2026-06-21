import { useMemo } from 'react'
import { Truck, Coins, CalendarDays, CalendarRange, Fuel, Wrench, Package, ShoppingCart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, LoadingState } from '../../components/ui'
import { KpiCard, ChartCard, EmptyState, ArabicTable, type Column } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatNumber } from '../../lib/format'

interface Money {
  iqd: number
  usd: number
}
interface CompanyRow {
  company_id: string | null
  name_ar: string
  name_en: string
  iqd: number
  usd: number
  vehicles: number
}
interface SpendResp {
  totals: Money
  this_month: Money
  this_year: Money
  by_month: Array<{ month: string; iqd: number; usd: number }>
  by_year: Array<{ year: string; iqd: number; usd: number }>
  by_category: Array<{ category: string; iqd: number; usd: number }>
  by_company: CompanyRow[]
  expenses: { month: number; year: number; total: number }
}

const CAT_ICON: Record<string, JSX.Element> = {
  FUEL: <Fuel className="h-4 w-4" />,
  MAINTENANCE: <Wrench className="h-4 w-4" />,
  PARTS: <Package className="h-4 w-4" />,
  PURCHASE: <ShoppingCart className="h-4 w-4" />,
}

// IQD (big) over USD (small green) — the standard money cell used across cash views.
function Dual({ iqd, usd, lang }: { iqd: number; usd: number; lang: 'ar' | 'en' }) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{formatCurrency(iqd, 'IQD', lang)}</span>
      <span className="mt-0.5 text-base font-semibold text-emerald-600">{formatCurrency(usd, 'USD', lang)}</span>
    </span>
  )
}

export function VehiclesTab() {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()

  const { data, loading } = useApi<SpendResp>(
    '/accounting/vehicle-spending',
    companyId ? { company_id: companyId } : undefined,
  )

  const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null)
  const pctLabel = (p: number | null, key: string) =>
    p === null ? '—' : `${formatNumber(p, lang, 1)}% ${t(key)}`

  const monthChart = useMemo(
    () => (data?.by_month ?? []).map((m) => ({ label: m.month, iqd: m.iqd })),
    [data],
  )

  if (loading) return <LoadingState label={t('common.loading')} />
  if (!data || (data.totals.iqd === 0 && data.totals.usd === 0 && data.by_company.length === 0)) {
    return (
      <Card>
        <EmptyState title={t('accounting.vehicles.empty')} hint={t('common.empty_hint')} />
      </Card>
    )
  }

  const companyColumns: Column<CompanyRow>[] = [
    { key: 'name', header: t('accounting.vehicles.company'), render: (r) => (lang === 'en' ? r.name_en || r.name_ar : r.name_ar) },
    { key: 'vehicles', header: t('accounting.vehicles.vehicles_count'), align: 'end', accessor: (r) => r.vehicles, render: (r) => formatNumber(r.vehicles, lang) },
    {
      key: 'spend',
      header: t('accounting.vehicles.spend'),
      align: 'end',
      accessor: (r) => r.iqd,
      render: (r) => (
        <span className="inline-flex flex-col items-end tabular-nums">
          <span className="text-slate-800">{formatCurrency(r.iqd, 'IQD', lang)}</span>
          {r.usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(r.usd, 'USD', lang)}</span> : null}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      {/* Headline KPIs — total, this month, this year (each per currency) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('accounting.vehicles.total_spend')}
          value={<Dual iqd={data.totals.iqd} usd={data.totals.usd} lang={lang} />}
          icon={<Truck className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label={t('accounting.vehicles.this_month')}
          value={<Dual iqd={data.this_month.iqd} usd={data.this_month.usd} lang={lang} />}
          hint={pctLabel(pct(data.this_month.iqd, data.expenses.month), 'accounting.vehicles.of_expenses_month')}
          icon={<CalendarDays className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('accounting.vehicles.this_year')}
          value={<Dual iqd={data.this_year.iqd} usd={data.this_year.usd} lang={lang} />}
          hint={pctLabel(pct(data.this_year.iqd, data.expenses.year), 'accounting.vehicles.of_expenses_year')}
          icon={<CalendarRange className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {/* Monthly spend chart (IQD) */}
      <ChartCard
        title={t('accounting.vehicles.by_month')}
        subtitle={t('accounting.vehicles.by_month_sub')}
        icon={<CalendarDays className="h-5 w-5" />}
      >
        {monthChart.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthChart} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(Number(v), lang)} width={70} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), 'IQD', lang)} />
              <Bar dataKey="iqd" fill="#2563eb" radius={[4, 4, 0, 0]} name={t('accounting.vehicles.spend')} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title={t('accounting.vehicles.empty')} />
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By category */}
        <Card>
          <CardHeader title={t('accounting.vehicles.by_category')} icon={<Coins className="h-5 w-5" />} />
          <div className="space-y-2 p-4">
            {data.by_category.length ? (
              data.by_category.map((c) => (
                <div key={c.category} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      {CAT_ICON[c.category] ?? <Coins className="h-4 w-4" />}
                    </span>
                    {t(`accounting.vehicles.cat.${c.category}`)}
                  </span>
                  <span className="inline-flex flex-col items-end tabular-nums">
                    <span className="font-semibold text-slate-800">{formatCurrency(c.iqd, 'IQD', lang)}</span>
                    {c.usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(c.usd, 'USD', lang)}</span> : null}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState title={t('accounting.vehicles.empty')} />
            )}
          </div>
        </Card>

        {/* By year */}
        <Card>
          <CardHeader title={t('accounting.vehicles.by_year')} icon={<CalendarRange className="h-5 w-5" />} />
          <div className="space-y-2 p-4">
            {data.by_year.length ? (
              data.by_year.map((y) => (
                <div key={y.year} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">{y.year}</span>
                  <span className="inline-flex flex-col items-end tabular-nums">
                    <span className="font-semibold text-slate-800">{formatCurrency(y.iqd, 'IQD', lang)}</span>
                    {y.usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(y.usd, 'USD', lang)}</span> : null}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState title={t('accounting.vehicles.empty')} />
            )}
          </div>
        </Card>
      </div>

      {/* By company */}
      <Card>
        <CardHeader title={t('accounting.vehicles.by_company')} icon={<Truck className="h-5 w-5" />} />
        <ArabicTable
          columns={companyColumns}
          data={data.by_company}
          rowKey={(r, i) => `${r.company_id ?? 'none'}-${i}`}
          searchable={false}
          pageSize={12}
          emptyTitle={t('accounting.vehicles.empty')}
        />
      </Card>
    </div>
  )
}
