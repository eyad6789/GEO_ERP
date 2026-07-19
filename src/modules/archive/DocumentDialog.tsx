import {
  Paperclip,
  Tag,
  ArrowLeftRight,
  Hash,
  CalendarDays,
  Building2,
  User2,
  Banknote,
} from 'lucide-react'
import { Dialog, Badge } from '../../components/ui'
import { NoteWidget } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { formatCurrency, formatDate } from '../../lib/format'
import type { ArchiveDocument } from '../../types'
import { docTypeIcon, docStatusColor, parseTags } from './helpers'

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-400">{icon}</span>
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 text-end">{value || '—'}</span>
    </div>
  )
}

export function DocumentDialog({
  doc,
  open,
  onClose,
}: {
  doc: ArchiveDocument | null
  open: boolean
  onClose: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  if (!doc) return null

  const tags = parseTags(doc.tags)
  const showParties = Boolean(doc.from_party || doc.to_party || doc.cc)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {docTypeIcon(doc.doc_type, 'h-5 w-5')}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{doc.title || t('archive.dialog.no_subject')}</span>
            <span className="block text-xs font-normal text-slate-400 dark:text-slate-400">{t(`archive.type.${doc.doc_type}`)}</span>
          </span>
        </span>
      }
      description={doc.ref_number}
    >
      <div className="space-y-5">
        {/* Status + tags row */}
        <div className="flex flex-wrap items-center gap-2">
          {doc.doc_status && (
            <Badge color={docStatusColor(doc.doc_status)} dot>
              {doc.doc_status}
            </Badge>
          )}
          {doc.category && <Badge color="primary">{doc.category}</Badge>}
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Subject + body */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/60 dark:bg-slate-800/60 p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
            {t('archive.col.subject')}
          </p>
          <p className="font-medium text-slate-800 dark:text-slate-100">{doc.subject || t('archive.dialog.no_subject')}</p>
          <div className="mt-3 border-t border-slate-200/70 dark:border-slate-700 pt-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {doc.body || t('archive.dialog.no_body')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Parties */}
          {showParties && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-700/70 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                {t('archive.dialog.parties')}
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <MetaRow icon={<User2 className="h-4 w-4" />} label={t('archive.col.from')} value={doc.from_party} />
                <MetaRow icon={<User2 className="h-4 w-4" />} label={t('archive.col.to')} value={doc.to_party} />
                {doc.cc && (
                  <MetaRow icon={<User2 className="h-4 w-4" />} label={t('archive.col.cc')} value={doc.cc} />
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-xl border border-slate-100 dark:border-slate-700/70 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Hash className="h-4 w-4 text-primary" />
              {t('archive.dialog.meta')}
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              <MetaRow icon={<CalendarDays className="h-4 w-4" />} label={t('archive.col.date')} value={formatDate(doc.date, lang)} />
              {doc.author && (
                <MetaRow icon={<User2 className="h-4 w-4" />} label={t('archive.col.author')} value={doc.author} />
              )}
              {doc.company_id && (
                <MetaRow icon={<Building2 className="h-4 w-4" />} label={t('archive.col.company')} value={doc.company_id} />
              )}
              {doc.amount != null && (
                <MetaRow
                  icon={<Banknote className="h-4 w-4" />}
                  label={t('archive.col.amount')}
                  value={formatCurrency(doc.amount, doc.currency ?? 'IQD', lang)}
                />
              )}
              <MetaRow
                icon={<Paperclip className="h-4 w-4" />}
                label={t('archive.dialog.attachments_count')}
                value={doc.attachments_count}
              />
            </div>
          </div>
        </div>

        {/* Notes widget */}
        <div className="border-t border-slate-100 dark:border-slate-700/70 pt-4">
          <NoteWidget recordType="archive_documents" recordId={doc.id} moduleId="archive" />
        </div>
      </div>
    </Dialog>
  )
}
