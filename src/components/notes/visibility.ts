import type { Note } from '../../types'

/**
 * Note privacy (no real auth — scoped to the "acting as" current user):
 *  - PRIVATE  → visible only to its author (the person who wrote it)
 *  - RESTRICTED / PUBLIC → visible to everyone
 */
export function noteVisibleTo(n: Note, userName: string): boolean {
  return n.visibility !== 'PRIVATE' || (n.author ?? '') === userName
}
