// ============================================================================
// Module-level notes. Drop <NotesButton moduleKey="accounting" /> into a page
// header: it shows a count badge and a popover to add / read / delete notes
// scoped to that module, plus a "See more" link to the full /notes page.
// Backed by the generic /api/notes table:
//   record_type = 'module-note' · record_id = <moduleKey> · module_id = <MODULE>
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StickyNote, Plus, Trash2, ArrowRight } from 'lucide-react'
import { Popover } from '../ui/Popover'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Input'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiGet, apiPost, apiDelete } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { noteVisibleTo } from './visibility'
import type { Note } from '../../types'

export const NOTE_RECORD_TYPE = 'module-note'

export function useModuleNotes(moduleKey: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const reload = useCallback(() => {
    apiGet<Note[]>('/notes', { record_type: NOTE_RECORD_TYPE, record_id: moduleKey })
      .then((rows) => setNotes(Array.isArray(rows) ? rows : []))
      .catch(() => setNotes([]))
  }, [moduleKey])
  useEffect(reload, [reload])
  return { notes, reload }
}

export function NotesButton({ moduleKey, moduleLabel }: { moduleKey: string; moduleLabel?: string }) {
  const t = useT()
  const { lang } = useLang()
  const { currentUser } = useCompany()
  const navigate = useNavigate()
  const { notes: allNotes, reload } = useModuleNotes(moduleKey)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  // Hide other people's PRIVATE notes from the current user.
  const notes = allNotes.filter((n) => noteVisibleTo(n, currentUser.name))

  const add = async () => {
    if (!content.trim()) return
    setBusy(true)
    try {
      await apiPost('/notes', {
        module_id: moduleKey.toUpperCase(),
        record_type: NOTE_RECORD_TYPE,
        record_id: moduleKey,
        content: content.trim(),
        visibility: 'PRIVATE',
        author: currentUser.name,
        pinned: 0,
      })
      setContent('')
      reload()
    } finally {
      setBusy(false)
    }
  }
  const del = async (id: string) => {
    try { await apiDelete(`/notes/${id}`); reload() } catch { /* ignore */ }
  }

  return (
    <Popover
      width="w-96"
      align="end"
      trigger={({ toggle, open }) => (
        <button
          onClick={toggle}
          title={t('notes.module.title')}
          className={
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ' +
            (open ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')
          }
        >
          <StickyNote className="h-4 w-4 text-amber-500" />
          {t('notes.module.title')}
          {notes.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-white">
              {notes.length}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <StickyNote className="h-4 w-4 text-amber-500" />
              {moduleLabel || t('notes.module.title')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-400">{notes.length}</span>
          </div>

          <div className="-mx-1 max-h-56 space-y-2 overflow-y-auto px-1">
            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-400">{t('notes.empty')}</p>
            ) : (
              notes.slice(0, 6).map((n) => (
                <div key={n.id} className="group rounded-lg border border-amber-100 bg-amber-50/60 dark:bg-amber-500/15 p-2.5">
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.content}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">{n.author} · {formatDateTime(n.created_at, lang)}</span>
                    <button onClick={() => del(n.id)} title={t('common.delete')} className="rounded p-0.5 text-slate-300 opacity-0 transition hover:text-danger group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-700/70 pt-2.5">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('notes.placeholder')}
              className="min-h-[56px] text-sm"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => { close(); navigate('/notes') }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t('notes.see_more')}<ArrowRight className="h-3.5 w-3.5" />
              </button>
              <Button size="sm" onClick={add} disabled={busy || !content.trim()}>
                <Plus className="h-4 w-4" />{t('common.add')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Popover>
  )
}
