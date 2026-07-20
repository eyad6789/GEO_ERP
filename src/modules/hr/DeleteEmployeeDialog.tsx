// Two-choice employee removal: نقل إلى الأرشيف (reversible soft-delete) OR
// حذف نهائي (permanent cascade — gated behind a confirm checkbox). For an
// already-archived employee the archive choice is hidden.
import { useState } from 'react'
import { AlertTriangle, Archive, Trash2 } from 'lucide-react'
import { Button, Dialog, useToast } from '@/components/ui'
import { useLang, useT } from '@/context/LangContext'
import { apiDelete, apiPost } from '@/lib/api'
import { pickName } from '@/lib/format'
import type { Employee } from '@/types'

export function DeleteEmployeeDialog({
  employee,
  open,
  onClose,
  onDone,
}: {
  employee: Employee
  open: boolean
  onClose: () => void
  /** Called after a successful archive/delete so the caller can refetch/navigate. */
  onDone: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const [confirmPermanent, setConfirmPermanent] = useState(false)
  const [busy, setBusy] = useState<null | 'archive' | 'delete'>(null)

  const isArchived = !!employee.archived
  const name = pickName(employee, lang)

  const archive = async () => {
    setBusy('archive')
    try {
      await apiPost(`/employees/${employee.id}/archive`, {})
      toast.success(t('hr.delete.archived'))
      onDone()
      onClose()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setBusy(null)
    }
  }

  const permanentDelete = async () => {
    setBusy('delete')
    try {
      await apiDelete(`/employees/${employee.id}`)
      toast.success(t('hr.delete.deleted'))
      onDone()
      onClose()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={t('hr.delete.title')}
      description={name}
      footer={
        <Button variant="ghost" onClick={onClose} disabled={!!busy}>
          {t('common.cancel')}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Move to archive — the safe, reversible choice */}
        {!isArchived && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Archive className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('hr.delete.archive_option')}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('hr.delete.archive_hint')}</p>
              </div>
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={archive} disabled={!!busy}>
              <Archive className="h-4 w-4" />
              {t('hr.delete.archive_option')}
            </Button>
          </div>
        )}

        {/* Permanent delete — destructive; needs an explicit acknowledgement */}
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-danger">{t('hr.delete.permanent_option')}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('hr.delete.permanent_hint')}</p>
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-red-600"
              checked={confirmPermanent}
              onChange={(e) => setConfirmPermanent(e.target.checked)}
            />
            <span>{t('hr.delete.permanent_confirm')}</span>
          </label>
          <Button
            variant="danger"
            className="mt-3 w-full"
            onClick={permanentDelete}
            disabled={!confirmPermanent || !!busy}
          >
            <Trash2 className="h-4 w-4" />
            {t('hr.delete.permanent_option')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
