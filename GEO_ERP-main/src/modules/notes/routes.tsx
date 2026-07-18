import type { RouteObject } from 'react-router-dom'
import NotesPage from './NotesPage'
import './strings'

// Notes module — a single full page listing every module note (add / delete / search).
export const routes: RouteObject[] = [
  { path: 'notes', element: <NotesPage /> },
]
