import { useMemo, useState } from 'react'
import { Truck, Coins, CalendarDays, CalendarRange, Fuel, Wrench, Package, ShoppingCart, User, BadgeCheck, MapPin, Hash } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, LoadingState, Dialog, Badge } from '../../components/ui'
import { KpiCard, ChartCard, EmptyState, ArabicTable, type Column } from '../../components/shared'
import { useApi } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { formatCurrency, formatNumber, formatDate } from '../../lib/format'
import { canEditAccounting } from './shared'
import { NewEntryDialog } from './NewEntryDialog'
import { EntryViewDialog } from './EntryViewDialog'

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
interface VehicleRow {
  id: string
  code: string
  name_ar: string
  name_en: string
  plate_number: string
  driver_name: string
  owner_name: string
  vehicle_type: string
  status: string
  model_year: number
  registration_expiry: string
  location: string
  iqd: number
  usd: number
}
interface SpendResp {
  totals: Money
  this_month: Money
  this_year: Money
  by_month: Array<{ month: string; iqd: number; usd: number }>
  by_year: Array<{ year: string; iqd: number; usd: number }>
  by_category: Array<{ category: string; iqd: number; usd: number }>
  by_company: CompanyRow[]
  by_vehicle: VehicleRow[]
  expenses: { month: number; year: number; total: number }
}

const CAT_ICON: Record<string, JSX.Element> = {
  FUEL: <Fuel className="h-4 w-4" />,
  MAINTENANCE: <Wrench className="h-4 w-4" />,
  PARTS: <Package className="h-4 w-4" />,
  PURCHASE: <ShoppingCart className="h-4 w-4" />,
}
const STATUS_COLOR: Record<string, 'green' | 'amber' | 'gray' | 'red'> = {
  ACTIVE: 'green',
  MAINTENANCE: 'amber',
  INACTIVE: 'gray',
  RETIRED: 'red',
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
  const { companyId, role } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const [selected, setSelected] = useState<VehicleRow | null>(null)
  const [editEntryId, setEditEntryId] = useState<string | null>(null)
  const [viewEntryId, setViewEntryId] = useState<string | null>(null)

  const { data, loading, refetch } = useApi<SpendResp>(
    '/accounting/vehicle-spending',
    companyId ? { company_id: companyId } : undefined,
  )

  // Open a journal entry from a vehicle's cost row: edit if allowed, else view.
  // Close the vehicle dialog first so the journal editor is on top.
  const openEntry = (entryId: string) => {
    setSelected(null)
    if (canEdit) setEditEntryId(entryId)
    else setViewEntryId(entryId)
  }

  const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : null)
  const pctLabel = (p: number | null, key: string) =>
    p === null ? '—' : `${formatNumber(p, lang, 1)}% ${t(key)}`

  const monthChart = useMemo(
    () => (data?.by_month ?? []).map((m) => ({ label: m.month, iqd: m.iqd })),
    [data],
  )

  if (loading) return <LoadingState label={t('common.loading')} />
  if (!data || data.by_vehicle.length === 0) {
    return (
      <Card>
        <EmptyState title={t('accounting.vehicles.empty')} hint={t('common.empty_hint')} />
      </Card>
    )
  }

  const vehicleColumns: Column<VehicleRow>[] = [
    {
      key: 'vehicle',
      header: t('accounting.vehicles.vehicle'),
      render: (r) => (
        <span className="flex flex-col">
          <span className="font-medium text-slate-800">{lang === 'en' ? r.name_en || r.name_ar : r.name_ar}</span>
          <span className="font-mono text-[11px] text-slate-400">{r.code}</span>
        </span>
      ),
    },
    { key: 'plate', header: t('accounting.vehicles.plate'), render: (r) => <span className="font-mono text-xs text-slate-600">{r.plate_number || '—'}</span> },
    { key: 'driver', header: t('accounting.vehicles.driver'), render: (r) => r.driver_name || '—' },
    { key: 'status', header: t('accounting.vehicles.status'), render: (r) => <Badge color={STATUS_COLOR[r.status] ?? 'gray'}>{t(`accounting.vehicles.st.${r.status}`)}</Badge> },
    {
      key: 'spend',
      header: t('accounting.vehicles.spend'),
      align: 'end',
      accessor: (r) => r.iqd,
      render: (r) => (
        <span className="inline-flex flex-col items-end tabular-nums">
          <span className="font-semibold text-slate-800">{formatCurrency(r.iqd, 'IQD', lang)}</span>
          {r.usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(r.usd, 'USD', lang)}</span> : null}
        </span>
      ),
    },
  ]

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

      {/* Vehicles list — clickable rows open the detail dialog */}
      <Card>
        <CardHeader title={t('accounting.vehicles.list_title')} subtitle={t('accounting.vehicles.list_sub')} icon={<Truck className="h-5 w-5" />} />
        <ArabicTable
          columns={vehicleColumns}
          data={data.by_vehicle}
          rowKey={(r) => r.id}
          onRowClick={(r) => setSelected(r)}
          searchable
          searchPlaceholder={t('accounting.vehicles.list_sub')}
          pageSize={12}
          emptyTitle={t('accounting.vehicles.empty')}
        />
      </Card>

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

      {selected && <VehicleDetailDialog vehicle={selected} onClose={() => setSelected(null)} onOpenEntry={openEntry} />}

      {canEdit && (
        <NewEntryDialog
          open={editEntryId !== null}
          editId={editEntryId}
          onClose={() => setEditEntryId(null)}
          onCreated={() => { setEditEntryId(null); refetch() }}
        />
      )}
      <EntryViewDialog entryId={viewEntryId} onClose={() => setViewEntryId(null)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vehicle detail dialog — full info + cost breakdown + recent costs.
// ---------------------------------------------------------------------------
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

function VehicleDetailDialog({ vehicle, onClose, onOpenEntry }: { vehicle: VehicleRow; onClose: () => void; onOpenEntry: (entryId: string) => void }) {
  const t = useT()
  const { lang } = useLang()
  const [catFilter, setCatFilter] = useState('')
  const { data, loading } = useApi<DetailResp>(`/accounting/vehicle-spending/${vehicle.id}`)
  const v = (data?.vehicle ?? {}) as Record<string, string | number | null>
  const name = lang === 'en' ? vehicle.name_en || vehicle.name_ar : vehicle.name_ar

  // Filter the cost rows by category (وقود / صيانة / ...).
  const costs = useMemo(
    () => (data?.costs ?? []).filter((c) => !catFilter || c.category === catFilter),
    [data, catFilter],
  )
  const catChips = useMemo(
    () => [{ value: '', label: t('accounting.vouchers.all') }, ...(data?.by_category ?? []).map((c) => ({ value: c.category, label: `${t(`accounting.vehicles.cat.${c.category}`)} (${c.count})` }))],
    [data, t],
  )

  const costColumns: Column<CostRow>[] = [
    { key: 'date', header: t('accounting.vehicles.date'), accessor: (r) => r.date, render: (r) => formatDate(r.date, lang) },
    { key: 'category', header: t('accounting.vehicles.type'), render: (r) => t(`accounting.vehicles.cat.${r.category}`) },
    { key: 'doc', header: t('accounting.journal.serial'), render: (r) => (r.serial_number ? <span className="font-mono text-xs text-primary">{r.serial_number}</span> : <span className="text-slate-300">—</span>) },
    { key: 'note', header: t('accounting.vehicles.note'), render: (r) => <span className="text-slate-500">{r.note || '—'}</span> },
    { key: 'amount', header: t('accounting.vehicles.spend'), align: 'end', accessor: (r) => r.amount, render: (r) => <span className="tabular-nums">{formatCurrency(r.amount, r.currency, lang)}</span> },
  ]

  return (
    <Dialog open onClose={onClose} size="lg" title={<span className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />{t('accounting.vehicles.detail_title')} — {name}</span>}>
      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : (
        <div className="space-y-5">
          {/* totals */}
          <div className="flex items-center justify-between rounded-2xl bg-primary/5 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">{t('accounting.vehicles.total_spend')}</span>
            <Dual iqd={vehicle.iqd} usd={vehicle.usd} lang={lang} />
          </div>

          {/* details grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field icon={<Hash className="h-4 w-4" />} label={t('accounting.vehicles.plate')} value={String(v.plate_number ?? vehicle.plate_number ?? '')} />
            <Field icon={<User className="h-4 w-4" />} label={t('accounting.vehicles.driver')} value={String(v.driver_name ?? vehicle.driver_name ?? '')} />
            <Field icon={<BadgeCheck className="h-4 w-4" />} label={t('accounting.vehicles.owner')} value={String(v.owner_name ?? vehicle.owner_name ?? '')} />
            <Field icon={<Truck className="h-4 w-4" />} label={t('accounting.vehicles.type')} value={String(v.vehicle_type ?? vehicle.vehicle_type ?? '')} />
            <Field icon={<CalendarDays className="h-4 w-4" />} label={t('accounting.vehicles.model_year')} value={v.model_year ? String(v.model_year) : ''} />
            <Field icon={<CalendarRange className="h-4 w-4" />} label={t('accounting.vehicles.reg_expiry')} value={v.registration_expiry ? formatDate(String(v.registration_expiry), lang) : ''} />
            <Field icon={<MapPin className="h-4 w-4" />} label={t('accounting.vehicles.location')} value={String(v.location ?? vehicle.location ?? '')} />
            <Field icon={<BadgeCheck className="h-4 w-4" />} label={t('accounting.vehicles.status')} value={t(`accounting.vehicles.st.${String(v.status ?? vehicle.status)}`)} />
          </div>

          {/* cost by category — shows the IQD/USD total AND how many times (count),
              e.g. how many fuel fills / maintenances. Click a card to filter below. */}
          {(data?.by_category.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-600">{t('accounting.vehicles.by_category')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data!.by_category.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() => setCatFilter((cur) => (cur === c.category ? '' : c.category))}
                    className={
                      'rounded-xl border px-3 py-2 text-start transition ' +
                      (catFilter === c.category ? 'border-primary bg-primary/5' : 'border-slate-100 hover:bg-slate-50')
                    }
                  >
                    <span className="flex items-center justify-between gap-1.5 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        {CAT_ICON[c.category] ?? <Coins className="h-3.5 w-3.5" />}
                        {t(`accounting.vehicles.cat.${c.category}`)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">×{c.count}</span>
                    </span>
                    <span className="mt-1 block text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(c.iqd, 'IQD', lang)}</span>
                    {c.usd ? <span className="block text-[11px] tabular-nums text-emerald-600">{formatCurrency(c.usd, 'USD', lang)}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* cost history — filter chips + clickable rows (journal-sourced rows open the entry) */}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-600">{t('accounting.vehicles.recent_costs')}</p>
              {catChips.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {catChips.map((c) => (
                    <button
                      key={c.value || 'all'}
                      type="button"
                      onClick={() => setCatFilter(c.value)}
                      className={
                        'rounded-full px-2.5 py-1 text-[11px] font-medium transition ' +
                        (catFilter === c.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {costs.length > 0 ? (
              <ArabicTable
                columns={costColumns}
                data={costs}
                rowKey={(r, i) => `${r.entry_id ?? 'vc'}-${i}`}
                onRowClick={(r) => r.entry_id && onOpenEntry(r.entry_id)}
                searchable={false}
                pageSize={8}
                emptyTitle={t('accounting.vehicles.no_costs')}
              />
            ) : (
              <EmptyState title={t('accounting.vehicles.no_costs')} />
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
