import type { ReactNode } from 'react'
import {
  FileText,
  Mail,
  MailOpen,
  Megaphone,
  ReceiptText,
  UserSquare,
  Inbox,
} from 'lucide-react'
import type { ArchiveDocType } from '../../types'
import type { BadgeColor } from '../../components/ui'

/** The six document types, in tab order. */
export const DOC_TYPES: ArchiveDocType[] = [
  'CV',
  'MESSAGE',
  'EMAIL_EXT',
  'EMAIL_INT',
  'NEWS',
  'FINANCIAL',
]

/** Icon per document type — used in tabs, dialog header and cards. */
export function docTypeIcon(type: ArchiveDocType, className = 'h-4 w-4'): ReactNode {
  switch (type) {
    case 'CV':
      return <UserSquare className={className} />
    case 'MESSAGE':
      return <Inbox className={className} />
    case 'EMAIL_EXT':
      return <Mail className={className} />
    case 'EMAIL_INT':
      return <MailOpen className={className} />
    case 'NEWS':
      return <Megaphone className={className} />
    case 'FINANCIAL':
      return <ReceiptText className={className} />
    default:
      return <FileText className={className} />
  }
}

/**
 * Seeded doc_status values are free-text Arabic ('مؤرشف', 'معلق', 'تم الرد').
 * Map to a Badge color heuristically so the chips stay meaningful & colorful.
 */
export function docStatusColor(status: string): BadgeColor {
  const s = (status || '').trim()
  if (s.includes('معلق')) return 'amber'
  if (s.includes('رد') || s.includes('معتمد')) return 'green'
  if (s.includes('مرفوض') || s.includes('ملغ')) return 'red'
  if (s.includes('مؤرشف')) return 'blue'
  return 'gray'
}

/** Parse the csv `tags` column into a clean array. */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  return tags
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** First N characters of a body string for card excerpts, ellipsised. */
export function excerpt(text: string | null | undefined, max = 120): string {
  if (!text) return ''
  const clean = text.trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean
}
