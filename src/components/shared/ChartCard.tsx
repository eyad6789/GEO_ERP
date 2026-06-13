import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { Card, CardHeader } from '../ui/Card'

// Brand-aligned palette for all charts.
export const CHART_COLORS = [
  '#1a5f7a',
  '#e8a838',
  '#2d9cdb',
  '#27ae60',
  '#e74c3c',
  '#9b59b6',
  '#f39c12',
  '#16a085',
  '#34495e',
  '#d35400',
]

export const STATUS_CHART_COLORS: Record<string, string> = {
  PLANNING: '#2d9cdb',
  ACTIVE: '#27ae60',
  ON_HOLD: '#f39c12',
  COMPLETED: '#1a5f7a',
  CANCELLED: '#e74c3c',
}

/**
 * Titled card wrapping a Recharts chart in a ResponsiveContainer.
 * Pass a single Recharts chart element as children.
 */
export function ChartCard({
  title,
  subtitle,
  icon,
  action,
  height = 300,
  children,
  bodyClassName,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  height?: number
  children: ReactElement
  bodyClassName?: string
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      <div className={bodyClassName ?? 'p-3'} style={{ direction: 'ltr' }}>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
