import { useMemo } from 'react'
import { GanttChartSquare } from 'lucide-react'
import { GanttList, type GanttTask } from '../../../components/shared/GanttList'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/shared/EmptyState'
import { LoadingState } from '../../../components/ui/Spinner'
import { CHART_COLORS } from '../../../components/shared/ChartCard'
import { useResource } from '../../../hooks/useResource'
import { useT } from '../../../context/LangContext'
import type { ProjectMilestone } from '../../../types'

export function TimelineTab({ projectId }: { projectId: string }) {
  const t = useT()
  const { data: milestones, loading } = useResource<ProjectMilestone>('project_milestones', { project_id: projectId })

  const tasks: GanttTask[] = useMemo(
    () =>
      [...milestones]
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .map((m, i) => ({
          id: m.id,
          label: m.name_ar,
          start: m.start_date,
          end: m.end_date,
          percent: m.percent_complete,
          color: CHART_COLORS[i % CHART_COLORS.length],
        })),
    [milestones],
  )

  return (
    <Card>
      <CardHeader
        title={t('projects.timeline.title')}
        subtitle={t('projects.timeline.subtitle')}
        icon={<GanttChartSquare className="h-4 w-4" />}
      />
      <CardBody>
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : tasks.length === 0 ? (
          <EmptyState title={t('projects.timeline.empty')} icon={<GanttChartSquare className="h-7 w-7" />} />
        ) : (
          <GanttList tasks={tasks} />
        )}
      </CardBody>
    </Card>
  )
}
