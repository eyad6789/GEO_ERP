import type { RouteObject } from 'react-router-dom'
import './strings'
import { CompaniesList } from './CompaniesList'
import { CompanyDetail } from './CompanyDetail'

// Companies module — group grid + per-company detail with tabs.
export const routes: RouteObject[] = [
  { path: 'companies', element: <CompaniesList /> },
  { path: 'companies/:id', element: <CompanyDetail /> },
]
