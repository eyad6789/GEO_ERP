// Full notes page (/notes): every module note in one place — search, add
// (choose which module), and delete. Reached via "See more" from any module's
// NotesButton, or the sidebar. Backed by /api/notes (record_type='module-note').
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StickyNote, Plus, Trash2, Search } from 'lucide-react'
import { PageHeader } from '../../components/shared'
import { Card, CardBody } from '../../components/ui/Card'
import { Button, Input, Textarea, Badge, SearchSelect, useToast } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiGet, apiPost, apiDelete } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { NOTE_RECORD_TYPE } from '../../components/notes/ModuleNotes'
import { noteVisibleTo } from '../../components/notes/visibility'
import type { Note } from '../../types'

// Modules that can hold notes. label keys resolved via i18n.
const MODULES = [
  { key: 'accounting', labelKey: 'nav.accounting' },
  { key: 'fleet', labelKey: 'nav.fleet' },
  { key: 'general', labelKey: 'notes.mod.general' },
]

export default function NotesPage() {
  const t = useT()
  const { lang } = useLang()
  const { currentUser } = useCompany()
  const toast = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [q, setQ] = useState('')
  const [content, setContent] = useState('')
  const [target, setTarget] = useState('accounting')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    apiGet<Note[]>('/notes', { record_type: NOTE_RECORD_TYPE })
      .then((rows) => setNotes(Array.isArray(rows) ? rows : []))
      .catch(() => setNotes([]))
  }, [])
  useEffect(reload, [reload])

  const moduleLabel = useCallback(
    (key: string) => {
      const m = MODULES.find((x) => x.key === key)
      return m ? t(m.labelKey) : key
    },
    [t],
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    // Only the current user's own private notes (plus all public/restricted).
    const visible = notes.filter((n) => noteVisibleTo(n, currentUser.name))
    if (!needle) return visible
    return visible.filter(
      (n) => n.content.toLowerCase().includes(needle) || moduleLabel(n.record_id).toLowerCase().includes(needle),
    )
  }, [notes, q, moduleLabel, currentUser.name])

  const add = async () => {
    if (!content.trim()) return
    setBusy(true)
    try {
      await apiPost('/notes', {
        module_id: target.toUpperCase(),
        record_type: NOTE_RECORD_TYPE,
        record_id: target,
        content: content.trim(),
        visibility: 'PRIVATE',
        author: currentUser.name,
        pinned: 0,
      })
      setContent('')
      toast.success(t('notes.added'))
      reload()
    } finally {
      setBusy(false)
    }
  }
  const del = async (id: string) => {
    if (!window.confirm(t('notes.confirm_delete'))) return
    try { await apiDelete(`/notes/${id}`); reload() } catch { /* ignore */ }
  }

  const moduleColor: Record<string, 'blue' | 'amber' | 'gray'> = { accounting: 'blue', fleet: 'amber', general: 'gray' }

  return (
    <div>
      <PageHeader
        title={t('notes.page.title')}
        subtitle={t('notes.page.subtitle')}
        icon={<StickyNote className="h-5 w-5" />}
        actions={<Badge color="amber">{notes.length}</Badge>}
      />

      {/* Add note */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-52">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('notes.mod.pick')}</label>
              <SearchSelect
                value={target}
                onChange={setTarget}
                options={MODULES.map((m) => ({ value: m.key, label: t(m.labelKey) }))}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('notes.module.title')}</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('notes.placeholder')}
                className="min-h-[44px]"
              />
            </div>
            <Button onClick={add} disabled={busy || !content.trim()}>
              <Plus className="h-4 w-4" />{t('common.add')}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-400 start-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('notes.search')} className="ps-9" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-400">{t('notes.empty')}</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <Card key={n.id}>
              <CardBody>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge color={moduleColor[n.record_id] ?? 'gray'}>{moduleLabel(n.record_id)}</Badge>
                  <button onClick={() => del(n.id)} title={t('common.delete')} className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{n.content}</p>
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-400">{n.author} · {formatDateTime(n.created_at, lang)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
