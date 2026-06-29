// ============================================================================
// ArchiveTab — vehicle registration papers, driver documents, sold/retired
// vehicles. Mirrors the prototype's Archive tab but is driven by real vehicle
// records and rendered in the house design system. Real document files will be
// uploaded later by the user.
// ============================================================================
import { useMemo, useState } from 'react'
import { FileText, IdCard, Tag, FolderArchive, AlertTriangle, ShieldCheck, Plus } from 'lucide-react'
import { KpiCard, StatusBadge, EmptyState } from '../../../components/shared'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { LoadingState } from '../../../components/ui/Spinner'
import { Button, Dialog, Field, SearchSelect } from '../../../components/ui'
import { useT, useLang } from '../../../context/LangContext'
import { useCompany } from '../../../context/CompanyContext'
import { useResource } from '../../../hooks/useResource'
import { pickName } from '../../../lib/format'
import { regState, REG_CHIP, REG_LABEL_KEY, TYPE_ICON, canEditFleet } from '../fleetUtils'
import { VehicleModule } from '../VehicleModule'
import { registerStrings } from '../../../i18n/strings'
import type { Vehicle, VehicleType } from '../../../types'

type AddFocus = 'driver' | 'registration' | 'sell' | 'retire'
registerStrings({
  'fleet.add.new': { ar: 'إضافة', en: 'Add' },
  'fleet.add.pick': { ar: 'اختر الآلية', en: 'Choose a vehicle' },
  'fleet.add.driver': { ar: 'إضافة إجازة سوق سائق', en: 'Add a driver license' },
  'fleet.add.registration': { ar: 'إضافة أوراق/إجازة آلية', en: 'Add registration papers' },
  'fleet.add.sell': { ar: 'بيع آلية', en: 'Sell a vehicle' },
  'fleet.add.retire': { ar: 'إخراج آلية من الخدمة', en: 'Retire a vehicle' },
})

function VehicleTypeIcon({ type, className }: { type: VehicleType; className?: string }) {
  const Icon = TYPE_ICON[type]
  return <Icon className={className} />
}

function ListItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      className={'flex items-center gap-3 border-b border-slate-50 px-5 py-2.5 last:border-0 hover:bg-slate-50/60' + (onClick ? ' cursor-pointer' : '')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      {children}
    </div>
  )
}

export function ArchiveTab() {
  const t = useT()
  const { lang } = useLang()
  const { role } = useCompany()
  const canEdit = canEditFleet(role.key)
  const { data: vehicles, loading, refetch } = useResource<Vehicle>('vehicles')
  const [openVehicle, setOpenVehicle] = useState<Vehicle | null>(null)
  const [openFocus, setOpenFocus] = useState<'full' | AddFocus>('full')
  const openCar = (v: Vehicle, f: 'full' | AddFocus) => { setOpenVehicle(v); setOpenFocus(f) }
  // "+ Add" → pick a vehicle, then open the matching module in that focus.
  const [pickFocus, setPickFocus] = useState<AddFocus | null>(null)
  const addBtn = (f: AddFocus) =>
    canEdit ? (
      <button
        type="button"
        onClick={() => setPickFocus(f)}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />{t('fleet.add.new')}
      </button>
    ) : undefined

  // Unique driver names → the (first) vehicle they drive, so clicking a driver
  // opens that vehicle's module (driver details + license uploads live there).
  const driverVehicle = useMemo(() => {
    const m = new Map<string, Vehicle>()
    for (const v of vehicles) {
      const name = (v.driver_name || '').trim()
      if (name && name !== '—' && !m.has(name)) m.set(name, v)
    }
    return m
  }, [vehicles])
  const drivers = useMemo(() => [...driverVehicle.keys()], [driverVehicle])

  const expiredCount = useMemo(
    () => vehicles.filter((v) => regState(v.registration_expiry) === 'expired').length,
    [vehicles],
  )
  const retired = useMemo(() => vehicles.filter((v) => v.status === 'RETIRED'), [vehicles])
  const sold = useMemo(() => vehicles.filter((v) => v.status === 'SOLD'), [vehicles])

  if (loading) {
    return (
      <div className="py-16">
        <LoadingState label={t('common.loading')} />
      </div>
    )
  }

  if (!vehicles.length) {
    return <EmptyState title={t('fleet.empty')} hint={t('fleet.empty_hint')} icon={<FolderArchive className="h-7 w-7" />} />
  }

  // Card listing sold / retired vehicles (clicking a row opens the full module).
  const soldRetiredCard = (title: string, list: Vehicle[], focus: AddFocus) => (
    <Card>
      <CardHeader title={title} subtitle={`${list.length}`} icon={<Tag className="h-5 w-5" />} action={addBtn(focus)} />
      <div>
        {list.length ? (
          list.slice(0, 7).map((v) => (
            <ListItem key={v.id} onClick={() => openCar(v, focus)}>
              <VehicleTypeIcon type={v.vehicle_type} className="h-5 w-5 shrink-0 text-slate-500 opacity-60" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-600" dir="ltr">{v.plate_number}</p>
                <p className="truncate text-xs text-slate-400">{pickName(v, lang)}{v.model_year ? ` · ${v.model_year}` : ''}</p>
              </div>
              <StatusBadge status={v.status} />
            </ListItem>
          ))
        ) : (
          <CardBody>
            <p className="text-center text-sm text-slate-400">{t('fleet.empty')}</p>
          </CardBody>
        )}
      </div>
    </Card>
  )

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
        <KpiCard
          label={t('fleet.arch.documents')}
          value={vehicles.length + drivers.length}
          icon={<FileText className="h-5 w-5" />}
          accent="primary"
          hint={`${vehicles.length} + ${drivers.length}`}
        />
        <KpiCard
          label={t('fleet.arch.expired')}
          value={expiredCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Registration papers */}
        <Card>
          <CardHeader
            title={t('fleet.arch.registration')}
            subtitle={`${vehicles.length} ${t('fleet.inventory.count')}`}
            icon={<FileText className="h-5 w-5" />}
            action={addBtn('registration')}
          />
          <div>
            {vehicles.slice(0, 7).map((v) => {
              const rs = regState(v.registration_expiry)
              return (
                <ListItem key={v.id} onClick={() => openCar(v, 'registration')}>
                  <VehicleTypeIcon type={v.vehicle_type} className="h-5 w-5 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700" dir="ltr">{v.plate_number}</p>
                    <p className="truncate text-xs text-slate-400">{pickName(v, lang)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${REG_CHIP[rs]}`}>
                    {t(REG_LABEL_KEY[rs])}
                  </span>
                </ListItem>
              )
            })}
            <div className="px-5 py-2.5 text-center">
              <span className="text-xs font-medium text-primary">{t('fleet.arch.view_all')} ({vehicles.length})</span>
            </div>
          </div>
        </Card>

        {/* Driver documents */}
        <Card>
          <CardHeader
            title={t('fleet.arch.drivers')}
            subtitle={`${drivers.length}`}
            icon={<IdCard className="h-5 w-5" />}
            action={addBtn('driver')}
          />
          <div>
            {drivers.slice(0, 7).map((name) => (
              <ListItem key={name} onClick={() => { const v = driverVehicle.get(name); if (v) openCar(v, 'driver') }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                  <IdCard className="h-4 w-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{name}</p>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <ShieldCheck className="h-3 w-3" />
                  {t('fleet.arch.valid')}
                </span>
              </ListItem>
            ))}
            <p className="px-5 py-3 text-center text-xs text-slate-400">{t('fleet.arch.placeholder')}</p>
          </div>
        </Card>

        {/* Sold vehicles */}
        {soldRetiredCard(t('fleet.arch.sold_cars'), sold, 'sell')}

        {/* Retired / out-of-service vehicles */}
        {soldRetiredCard(t('fleet.arch.retired_cars'), retired, 'retire')}
      </div>

      <p className="text-center text-xs text-slate-400">{t('fleet.arch.placeholder')}</p>

      {openVehicle && (
        <VehicleModule
          vehicle={openVehicle}
          focus={openFocus}
          onClose={() => setOpenVehicle(null)}
          onChanged={() => { refetch(); setOpenVehicle(null) }}
        />
      )}

      {/* "+ Add" → choose a vehicle, then open the matching module. */}
      {pickFocus && (
        <Dialog
          open
          onClose={() => setPickFocus(null)}
          size="sm"
          title={t(`fleet.add.${pickFocus}`)}
          footer={<Button variant="outline" onClick={() => setPickFocus(null)}>{t('common.cancel')}</Button>}
        >
          <Field label={t('fleet.add.pick')}>
            <SearchSelect
              value=""
              onChange={(id) => { const v = vehicles.find((x) => x.id === id); if (v) { const f = pickFocus; setPickFocus(null); openCar(v, f) } }}
              options={vehicles.map((v) => ({ value: v.id, label: `${v.plate_number} — ${pickName(v, lang)}` }))}
              placeholder={t('fleet.add.pick')}
            />
          </Field>
        </Dialog>
      )}
    </div>
  )
}
