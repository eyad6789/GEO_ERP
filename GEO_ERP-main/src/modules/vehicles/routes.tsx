import type { RouteObject } from 'react-router-dom'
import './strings'
import { FleetPage } from './FleetPage'

// Fleet (الآليات) module — single page with four internal tabs
// (Vehicles · Accounting · Map & Tracking · Archive).
export const routes: RouteObject[] = [
  { path: 'fleet', element: <FleetPage /> },
]
