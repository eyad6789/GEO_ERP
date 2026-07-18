import { FileType2, MessageSquare, FileText } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { Badge, type BadgeColor } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/shared/EmptyState'
import { LoadingState } from '../../../components/ui/Spinner'
import { useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatDate } from '../../../lib/format'
import type { ProjectDiagram } from '../../../types'

const FILE_TYPE_COLOR: Record<string, BadgeColor> = {
  DWG: 'blue',
  PDF: 'red',
  PNG: 'green',
  JPG: 'amber',
  RVT: 'purple',
  DXF: 'sky',
}

export function DiagramsTab({ projectId }: { projectId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: diagrams, loading } = useResource<ProjectDiagram>('project_diagrams', { project_id: projectId })

  return (
    <Card>
      <CardHeader title={t('projects.diag.title')} icon={<FileType2 className="h-4 w-4" />} subtitle={`${diagrams.length} ${t('common.count')}`} />
      <CardBody>
        {loading ? (
          <LoadingState label={t('common.loading')} />
        ) : diagrams.length === 0 ? (
          <EmptyState title={t('projects.diag.empty')} icon={<FileType2 className="h-7 w-7" />} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {diagrams.map((d) => {
              const ext = (d.file_type || '').toUpperCase()
              return (
                <div
                  key={d.id}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-100 dark:border-slate-700/70 bg-white dark:bg-slate-800 p-4 transition hover:border-primary/30 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </span>
                    <Badge color={FILE_TYPE_COLOR[ext] ?? 'gray'}>{ext || '—'}</Badge>
                  </div>
                  <div className="min-w-0">
                    <h4 className="line-clamp-2 font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary">{d.name_ar}</h4>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">
                      {t('projects.diag.version')} {d.version}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/70 pt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400" />
                      {d.comments_count} {t('projects.diag.comments')}
                    </span>
                    <span>
                      {t('projects.diag.uploaded')} {formatDate(d.uploaded_at, lang)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
