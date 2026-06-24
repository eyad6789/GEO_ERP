import { useMemo, useState } from 'react'
import { Truck, Fuel, Wrench, Package, ShoppingCart, Coins, User, BadgeCheck, MapPin, Hash, CalendarDays, CalendarRange } from 'lucide-react'
import { Card, CardHeader, LoadingState } from '../../components/ui'
import { KpiCard, EmptyState, ArabicTable, type Column } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { formatCurrency, formatDate } from '../../lib/format'

// Shown on the chart-of-accounts detail page when the opened account is a
// vehicle account (under اليات). The accountant sees the vehicle's specs PLUS
// its spending (by category, with counts) and a clickable cost history.
interface CostRow {
  category: string
  amount: number
  currency: string
  date: string
  note: string
  entry_id: string | null
  serial_number: string | null
}
interface DetailResp {
  vehicle: Record<string, string | number | null>
  by_category: Array<{ category: string; iqd: number; usd: number; count: number }>
  costs: CostRow[]
}

const CAT_ICON: Record<string, JSX.Element> = {
  FUEL: <Fuel className="h-4 w-4" />,
  MAINTENANCE: <Wrench className="h-4 w-4" />,
  MATERIALS: <Package className="h-4 w-4" />,
  PARTS: <Package className="h-4 w-4" />,
  PURCHASE: <ShoppingCart className="h-4 w-4" />,
}

function Field({ icon, label, value }: { icon: JSX.Element; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
        <span className="truncate text-sm font-medium text-slate-700">{value || '—'}</span>
      </span>
    </div>
  )
}

export function VehicleAccountPanel({ vehicleId, onOpenEntry }: { vehicleId: string; onOpenEntry: (entryId: string) => void }) {
  const t = useT()
  const { lang } = useLang()
  const [catFilter, setCatFilter] = useState('')
  const { data, loading } = useApi<DetailResp>(`/accounting/vehicle-spending/${vehicleId}`)
  const v = (data?.vehicle ?? {}) as Record<string, string | number | null>

  const totals = useMemo(() => {
    let iqd = 0
    let usd = 0
    for (const c of data?.by_category ?? []) {
      iqd += c.iqd
      usd += c.usd
    }
    return { iqd, usd }
  }, [data])

  const costs = useMemo(() => (data?.costs ?? []).filter((c) => !catFilter || c.category === catFilter), [data, catFilter])

  if (loading) return <Card><LoadingState label={t('common.loading')} /></Card>
  if (!data) return null

  const st = String(v.status ?? '')
  const costColumns: Column<CostRow>[] = [
    { key: 'date', header: t('accounting.vehicles.date'), accessor: (r) => r.date, render: (r) => formatDate(r.date, lang) },
    { key: 'category', header: t('accounting.vehicles.type'), render: (r) => t(`accounting.vehicles.cat.${r.category}`) },
    { key: 'doc', header: t('accounting.journal.serial'), render: (r) => (r.serial_number ? <span className="font-mono text-xs text-primary">{r.serial_number}</span> : <span className="text-slate-300">—</span>) },
    { key: 'note', header: t('accounting.vehicles.note'), render: (r) => <span className="text-slate-500">{r.note || '—'}</span> },
    { key: 'amount', header: t('accounting.vehicles.spend'), align: 'end', accessor: (r) => r.amount, render: (r) => <span className="tabular-nums">{formatCurrency(r.amount, r.currency, lang)}</span> },
  ]

  return (
    <div className="mb-5 space-y-4">
      {/* Spend KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label={`${t('accounting.vehicles.total_spend')} (IQD)`} value={formatCurrency(totals.iqd, 'IQD', lang)} icon={<Truck className="h-5 w-5" />} accent="primary" />
        <KpiCard label={`${t('accounting.vehicles.total_spend')} (USD)`} value={formatCurrency(totals.usd, 'USD', lang)} icon={<Coins className="h-5 w-5" />} accent="success" />
      </div>

      {/* Vehicle specs (chart drill-in shows full details) */}
      <Card>
        <CardHeader title={t('accounting.vehicles.detail_specs')} icon={<Truck className="h-5 w-5" />} />
        <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field icon={<Hash className="h-4 w-4" />} label={t('accounting.vehicles.plate')} value={String(v.plate_number ?? '')} />
          <Field icon={<User className="h-4 w-4" />} label={t('accounting.vehicles.driver')} value={String(v.driver_name ?? '')} />
          <Field icon={<BadgeCheck className="h-4 w-4" />} label={t('accounting.vehicles.owner')} value={String(v.owner_name ?? '')} />
          <Field icon={<Truck className="h-4 w-4" />} label={t('accounting.vehicles.type')} value={String(v.vehicle_type ?? '')} />
          <Field icon={<CalendarDays className="h-4 w-4" />} label={t('accounting.vehicles.model_year')} value={v.model_year ? String(v.model_year) : ''} />
          <Field icon={<CalendarRange className="h-4 w-4" />} label={t('accounting.vehicles.reg_expiry')} value={v.registration_expiry ? formatDate(String(v.registration_expiry), lang) : ''} />
          <Field icon={<MapPin className="h-4 w-4" />} label={t('accounting.vehicles.location')} value={String(v.location ?? '')} />
          <Field icon={<BadgeCheck className="h-4 w-4" />} label={t('accounting.vehicles.status')} value={st ? t(`accounting.vehicles.st.${st}`) : ''} />
        </div>
      </Card>

      {/* Spend by category (with counts) + clickable cost history */}
      <Card>
        <CardHeader title={t('accounting.vehicles.by_category')} icon={<Coins className="h-5 w-5" />} />
        <div className="p-4">
          {data.by_category.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.by_category.map((c) => (
                <button
                  key={c.category}
                  type="button"
                  onClick={() => setCatFilter((cur) => (cur === c.category ? '' : c.category))}
                  className={'rounded-xl border px-3 py-2 text-start transition ' + (catFilter === c.category ? 'border-primary bg-primary/5' : 'border-slate-100 hover:bg-slate-50')}
                >
                  <span className="flex items-center justify-between gap-1.5 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">{CAT_ICON[c.category] ?? <Coins className="h-3.5 w-3.5" />}{t(`accounting.vehicles.cat.${c.category}`)}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">×{c.count}</span>
                  </span>
                  <span className="mt-1 block text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(c.iqd, 'IQD', lang)}</span>
                  {c.usd ? <span className="block text-[11px] tabular-nums text-emerald-600">{formatCurrency(c.usd, 'USD', lang)}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          {costs.length > 0 ? (
            <ArabicTable
              columns={costColumns}
              data={costs}
              rowKey={(r, i) => `${r.entry_id ?? 'vc'}-${i}`}
              onRowClick={(r) => r.entry_id && onOpenEntry(r.entry_id)}
              searchable={false}
              pageSize={10}
              emptyTitle={t('accounting.vehicles.no_costs')}
            />
          ) : (
            <EmptyState title={t('accounting.vehicles.no_costs')} />
          )}
        </div>
      </Card>
    </div>
  )
}
