import type { RouteObject } from 'react-router-dom'
import './strings'
import { ProjectsList } from './ProjectsList'
import { ProjectDetail } from './ProjectDetail'

// Projects module — list (card grid) + project detail shell with 8 internal tabs.
export const routes: RouteObject[] = [
  { path: 'projects', element: <ProjectsList /> },
  { path: 'projects/:id', element: <ProjectDetail /> },
]
