import { Search, Bell, Languages, ChevronDown, Menu } from 'lucide-react'
import { CompanySelector } from './CompanySelector'
import { useLang, useT } from '../../context/LangContext'
import { useCompany, ROLES } from '../../context/CompanyContext'
import { Avatar } from '../ui/Avatar'
import { Popover } from '../ui/Popover'

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const t = useT()
  const { lang, toggle } = useLang()
  const { role, setRole } = useCompany()

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        title={t('header.toggle_sidebar')}
        aria-label={t('header.toggle_sidebar')}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Global search */}
      <div className="relative hidden flex-1 max-w-md lg:block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder={t('header.search_global')}
          className="input-base h-9 ps-9 bg-slate-50 border-transparent focus:bg-white"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
        <CompanySelector />

        {/* Language toggle */}
        <button
          onClick={toggle}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          title="AR / EN"
        >
          <Languages className="h-4 w-4" />
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50">
          <Bell className="h-4 w-4" />
          <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
        </button>

        {/* Role / user menu (cosmetic) */}
        <Popover
          width="w-56"
          trigger={({ toggle: tg }) => (
            <button onClick={tg} className="flex items-center gap-2 rounded-lg p-1 pe-2 transition hover:bg-slate-50">
              <Avatar name="أحمد المدير" color="#1a5f7a" size="sm" />
              <div className="hidden text-start sm:block">
                <p className="text-xs font-semibold text-slate-700">أحمد المدير</p>
                <p className="text-[10px] text-slate-400">{lang === 'ar' ? role.label_ar : role.label_en}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-1">
              <p className="px-2 py-1 text-xs font-semibold text-slate-400">{t('header.role')}</p>
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    setRole(r)
                    close()
                  }}
                  className={
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-50 ' +
                    (r.key === role.key ? 'text-primary font-semibold' : 'text-slate-600')
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
  )
}
