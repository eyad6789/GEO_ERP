import { useMemo, useState, type ReactNode } from 'react'
import { GraduationCap, Plus, Pencil, Trash2, Star, Award, CheckCircle2, Clock } from 'lucide-react'
import { ArabicTable, type Column } from '@/components/shared'
import { Badge, Button, Dialog, Input, SearchSelect, Textarea, useToast } from '@/components/ui'
import { useT, useLang } from '@/context/LangContext'
import { useResource } from '@/hooks/useResource'
import { apiPost, apiPut } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'
import type { Training } from '@/types'

const CATEGORIES = ['TECHNICAL', 'SAFETY', 'SOFT_SKILLS', 'COMPLIANCE', 'LEADERSHIP', 'OTHER']
const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED']
const STATUS_COLOR: Record<string, 'gray' | 'amber' | 'green'> = { PLANNED: 'gray', IN_PROGRESS: 'amber', COMPLETED: 'green' }

/** Read-only or interactive 1–5 star rating (activity/performance). */
function Stars({ value, onChange, size = 'sm' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === value ? 0 : n)}
          className={onChange ? 'transition hover:scale-110' : 'cursor-default'}
          aria-label={`${n}`}
        >
          <Star className={`${px} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
        </button>
      ))}
    </span>
  )
}

export function EmployeeTraining({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { data: rows, loading, refetch, remove } = useResource<Training>('trainings', { employee_id: employeeId })
  const [dialog, setDialog] = useState<{ open: boolean; item: Training | null }>({ open: false, item: null })

  const summary = useMemo(() => {
    const completed = rows.filter((r) => r.status === 'COMPLETED')
    const rated = rows.filter((r) => (r.rating ?? 0) > 0)
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : 0
    const hours = rows.reduce((s, r) => s + (r.hours ?? 0), 0)
    return { total: rows.length, completed: completed.length, avg, hours }
  }, [rows])

  const del = async (r: Training) => {
    if (!window.confirm(t('hr.training.confirm_delete'))) return
    try { await remove(r.id); toast.success(t('common.deleted')) } catch { toast.error(t('common.error')) }
  }

  const catLabel = (c: string) => {
    const k = `hr.training.cat.${c}`
    return t(k) === k ? c : t(k)
  }
  const statusLabel = (s: string) => {
    const k = `hr.training.st.${s}`
    return t(k) === k ? s : t(k)
  }

  const columns: Column<Training>[] = [
    { key: 'title', header: t('hr.training.title'), accessor: (r) => r.title, sortable: true, render: (r) => <span className="font-medium text-slate-700 dark:text-slate-200">{r.title}</span> },
    { key: 'category', header: t('hr.training.category'), render: (r) => <Badge color="blue">{catLabel(r.category)}</Badge> },
    { key: 'provider', header: t('hr.training.provider'), accessor: (r) => r.provider || '—' },
    { key: 'date', header: t('common.date'), accessor: (r) => r.date, sortable: true, render: (r) => <span className="tabular-nums text-slate-600 dark:text-slate-300">{r.date ? formatDate(r.date, lang) : '—'}</span> },
    { key: 'hours', header: t('hr.training.hours'), align: 'end', accessor: (r) => r.hours, render: (r) => (r.hours ? <span className="tabular-nums">{formatNumber(r.hours, lang)}</span> : '—') },
    { key: 'status', header: t('common.status'), render: (r) => <Badge color={STATUS_COLOR[r.status] ?? 'gray'}>{statusLabel(r.status)}</Badge> },
    { key: 'rating', header: t('hr.training.rating'), accessor: (r) => r.rating, sortable: true, render: (r) => <Stars value={r.rating ?? 0} /> },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'center',
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <button type="button" title={t('common.edit')} onClick={(e) => { e.stopPropagation(); setDialog({ open: true, item: r }) }} className="rounded-lg p-1.5 text-slate-400 dark:text-slate-400 transition hover:bg-primary/10 hover:text-primary">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" title={t('common.delete')} onClick={(e) => { e.stopPropagation(); void del(r) }} className="rounded-lg p-1.5 text-slate-400 dark:text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={<GraduationCap className="h-5 w-5" />} value={formatNumber(summary.total, lang)} label={t('hr.training.total')} />
        <Tile icon={<CheckCircle2 className="h-5 w-5" />} value={formatNumber(summary.completed, lang)} label={t('hr.training.completed')} />
        <Tile icon={<Clock className="h-5 w-5" />} value={formatNumber(summary.hours, lang)} label={t('hr.training.total_hours')} />
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5">
          <div className="flex items-center gap-2 text-amber-500">
            <Award className="h-5 w-5" />
            <span className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{summary.avg ? summary.avg.toFixed(1) : '—'}</span>
          </div>
          <div className="mt-1"><Stars value={Math.round(summary.avg)} /></div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('hr.training.avg_rating')}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialog({ open: true, item: null })}>
          <Plus className="h-4 w-4" />
          {t('hr.training.add')}
        </Button>
      </div>

      <ArabicTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.id}
        searchPlaceholder={t('common.search')}
        exportName="employee_trainings"
        emptyTitle={t('hr.training.empty')}
      />

      <TrainingDialog
        open={dialog.open}
        item={dialog.item}
        employeeId={employeeId}
        onClose={() => setDialog({ open: false, item: null })}
        onSaved={() => { setDialog({ open: false, item: null }); refetch() }}
        catLabel={catLabel}
        statusLabel={statusLabel}
      />
    </div>
  )
}

function Tile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

function TrainingDialog({
  open,
  item,
  employeeId,
  onClose,
  onSaved,
  catLabel,
  statusLabel,
}: {
  open: boolean
  item: Training | null
  employeeId: string
  onClose: () => void
  onSaved: () => void
  catLabel: (c: string) => string
  statusLabel: (s: string) => string
}) {
  const t = useT()
  const toast = useToast()
  const [form, setForm] = useState<Partial<Training>>({})
  const [busy, setBusy] = useState(false)

  // Seed the form when the dialog opens.
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const key = open ? item?.id ?? 'new' : null
  if (open && seededFor !== key) {
    setSeededFor(key)
    setForm(
      item ?? { title: '', category: 'TECHNICAL', provider: '', date: new Date().toISOString().slice(0, 10), hours: 0, status: 'PLANNED', rating: 0, notes: '' },
    )
  }

  const set = <K extends keyof Training>(k: K, v: Training[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title?.trim()) { toast.error(t('hr.training.title_required')); return }
    setBusy(true)
    try {
      const payload = { ...form, employee_id: employeeId }
      if (item) await apiPut(`/trainings/${item.id}`, payload)
      else await apiPost('/trainings', payload)
      toast.success(t('common.saved'))
      onSaved()
    } catch {
      toast.error(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title={<span className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />{item ? t('hr.training.edit') : t('hr.training.add')}</span>}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={save} disabled={busy}>{t('common.save')}</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('hr.training.title')} className="sm:col-span-2">
          <Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder={t('hr.training.title_ph')} />
        </Field>
        <Field label={t('hr.training.category')}>
          <SearchSelect value={form.category ?? 'TECHNICAL'} onChange={(v) => set('category', v)} options={CATEGORIES.map((c) => ({ value: c, label: catLabel(c) }))} />
        </Field>
        <Field label={t('hr.training.status')}>
          <SearchSelect value={form.status ?? 'PLANNED'} onChange={(v) => set('status', v)} options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
        </Field>
        <Field label={t('hr.training.provider')}>
          <Input value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value)} />
        </Field>
        <Field label={t('common.date')}>
          <Input type="date" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label={t('hr.training.hours')}>
          <Input type="number" min={0} value={form.hours ?? 0} onChange={(e) => set('hours', Number(e.target.value))} />
        </Field>
        <Field label={t('hr.training.rating')}>
          <div className="flex h-10 items-center">
            <Stars value={form.rating ?? 0} onChange={(v) => set('rating', v)} size="lg" />
          </div>
        </Field>
        <Field label={t('hr.training.notes')} className="sm:col-span-2">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className="min-h-[60px]" />
        </Field>
      </div>
    </Dialog>
  )
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}
