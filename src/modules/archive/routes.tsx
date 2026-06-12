import type { RouteObject } from 'react-router-dom'
import { ArchivePage } from './ArchivePage'
import './strings'

export const routes: RouteObject[] = [
  { path: 'archive', element: <ArchivePage /> },
]
