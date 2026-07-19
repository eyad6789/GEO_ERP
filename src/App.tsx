import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { LockedPage } from './components/shared/LockedPage'
import { isModuleLocked, LANDING_PATH } from './config/nav'
import { useT } from './context/LangContext'

// Each module owns its own routes.tsx exporting `routes: RouteObject[]`.
import { routes as dashboardRoutes } from './modules/dashboard/routes'
import { routes as companiesRoutes } from './modules/companies/routes'
import { routes as projectsRoutes } from './modules/projects/routes'
import { routes as vehiclesRoutes } from './modules/vehicles/routes'
import { routes as hrRoutes } from './modules/hr/routes'
import { routes as accountingRoutes } from './modules/accounting/routes'
import { routes as warehouseRoutes } from './modules/warehouse/routes'
import { routes as archiveRoutes } from './modules/archive/routes'
import { routes as eventlogsRoutes } from './modules/eventlogs/routes'
import { routes as notesRoutes } from './modules/notes/routes'
import { routes as debugRoutes } from './modules/debug/routes'

// Locked modules keep their paths but render the lock screen instead of content.
function gate(key: string, routes: RouteObject[]): RouteObject[] {
  if (!isModuleLocked(key)) return routes
  return routes.map((r) => {
    const path = 'path' in r ? r.path : undefined
    return { path, element: <LockedPage moduleKey={key} /> } as RouteObject
  })
}

function NotFound() {
  const t = useT()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-5xl font-black text-primary/20">404</p>
      <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">{t('notfound.title')}</p>
      <a href={LANDING_PATH} className="text-sm text-primary hover:underline">
        {t('notfound.back')}
      </a>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={LANDING_PATH} replace /> },
      ...gate('dashboard', dashboardRoutes),
      ...gate('companies', companiesRoutes),
      ...gate('projects', projectsRoutes),
      ...gate('fleet', vehiclesRoutes),
      ...gate('hr', hrRoutes),
      ...gate('accounting', accountingRoutes),
      ...gate('warehouse', warehouseRoutes),
      ...gate('archive', archiveRoutes),
      ...gate('logs', eventlogsRoutes),
      ...gate('notes', notesRoutes),
      ...gate('debug', debugRoutes),
      { path: '*', element: <NotFound /> },
    ],
  },
])
