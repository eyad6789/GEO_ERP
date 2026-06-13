import type { RouteObject } from 'react-router-dom'
import './strings'
import { WarehousePage } from './WarehousePage'

export const routes: RouteObject[] = [
  { path: 'warehouse', element: <WarehousePage /> },
]
