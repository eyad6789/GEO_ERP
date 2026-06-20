import { Badge, type BadgeColor } from '../ui/Badge'
import { useT } from '../../context/LangContext'

// Maps any known status string to a color. Label comes from i18n key `status.<KEY>`.
const COLOR_MAP: Record<string, BadgeColor> = {
  // generic
  ACTIVE: 'green',
  INACTIVE: 'gray',
  // projects
  PLANNING: 'sky',
  ON_HOLD: 'amber',
  COMPLETED: 'blue',
  CANCELLED: 'red',
  // approvals
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  REPAYING: 'sky',
  SETTLED: 'gray',
  DRAFT: 'gray',
  // employees
  ON_LEAVE: 'amber',
  SUSPENDED: 'red',
  TERMINATED: 'gray',
  // fleet
  MAINTENANCE: 'amber',
  RETIRED: 'gray',
  // logs
  SUCCESS: 'green',
  FAILED: 'red',
  WARNING: 'amber',
  // attendance
  PRESENT: 'green',
  ABSENT: 'red',
  LEAVE: 'amber',
  MISSION: 'sky',
  HOLIDAY: 'purple',
}

export function StatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  const t = useT()
  const color = COLOR_MAP[status] ?? 'gray'
  const label = t(`status.${status}`)
  return (
    <Badge color={color} dot={dot}>
      {label}
    </Badge>
  )
}
