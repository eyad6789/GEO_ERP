import { useEffect, useState } from 'react'
import { StickyNote, Plus, Pin } from 'lucide-react'
import { Popover } from '../ui/Popover'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { Badge } from '../ui/Badge'
import { useT, useLang } from '../../context/LangContext'
import { apiGet, apiPost } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import type { Note, NoteVisibility } from '../../types'

/**
 * Private note widget attached to any record. Reads/writes /api/notes filtered
 * by (record_type, record_id). Drop it on any detail page or table row.
 */
export function NoteWidget({
  recordType,
  recordId,
  moduleId = 'general',
  compact,
}: {
  recordType: string
  recordId: string
  moduleId?: string
  compact?: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  const [notes, setNotes] = useState<Note[]>([])
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<NoteVisibility>('PRIVATE')
  const [loading, setLoading] = useState(false)

  const load = () => {
    apiGet<Note[]>('/notes', { record_type: recordType, record_id: recordId })
      .then((rows) => setNotes(Array.isArray(rows) ? rows : []))
      .catch(() => setNotes([]))
  }

  useEffect(load, [recordType, recordId])

  const add = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await apiPost('/notes', {
        module_id: moduleId,
        record_type: recordType,
        record_id: recordId,
        content: content.trim(),
        visibility,
        author: 'أحمد المدير',
        pinned: 0,
      })
      setContent('')
      load()
    } finally {
      setLoading(false)
    }
  }

  const visColor = { PUBLIC: 'green', RESTRICTED: 'amber', PRIVATE: 'gray' } as const

  return (
    <Popover
      width="w-96"
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          className={
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ' +
            (open ? 'border-accent bg-accent/10 text-accent-dark' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800')
          }
          title={t('notes.title')}
        >
          <StickyNote className="h-4 w-4" />
          {!compact && t('notes.title')}
          {notes.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">
              {notes.length}
            </span>
          )}
        </button>
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <StickyNote className="h-4 w-4 text-accent" />
          {t('notes.title')}
        </div>

        <div className="max-h-52 space-y-2 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-400">{t('notes.empty')}</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-slate-100 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/60 dark:bg-slate-800/60 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{n.author}</span>
                  <div className="flex items-center gap-1">
                    {n.pinned ? <Pin className="h-3 w-3 text-accent" /> : null}
                    <Badge color={visColor[n.visibility]}>{t(`notes.${n.visibility.toLowerCase()}`)}</Badge>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.content}</p>
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-400">{formatDateTime(n.created_at, lang)}</p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 dark:border-slate-700/70 pt-2.5">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('notes.placeholder')}
            className="min-h-[60px] text-sm"
          />
          <div className="flex items-center gap-2">
            <Select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as NoteVisibility)}
              className="h-9 flex-1 text-xs"
              options={[
                { value: 'PRIVATE', label: t('notes.private') },
                { value: 'RESTRICTED', label: t('notes.restricted') },
                { value: 'PUBLIC', label: t('notes.public') },
              ]}
            />
            <Button size="sm" onClick={add} disabled={loading || !content.trim()}>
              <Plus className="h-4 w-4" />
              {t('common.add')}
            </Button>
          </div>
          <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-300">{t('notes.warning')}</p>
        </div>
      </div>
    </Popover>
  )
}
