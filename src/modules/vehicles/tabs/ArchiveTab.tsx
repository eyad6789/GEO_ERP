// ============================================================================
// ArchiveTab — vehicle registration papers, driver documents, sold/retired
// vehicles. Mirrors the prototype's Archive tab but is driven by real vehicle
// records and rendered in the house design system. Real document files will be
// uploaded later by the user.
// ============================================================================
import { useMemo } from 'react'
import { FileText, IdCard, Tag, FolderArchive, AlertTriangle, ShieldCheck } from 'lucide-react'
import { KpiCard, StatusBadge, EmptyState } from '../../../components/shared'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { LoadingState } from '../../../components/ui/Spinner'
import { useT, useLang } from '../../../context/LangContext'
import { useResource } from '../../../hooks/useResource'
import { formatDate, pickName } from '../../../lib/format'
import { regState, REG_CHIP, REG_LABEL_KEY, TYPE_ICON } from '../fleetUtils'
import type { Vehicle, VehicleType } from '../../../types'

function VehicleTypeIcon({ type, className }: { type: VehicleType; className?: string }) {
  const Icon = TYPE_ICON[type]
  return <Icon className={className} />
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-50 px-5 py-2.5 last:border-0 hover:bg-slate-50/60">
      {children}
    </div>
  )
}

export function ArchiveTab() {
  const t = useT()
  const { lang } = useLang()
  const { data: vehicles, loading } = useResource<Vehicle>('vehicles')

  const drivers = useMemo(() => {
    const seen = new Set<string>()
    for (const v of vehicles) {
      const name = (v.driver_name || '').trim()
      if (name && name !== '—') seen.add(name)
    }
    return [...seen]
  }, [vehicles])

  const expiringCount = useMemo(
    () => vehicles.filter((v) => regState(v.registration_expiry) === 'soon').length,
    [vehicles],
  )
  const expiredCount = useMemo(
    () => vehicles.filter((v) => regState(v.registration_expiry) === 'expired').length,
    [vehicles],
  )
  const retired = useMemo(() => vehicles.filter((v) => v.status === 'RETIRED'), [vehicles])

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

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t('fleet.arch.documents')}
          value={vehicles.length + drivers.length}
          icon={<FileText className="h-5 w-5" />}
          accent="primary"
          hint={`${vehicles.length} + ${drivers.length}`}
        />
        <KpiCard
          label={t('fleet.arch.drivers')}
          value={drivers.length}
          icon={<IdCard className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label={t('fleet.arch.expiring')}
          value={expiringCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label={t('fleet.arch.expired')}
          value={expiredCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Registration papers */}
        <Card>
          <CardHeader
            title={t('fleet.arch.registration')}
            subtitle={`${vehicles.length} ${t('fleet.inventory.count')}`}
            icon={<FileText className="h-5 w-5" />}
          />
          <div>
            {vehicles.slice(0, 7).map((v) => {
              const rs = regState(v.registration_expiry)
              return (
                <ListItem key={v.id}>
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
          />
          <div>
            {drivers.slice(0, 7).map((name) => (
              <ListItem key={name}>
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

        {/* Sold & retired */}
        <Card>
          <CardHeader
            title={t('fleet.arch.sold')}
            subtitle={`${retired.length}`}
            icon={<Tag className="h-5 w-5" />}
          />
          <div>
            {retired.length ? (
              retired.slice(0, 7).map((v) => (
                <ListItem key={v.id}>
                  <VehicleTypeIcon type={v.vehicle_type} className="h-5 w-5 shrink-0 text-slate-500 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-600" dir="ltr">{v.plate_number}</p>
                    <p className="truncate text-xs text-slate-400">
                      {pickName(v, lang)}
                      {v.model_year ? ` · ${v.model_year}` : ''}
                    </p>
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
      </div>

      <p className="text-center text-xs text-slate-400">{t('fleet.arch.placeholder')}</p>
    </div>
  )
}
