import { useState } from 'react'
import { Search, Bell, Languages, ChevronDown, Menu, AlertTriangle, Clock, Sun, Moon } from 'lucide-react'
import { CompanySelector } from './CompanySelector'
import { useLang, useT } from '../../context/LangContext'
import { useTheme } from '../../context/ThemeContext'
import { useCompany, ROLES } from '../../context/CompanyContext'
import { useApi } from '../../hooks/useResource'
import { apiGet } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { Popover } from '../ui/Popover'
import { Badge } from '../ui/Badge'
import { formatDate } from '../../lib/format'
import { VehicleModule } from '../../modules/vehicles/VehicleModule'
import type { Vehicle } from '../../types'

interface LicenseAlert {
  id: string
  plate_number: string
  name_ar: string
  name_en: string
  driver_name: string
  expiry: string
  days: number
  kind: 'expired' | 'soon'
}

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const t = useT()
  const { lang, toggle } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const { role, setRole } = useCompany()

  // Vehicle license / registration expiry notifications — for the FLEET MANAGER only.
  const isFleetManager = role.key === 'fleet_manager'
  const { data: licenseData } = useApi<{ count: number; expired: number; soon: number; alerts: LicenseAlert[] }>(
    '/fleet/license-alerts',
  )
  const alerts = isFleetManager ? licenseData?.alerts ?? [] : []
  const notifCount = isFleetManager ? licenseData?.count ?? 0 : 0

  // Clicking an alert opens that vehicle's full module (license + car details).
  const [openVehicle, setOpenVehicle] = useState<Vehicle | null>(null)
  const openCar = async (id: string, close: () => void) => {
    close()
    try { setOpenVehicle(await apiGet<Vehicle>(`/vehicles/${id}`)) } catch { /* ignore */ }
  }

  return (
    <>
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-4 backdrop-blur sm:px-6">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        title={t('header.toggle_sidebar')}
        aria-label={t('header.toggle_sidebar')}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Global search */}
      <div className="relative hidden flex-1 max-w-md lg:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
        <input
          placeholder={t('header.search_global')}
          className="input-base h-9 ps-9 bg-slate-50 dark:bg-slate-800/60 border-transparent focus:bg-white dark:focus:bg-slate-800"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
        <CompanySelector />

        {/* Theme (light/dark) toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title={t(theme === 'dark' ? 'header.theme.light' : 'header.theme.dark')}
          aria-label={t(theme === 'dark' ? 'header.theme.light' : 'header.theme.dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Language toggle */}
        <button
          onClick={toggle}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="AR / EN"
        >
          <Languages className="h-4 w-4" />
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>

        {/* Notifications — vehicle license / registration expiry */}
        <Popover
          width="w-[22rem]"
          align="end"
          trigger={({ toggle: tg }) => (
            <button
              onClick={tg}
              title={t('header.notif.title')}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Bell className="h-4 w-4 text-primary" />
                  {t('header.notif.title')}
                </span>
                {notifCount > 0 && <Badge color="red">{notifCount}</Badge>}
              </div>

              {alerts.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-400">
                  {isFleetManager ? t('header.notif.empty') : t('header.notif.fleet_only')}
                </p>
              ) : (
                <div className="-mx-1 max-h-[22rem] space-y-1 overflow-y-auto px-1">
                  {alerts.map((a) => {
                    const expired = a.kind === 'expired'
                    return (
                      <button
                        key={a.id}
                        onClick={() => openCar(a.id, close)}
                        className="block w-full rounded-lg border border-slate-100 dark:border-slate-700/70 p-2.5 text-start transition hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-slate-700 dark:text-slate-200 tabular-nums" dir="ltr">{a.plate_number}</span>
                          <span
                            className={
                              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                              (expired ? 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300')
                            }
                          >
                            {expired ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {t(expired ? 'header.notif.expired' : 'header.notif.soon')}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {lang === 'ar' ? a.name_ar : a.name_en || a.name_ar}
                          {a.driver_name ? ` · ${a.driver_name}` : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-400">
                          {formatDate(a.expiry, lang)} ·{' '}
                          {expired
                            ? `${Math.abs(a.days)} ${t('header.notif.days_overdue')}`
                            : `${a.days} ${t('header.notif.days_left')}`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Popover>

        {/* Role / user menu (cosmetic) */}
        <Popover
          width="w-56"
          trigger={({ toggle: tg }) => (
            <button onClick={tg} className="flex items-center gap-2 rounded-lg p-1 pe-2 transition hover:bg-slate-50 dark:hover:bg-slate-800">
              <Avatar name="أحمد المدير" color="#1a5f7a" size="sm" />
              <div className="hidden text-start sm:block">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">أحمد المدير</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400">{lang === 'ar' ? role.label_ar : role.label_en}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-400" />
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-1">
              <p className="px-2 py-1 text-xs font-semibold text-slate-400 dark:text-slate-400">{t('header.role')}</p>
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    setRole(r)
                    close()
                  }}
                  className={
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ' +
                    (r.key === role.key ? 'text-primary font-semibold' : 'text-slate-600 dark:text-slate-300')
                  }
                >
                  {lang === 'ar' ? r.label_ar : r.label_en}
                  {r.key === role.key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </Popover>
      </div>
    </header>

    {/* Full vehicle module opened from a license notification. */}
    {openVehicle && (
      <VehicleModule
        vehicle={openVehicle}
        focus="full"
        onClose={() => setOpenVehicle(null)}
        onChanged={() => setOpenVehicle(null)}
      />
    )}
    </>
  )
}
