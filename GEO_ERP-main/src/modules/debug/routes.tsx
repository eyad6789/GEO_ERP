import type { RouteObject } from 'react-router-dom'
import { DebugWindow } from './DebugWindow'
import './strings'

// Debug Window — dark-themed developer/ops panel.
export const routes: RouteObject[] = [
  { path: 'debug', element: <DebugWindow /> },
]
