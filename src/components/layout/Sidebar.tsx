import { NavLink } from 'react-router-dom'
import { Lock, X } from 'lucide-react'
import { NAV_ITEMS, isModuleLocked } from '../../config/nav'
import { useT } from '../../context/LangContext'
import { cn } from '../../lib/cn'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  // Close the sidebar after navigating on small screens (overlay mode).
  const handleNav = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) onClose()
  }
  return (
    <>
      {/* Backdrop (mobile overlay only) */}
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'z-40 w-[var(--sidebar-w)] shrink-0 flex-col border-e border-slate-200 bg-white',
          'fixed inset-y-0 start-0 md:static',
          open ? 'flex' : 'hidden',
        )}
      >
      {/* Brand */}
      <div className="brand-gradient flex h-[var(--header-h)] items-center gap-2.5 px-4 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5">
          <img src="/qeg-logo.png" alt={t('app.title')} className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold">{t('app.title')}</p>
          <p className="truncate text-[11px] text-white/70">{t('app.subtitle')}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/15 md:hidden"
          title={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const locked = isModuleLocked(item.key)
          return (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={handleNav}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  item.variant === 'debug'
                    ? isActive
                      ? 'bg-debug-bg text-white'
                      : 'text-slate-500 hover:bg-slate-900 hover:text-white'
                    : isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:bg-primary/5 hover:text-primary',
                  locked && !isActive && 'text-slate-400',
                )
              }
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', locked && 'opacity-70')} />
              <span className="flex-1">{t(item.labelKey)}</span>
              {locked && <Lock className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs font-semibold text-slate-500">al-qabas E.G. ERP · v1.0</p>
          <p className="mt-0.5 text-[10px] text-slate-400">نسخة تجريبية للعرض</p>
        </div>
      </div>
    </aside>
    </>
  )
}
