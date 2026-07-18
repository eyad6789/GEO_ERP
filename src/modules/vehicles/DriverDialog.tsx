// ============================================================================
// DriverDialog — a driver-centric view for the Fleet Archive: which cars this
// driver drives, and the driver's OWN documents (doc_type = DRIVER_LICENSE),
// kept separate from the car's registration papers (VEHICLE_LICENSE). Documents
// render as inline thumbnails and open in an in-page viewer (no downloading).
// ============================================================================
import { useMemo, useRef, useState } from 'react'
import { IdCard, Car, Upload, Trash2, FileText, X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, User, Phone, CreditCard, CalendarClock } from 'lucide-react'
import { Dialog, Button, Badge, useToast } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { useApi } from '../../hooks/useResource'
import { apiPost, apiDelete } from '../../lib/api'
import { formatDate, pickName } from '../../lib/format'
import { registerStrings } from '../../i18n/strings'
import type { Vehicle } from '../../types'

interface VDoc {
  id: string; vehicle_id: string; doc_type: string; title: string
  file_name: string; mime: string; size: number; expiry: string | null; created_at: string
}

registerStrings({
  'fleet.driver.title': { ar: 'مستندات السائق', en: 'Driver' },
  'fleet.driver.cars': { ar: 'الآليات التي يقودها', en: 'Cars driven' },
  'fleet.driver.docs': { ar: 'وثائق السائق (إجازة السوق والهوية)', en: 'Driver documents (license & ID)' },
  'fleet.driver.no_docs': { ar: 'لا توجد وثائق خاصة بالسائق بعد', en: 'No driver documents yet' },
  'fleet.driver.upload': { ar: 'رفع وثيقة سائق', en: 'Upload driver document' },
  'fleet.driver.uploading': { ar: 'جارٍ الرفع…', en: 'Uploading…' },
  'fleet.driver.uploaded': { ar: 'تم رفع وثيقة السائق', en: 'Driver document uploaded' },
  'fleet.driver.cars_count': { ar: 'آلية', en: 'cars' },
  'fleet.driver.doc_hint': { ar: 'هذه وثائق السائق فقط — أوراق الآلية في «أوراق الآليات».', en: 'These are the driver’s own documents — car papers are under “Registration Papers”.' },
  'fleet.driver.details': { ar: 'بيانات السائق', en: 'Driver details' },
  'fleet.driver.name': { ar: 'اسم السائق', en: 'Driver name' },
  'fleet.driver.phone': { ar: 'رقم الهاتف', en: 'Phone number' },
  'fleet.driver.id_no': { ar: 'رقم الهوية', en: 'National ID' },
  'fleet.driver.license': { ar: 'رقم إجازة السوق', en: 'Driver license no.' },
  'fleet.driver.license_exp': { ar: 'تاريخ الإصدار/الانتهاء', en: 'License issue / expiry' },
  'fleet.driver.address': { ar: 'العنوان', en: 'Address' },
  'fleet.driver.edit_hint': { ar: 'لتعديل بيانات السائق افتح الآلية من تبويب الآليات.', en: 'To edit driver details, open the vehicle from the Vehicles tab.' },
})

const fileUrl = (d: VDoc) => `/api/vehicle-documents/${d.id}/file`
const isImg = (m: string) => (m || '').startsWith('image/')
const isPdf = (m: string) => (m || '').includes('pdf')

export function DriverDialog({
  driverName,
  cars,
  canEdit,
  onClose,
  onChanged,
}: {
  driverName: string
  cars: Vehicle[]
  canEdit: boolean
  onClose: () => void
  onChanged?: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { data: allDocs, refetch } = useApi<VDoc[]>('/vehicle-documents')
  const carIds = useMemo(() => new Set(cars.map((c) => c.id)), [cars])
  // Driver's OWN documents = DRIVER_LICENSE docs across any car this driver drives.
  const docs = useMemo(
    () => (allDocs ?? []).filter((d) => carIds.has(d.vehicle_id) && d.doc_type === 'DRIVER_LICENSE'),
    [allDocs, carIds],
  )
  const [viewerIdx, setViewerIdx] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const primaryCar = cars[0]
  const viewer = viewerIdx != null ? docs[viewerIdx] : null

  // A driver may be on several cars; take the first non-empty value for each field.
  const profile = useMemo(() => {
    const pick = (f: keyof Vehicle) => {
      for (const c of cars) {
        const v = c[f]
        if (v != null && String(v).trim() !== '') return String(v)
      }
      return ''
    }
    return {
      phone: pick('driver_phone'),
      id_no: pick('driver_id_no'),
      license_no: pick('driver_license_no'),
      license_expiry: pick('driver_license_expiry'),
      address: pick('driver_address'),
    }
  }, [cars])

  const upload = async (file: File) => {
    if (!primaryCar) return
    setUploading(true)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(r.error)
        r.readAsDataURL(file)
      })
      await apiPost('/vehicle-documents', {
        vehicle_id: primaryCar.id,
        doc_type: 'DRIVER_LICENSE',
        title: `${driverName} — ${file.name}`,
        file_name: file.name,
        mime: file.type,
        data,
      })
      toast.success(t('fleet.driver.uploaded'))
      refetch()
      onChanged?.()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const del = async (id: string) => {
    if (!window.confirm(t('fleet.mod.confirm_doc_delete'))) return
    try { await apiDelete(`/vehicle-documents/${id}`); refetch(); onChanged?.() } catch { /* ignore */ }
  }

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10 text-info">
              <IdCard className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{driverName}</span>
            <Badge color="blue">{cars.length} {t('fleet.driver.cars_count')}</Badge>
          </span>
        }
        footer={<Button variant="outline" onClick={onClose}>{t('common.close')}</Button>}
      >
        <div className="max-h-[64vh] space-y-5 overflow-y-auto pe-1">
          {/* Driver details — name, phone, national ID, license no. & expiry */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <User className="h-4 w-4 text-primary" />{t('fleet.driver.details')}
            </h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {[
                { icon: <User className="h-3.5 w-3.5" />, label: t('fleet.driver.name'), value: driverName },
                { icon: <Phone className="h-3.5 w-3.5" />, label: t('fleet.driver.phone'), value: profile.phone, ltr: true },
                { icon: <CreditCard className="h-3.5 w-3.5" />, label: t('fleet.driver.id_no'), value: profile.id_no, ltr: true },
                { icon: <IdCard className="h-3.5 w-3.5" />, label: t('fleet.driver.license'), value: profile.license_no, ltr: true },
                { icon: <CalendarClock className="h-3.5 w-3.5" />, label: t('fleet.driver.license_exp'), value: profile.license_expiry ? formatDate(profile.license_expiry, lang) : '' },
                { icon: <Car className="h-3.5 w-3.5" />, label: t('fleet.driver.address'), value: profile.address },
              ].map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 border-b border-slate-50 dark:border-slate-700/70 py-1.5 last:border-0">
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-400">{f.icon}{f.label}</span>
                  <span className={'text-sm font-medium text-slate-700 dark:text-slate-200 ' + (f.value ? '' : 'text-slate-300')} dir={f.ltr ? 'ltr' : undefined}>
                    {f.value || '—'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-400">{t('fleet.driver.edit_hint')}</p>
          </section>

          {/* Cars driven */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Car className="h-4 w-4 text-primary" />{t('fleet.driver.cars')}
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cars.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-slate-700/70 bg-slate-50/60 px-3 py-2">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" dir="ltr">{c.plate_number}</span>
                  <span className="truncate text-xs text-slate-400 dark:text-slate-400">{pickName(c, lang)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Driver's own documents */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <IdCard className="h-4 w-4 text-primary" />{t('fleet.driver.docs')}
              </h4>
              {canEdit && primaryCar && (
                <>
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4" />{uploading ? t('fleet.driver.uploading') : t('fleet.driver.upload')}
                  </Button>
                </>
              )}
            </div>
            <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-400">{t('fleet.driver.doc_hint')}</p>
            {docs.length === 0 ? (
              <p className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-6 text-center text-sm text-slate-400 dark:text-slate-400">{t('fleet.driver.no_docs')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {docs.map((d, i) => (
                  <div key={d.id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition hover:shadow-md">
                    <button type="button" onClick={() => setViewerIdx(i)} title={d.title} className="block h-32 w-full bg-slate-50 dark:bg-slate-800/60">
                      {isImg(d.mime) ? (
                        <img src={fileUrl(d)} alt={d.title} loading="lazy" className="h-32 w-full object-cover" />
                      ) : isPdf(d.mime) ? (
                        <span className="pointer-events-none block h-32 w-full overflow-hidden bg-white dark:bg-slate-800">
                          <object data={`${fileUrl(d)}#toolbar=0&navpanes=0&view=FitH`} type="application/pdf" className="h-40 w-full">
                            <span className="flex h-32 w-full flex-col items-center justify-center gap-1 text-rose-500"><FileText className="h-7 w-7" /><span className="text-[10px] font-semibold">PDF</span></span>
                          </object>
                        </span>
                      ) : (
                        <span className="flex h-32 w-full flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-400"><FileText className="h-7 w-7" /><span className="text-[10px] font-semibold uppercase">{d.file_name.split('.').pop()}</span></span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100"><ZoomIn className="h-6 w-6 text-white drop-shadow" /></span>
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => del(d.id)} title={t('fleet.mod.delete')} className="absolute end-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-slate-400 dark:text-slate-400 opacity-0 shadow transition hover:text-danger group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="truncate px-2 py-1.5 text-[11px] text-slate-500 dark:text-slate-400" title={d.title}>{d.title}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </Dialog>

      {/* In-page viewer */}
      {viewer && (
        <div className="fixed inset-0 z-[130] flex flex-col bg-black/85 backdrop-blur-sm" onClick={() => setViewerIdx(null)}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="truncate text-sm font-medium" title={viewer.title}>{viewer.title}</span>
            <div className="flex shrink-0 items-center gap-1">
              <a href={fileUrl(viewer)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"><ExternalLink className="h-5 w-5" /></a>
              <button type="button" onClick={() => setViewerIdx(null)} className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4" onClick={(e) => e.stopPropagation()}>
            {docs.length > 1 && (
              <button type="button" onClick={() => setViewerIdx((i) => (i! + 1) % docs.length)} className="absolute start-2 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"><ChevronLeft className="h-6 w-6" /></button>
            )}
            {isImg(viewer.mime) ? (
              <img src={fileUrl(viewer)} alt={viewer.title} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
            ) : (
              <iframe src={fileUrl(viewer)} title={viewer.title} className="h-full w-full max-w-4xl rounded-lg bg-white dark:bg-slate-800 shadow-2xl" />
            )}
            {docs.length > 1 && (
              <button type="button" onClick={() => setViewerIdx((i) => (i! - 1 + docs.length) % docs.length)} className="absolute end-2 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"><ChevronRight className="h-6 w-6" /></button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
