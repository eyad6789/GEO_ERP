import type { RouteObject } from 'react-router-dom'
import './strings'
import { DashboardPage } from './DashboardPage'

export const routes: RouteObject[] = [
  { path: 'dashboard', element: <DashboardPage /> },
]
