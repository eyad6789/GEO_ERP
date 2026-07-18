// Avatar picker for the employee edit dialogs. Uploads the chosen image
// IMMEDIATELY (like the profile-header camera) — pick a file and it's applied at
// once, with an optimistic preview + spinner while it saves. Remove deletes the
// current photo on the spot too.
//
// The trigger is a native <label> wrapping the file input, so clicking it opens
// the OS file dialog directly (no programmatic input.click(), which some
// browsers/webviews block on a display:none input).
import { useEffect, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Avatar, Button, Spinner, useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useT } from '@/context/LangContext'
import { deleteEmployeePhoto, uploadEmployeePhoto } from './photo'

export function AvatarUploadField({
  employeeId,
  name,
  color,
  currentPhotoDocId,
  onChanged,
}: {
  employeeId: string
  name: string
  color?: string
  /** Doc id of the employee's current PHOTO document, if any. */
  currentPhotoDocId?: string
  /** Called after a successful upload/remove so the caller can refetch docs. */
  onChanged: () => void
}) {
  const t = useT()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null) // optimistic object URL

  const currentUrl = currentPhotoDocId ? `/api/employee-documents/${currentPhotoDocId}/file` : undefined

  // Drop the optimistic preview once the server reflects the change.
  useEffect(() => { setPreview(null) }, [currentPhotoDocId])
  // Revoke object URLs when the preview changes or on unmount.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const pick = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setBusy(true)
    try {
      await uploadEmployeePhoto(employeeId, file, t('hr.doc.PHOTO'), currentPhotoDocId)
      toast.success(t('hr.photo.saved'))
      onChanged()
    } catch (e) {
      setPreview(null)
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!currentPhotoDocId) return
    setBusy(true)
    try {
      await deleteEmployeePhoto(currentPhotoDocId)
      toast.success(t('hr.photo.deleted'))
      onChanged()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const shownUrl = preview ?? currentUrl
  const hasPhoto = !!shownUrl

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="relative h-20 w-20 shrink-0">
        {hasPhoto ? (
          <img
            src={shownUrl}
            alt={name}
            className="h-20 w-20 rounded-2xl object-cover shadow ring-1 ring-slate-200"
          />
        ) : (
          <Avatar name={name} color={color} size="xl" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60">
            <Spinner />
          </span>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-bold text-slate-700">{t('hr.doc.PHOTO')}</p>
        <div className="flex items-center gap-2">
          {/* Native label trigger — same look as <Button variant="outline" size="sm">. */}
          <label
            className={cn(
              'btn cursor-pointer',
              'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400',
              'h-8 px-3 text-xs',
              busy && 'pointer-events-none opacity-50',
            )}
          >
            <Camera className="h-4 w-4" />
            {t('hr.photo.upload')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void pick(f)
                e.target.value = ''
              }}
            />
          </label>
          {hasPhoto && currentPhotoDocId && (
            <Button type="button" variant="ghost" size="sm" onClick={() => void remove()} disabled={busy}>
              <X className="h-4 w-4" />
              {t('hr.photo.delete')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
