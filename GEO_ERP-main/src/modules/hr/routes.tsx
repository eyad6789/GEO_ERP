import type { RouteObject } from 'react-router-dom'
import HrShell from './HrShell'
import EmployeeDetail from './EmployeeDetail'
import './strings'

// HR module — employee directory, org chart, payroll, attendance, leaves,
// gifts, advances, performance, and a full employee detail page.
export const routes: RouteObject[] = [
  { path: 'hr', element: <HrShell /> },
  { path: 'hr/employees/:id', element: <EmployeeDetail /> },
]
