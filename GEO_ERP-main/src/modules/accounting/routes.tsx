import type { RouteObject } from 'react-router-dom'
import AccountingPage from './AccountingPage'
import AccountDetail from './AccountDetail'
import './strings'

// Accounting module — journal entries, chart of accounts, financial statements & reports.
export const routes: RouteObject[] = [
  { path: 'accounting', element: <AccountingPage /> },
  { path: 'accounting/accounts/:code', element: <AccountDetail /> },
]
