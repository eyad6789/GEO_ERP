import { useMemo } from 'react'
import { CalendarRange } from 'lucide-react'
import { ArabicTable, type Column } from '../../../components/shared/ArabicTable'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatDate, formatNumber } from '../../../lib/format'
import { ProgressBar } from '../ProgressBar'
import type { ProjectMilestone } from '../../../types'

function durationDays(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e)) return 0
  return Math.max(0, Math.round((e - s) / 86_400_000))
}

export function SchedulesTab({ projectId }: { projectId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: milestones, loading } = useResource<ProjectMilestone>('project_milestones', { project_id: projectId })

  const sorted = useMemo(
    () => [...milestones].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
    [milestones],
  )

  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    milestones.forEach((x) => m.set(x.id, x.name_ar))
    return m
  }, [milestones])

  const columns: Column<ProjectMilestone>[] = [
    {
      key: 'name',
      header: t('projects.sched.milestone'),
      accessor: (m) => m.name_ar,
      sortable: true,
      render: (m) => <span className="font-medium text-slate-800 dark:text-slate-100">{m.name_ar}</span>,
    },
    { key: 'start_date', header: t('projects.field.start_date'), accessor: (m) => m.start_date, sortable: true, render: (m) => formatDate(m.start_date, lang) },
    { key: 'end_date', header: t('projects.field.end_date'), accessor: (m) => m.end_date, sortable: true, render: (m) => formatDate(m.end_date, lang) },
    {
      key: 'duration',
      header: t('projects.sched.duration_days'),
      accessor: (m) => durationDays(m.start_date, m.end_date),
      sortable: true,
      align: 'center',
      render: (m) => <span className="tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(durationDays(m.start_date, m.end_date), lang)}</span>,
    },
    {
      key: 'percent_complete',
      header: t('projects.sched.percent'),
      accessor: (m) => m.percent_complete,
      sortable: true,
      width: '180px',
      render: (m) => <ProgressBar value={m.percent_complete} showLabel size="sm" />,
    },
    {
      key: 'depends_on',
      header: t('projects.sched.depends'),
      accessor: (m) => (m.depends_on ? nameById.get(m.depends_on) ?? m.depends_on : ''),
      render: (m) => (m.depends_on ? <span className="text-slate-500 dark:text-slate-400">{nameById.get(m.depends_on) ?? m.depends_on}</span> : <span className="text-slate-300">—</span>),
    },
  ]

  return (
    <Card>
      <CardHeader title={t('projects.sched.title')} icon={<CalendarRange className="h-4 w-4" />} />
      <CardBody className="p-0">
        <ArabicTable
          columns={columns}
          data={sorted}
          loading={loading}
          rowKey={(m) => m.id}
          searchable={false}
          exportName={`project-${projectId}-schedule`}
          emptyTitle={t('projects.timeline.empty')}
        />
      </CardBody>
    </Card>
  )
}
