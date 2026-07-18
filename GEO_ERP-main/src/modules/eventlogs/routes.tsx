import type { RouteObject } from 'react-router-dom'
import './strings'
import { EventLogsPage } from './EventLogsPage'

export const routes: RouteObject[] = [
  { path: 'logs', element: <EventLogsPage /> },
]
