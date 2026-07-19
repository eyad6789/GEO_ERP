import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PanelLeftOpen } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useT } from '../../context/LangContext'

export function AppLayout() {
  const t = useT()
  // Sidebar starts open on desktop, closed on small screens.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768,
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-800/60">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Floating opener — shown only while the sidebar is collapsed/closed, so
          it can always be reopened (the toggle otherwise lives inside the sidebar). */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 start-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-md transition hover:bg-slate-50 dark:hover:bg-slate-700"
          title={t('header.toggle_sidebar')}
          aria-label={t('header.toggle_sidebar')}
        >
          <PanelLeftOpen className="h-5 w-5 rtl:-scale-x-100" />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
