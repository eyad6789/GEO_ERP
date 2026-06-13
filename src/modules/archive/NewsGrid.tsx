import { Megaphone, CalendarDays, User2, Paperclip } from 'lucide-react'
import { Badge } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { LoadingState } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { formatDate } from '../../lib/format'
import type { ArchiveDocument } from '../../types'
import { excerpt } from './helpers'

export function NewsGrid({
  data,
  loading,
  onSelect,
}: {
  data: ArchiveDocument[]
  loading?: boolean
  onSelect: (doc: ArchiveDocument) => void
}) {
  const t = useT()
  const { lang } = useLang()

  if (loading) {
    return (
      <div className="card">
        <LoadingState label={t('common.loading')} />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="card">
        <EmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title={t('archive.news.empty')}
          hint={t('archive.news.empty_hint')}
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc)}
          className="card group flex flex-col p-0 text-start transition hover:shadow-card-hover"
        >
          {/* Accent banner */}
          <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-t-xl bg-gradient-to-br from-primary to-primary-dark">
            <Megaphone className="h-9 w-9 text-white/85 transition group-hover:scale-110" />
            {doc.category && (
              <span className="absolute end-3 top-3">
                <Badge color="amber">{doc.category}</Badge>
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col p-4">
            <h3 className="font-bold leading-snug text-slate-800 line-clamp-2 group-hover:text-primary">
              {doc.title}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-3">
              {excerpt(doc.body, 140) || t('archive.dialog.no_body')}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <User2 className="h-3.5 w-3.5" />
                {doc.author || '—'}
              </span>
              <span className="flex items-center gap-3">
                {doc.attachments_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    {doc.attachments_count}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(doc.date, lang)}
                </span>
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
