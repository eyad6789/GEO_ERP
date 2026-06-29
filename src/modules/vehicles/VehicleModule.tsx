// ============================================================================
// VehicleModule — full editable vehicle detail, opened from the Vehicles tab /
// map. Everyone can VIEW every field; only the Fleet Manager (or Super Admin)
// can EDIT, move the car on the map, or delete it (canEditFleet).
// Costs: acquisition (manual), spent-so-far (REAL, from the journal), sale price.
// ============================================================================
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Truck, Pencil, Trash2, Save, X, MapPin, User, Wallet, Car, FolderOpen, FileText, Upload, Download, StickyNote, Tag } from 'lucide-react'
import { Dialog, Button, Field, Input, Textarea, SearchSelect, Badge, useToast } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { useApi, useResource } from '../../hooks/useResource'
import { apiPut, apiDelete, apiPost } from '../../lib/api'
import { formatCurrency, formatNumber, formatDate, pickName } from '../../lib/format'
import { registerStrings } from '../../i18n/strings'
import { canEditFleet, VEHICLE_TYPES } from './fleetUtils'
import type { Vehicle, Company, Project, Currency, VehicleStatus } from '../../types'

declare global {
  interface Window { L: any }
}

registerStrings({
  'fleet.mod.edit': { ar: 'تعديل', en: 'Edit' },
  'fleet.mod.save': { ar: 'حفظ', en: 'Save' },
  'fleet.mod.saving': { ar: 'جارٍ الحفظ…', en: 'Saving…' },
  'fleet.mod.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'fleet.mod.delete': { ar: 'حذف الآلية', en: 'Delete vehicle' },
  'fleet.mod.saved': { ar: 'تم حفظ الآلية', en: 'Vehicle saved' },
  'fleet.mod.deleted': { ar: 'تم حذف الآلية', en: 'Vehicle deleted' },
  'fleet.mod.confirm_delete': { ar: 'هل تريد حذف هذه الآلية نهائياً؟', en: 'Delete this vehicle permanently?' },
  'fleet.mod.readonly': { ar: 'العرض فقط — التعديل لمدير الآليات', en: 'View only — editing is for the Fleet Manager' },
  'fleet.mod.sec_vehicle': { ar: 'بيانات الآلية', en: 'Vehicle' },
  'fleet.mod.sec_registration': { ar: 'إجازة وأوراق الآلية', en: 'Registration & Papers' },
  'fleet.mod.upload_hint': { ar: 'ارفع صور المستندات فقط — لا حاجة لملء حقول', en: 'Upload document scans only — no fields to fill' },
  'fleet.mod.sec_owner': { ar: 'الملكية والتشغيل', en: 'Ownership & Operation' },
  'fleet.mod.sec_driver': { ar: 'السائق', en: 'Driver' },
  'fleet.mod.sec_costs': { ar: 'بيع الآلية', en: 'Sell Vehicle' },
  'fleet.mod.sell_hint': { ar: 'الحفظ يسجّل الآلية كـ«مُباعة».', en: 'Saving marks this vehicle as Sold.' },
  'fleet.mod.sec_retire': { ar: 'إخراج من الخدمة', en: 'Out of Service' },
  'fleet.mod.retire_hint': { ar: 'الحفظ يسجّل الآلية كـ«خارج الخدمة». أضف السبب في الملاحظات.', en: 'Saving marks this vehicle as out of service. Add the reason in Notes.' },
  'fleet.mod.sec_location': { ar: 'الموقع', en: 'Location' },
  'fleet.mod.name_ar': { ar: 'الاسم (عربي)', en: 'Name (Arabic)' },
  'fleet.mod.name_en': { ar: 'الاسم (إنجليزي)', en: 'Name (English)' },
  'fleet.mod.status': { ar: 'الحالة', en: 'Status' },
  'fleet.mod.veh_license': { ar: 'إجازة/تسجيل الآلية', en: 'Vehicle License / Reg.' },
  'fleet.mod.veh_license_exp': { ar: 'انتهاء إجازة الآلية', en: 'Vehicle License Expiry' },
  'fleet.mod.op_company': { ar: 'الشركة المشغّلة', en: 'Operating Company' },
  'fleet.mod.ownership': { ar: 'نوع الملكية', en: 'Ownership' },
  'fleet.veh.PRIVATE': { ar: 'خاصة', en: 'Private' },
  'fleet.veh.PUBLIC': { ar: 'عامة', en: 'Public' },
  'fleet.mod.driver_phone': { ar: 'هاتف السائق', en: 'Driver Phone' },
  'fleet.mod.driver_id': { ar: 'رقم هوية السائق', en: 'Driver National ID' },
  'fleet.mod.driver_address': { ar: 'عنوان السائق', en: 'Driver Address' },
  'fleet.mod.driver_license': { ar: 'إجازة سوق السائق', en: 'Driver License No.' },
  'fleet.mod.driver_license_exp': { ar: 'انتهاء إجازة السوق', en: 'Driver License Expiry' },
  'fleet.mod.acq_cost': { ar: 'كلفة شراء الآلية', en: 'Acquisition Cost' },
  'fleet.mod.acq_date': { ar: 'تاريخ الشراء', en: 'Acquisition Date' },
  'fleet.mod.spent': { ar: 'ما صُرف عليها (من القيود)', en: 'Spent so far (from journal)' },
  'fleet.mod.sale_price': { ar: 'سعر البيع', en: 'Sale Price' },
  'fleet.mod.sale_date': { ar: 'تاريخ البيع', en: 'Sale Date' },
  'fleet.mod.map_hint': { ar: 'اضغط على الخريطة أو اسحب العلامة لتحديد موقع الآلية', en: 'Click the map or drag the marker to set the vehicle location' },
  'fleet.mod.no_location': { ar: 'لا يوجد موقع محدد', en: 'No location set' },
  'fleet.mod.sec_maint': { ar: 'الصيانة والمصاريف', en: 'Maintenance & Costs' },
  'fleet.mod.maint_total': { ar: 'إجمالي ما صُرف', en: 'Total spent' },
  'fleet.mod.maint_count': { ar: 'عدد القيود', en: 'Entries' },
  'fleet.mod.no_costs': { ar: 'لا توجد مصاريف مسجّلة', en: 'No costs recorded' },
  'fleet.cat.FUEL': { ar: 'وقود', en: 'Fuel' },
  'fleet.cat.MAINTENANCE': { ar: 'صيانة', en: 'Maintenance' },
  'fleet.cat.MATERIALS': { ar: 'خامات', en: 'Materials' },
  'fleet.cat.WATER': { ar: 'ماء', en: 'Water' },
  'fleet.cat.ELECTRICITY': { ar: 'كهرباء', en: 'Electricity' },
  'fleet.cat.UTILITIES': { ar: 'خدمات', en: 'Utilities' },
  'fleet.cat.RENT': { ar: 'إيجار', en: 'Rent' },
  'fleet.cat.OTHER': { ar: 'أخرى', en: 'Other' },
  'fleet.mod.sec_notes': { ar: 'ملاحظات', en: 'Notes' },
  'fleet.mod.notes_ph': { ar: 'أضف ملاحظات حول الآلية أو السائق…', en: 'Add notes about the vehicle or driver…' },
  'fleet.mod.sec_docs': { ar: 'الأرشيف والمستندات', en: 'Documents & Archive' },
  'fleet.mod.save_to_attach': { ar: 'احفظ الآلية أولاً لإرفاق المستندات', en: 'Save the vehicle first to attach documents' },
  'fleet.mod.no_docs': { ar: 'لا توجد مستندات', en: 'No documents yet' },
  'fleet.mod.upload': { ar: 'رفع مستند', en: 'Upload document' },
  'fleet.mod.uploading': { ar: 'جارٍ الرفع…', en: 'Uploading…' },
  'fleet.mod.uploaded': { ar: 'تم رفع المستند', en: 'Document uploaded' },
  'fleet.mod.doc_deleted': { ar: 'تم حذف المستند', en: 'Document deleted' },
  'fleet.mod.confirm_doc_delete': { ar: 'حذف هذا المستند؟', en: 'Delete this document?' },
  'fleet.doc.DRIVER_LICENSE': { ar: 'إجازة سوق', en: 'Driver License' },
  'fleet.doc.VEHICLE_LICENSE': { ar: 'إجازة الآلية', en: 'Vehicle License' },
  'fleet.doc.REGISTRATION': { ar: 'تسجيل/سنوية', en: 'Registration' },
  'fleet.doc.INSURANCE': { ar: 'تأمين', en: 'Insurance' },
  'fleet.doc.OTHER': { ar: 'أخرى', en: 'Other' },
})

interface VehicleDoc {
  id: string
  doc_type: string
  title: string
  file_name: string
  mime: string
  size: number
  expiry: string | null
  created_at: string
}
const DOC_TYPES = ['DRIVER_LICENSE', 'VEHICLE_LICENSE', 'REGISTRATION', 'INSURANCE', 'OTHER']

const STATUSES: VehicleStatus[] = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED', 'SOLD']
const CURRENCIES: Currency[] = ['IQD', 'USD']
type FType = 'text' | 'number' | 'date' | 'select'

export function VehicleModule({
  vehicle,
  onClose,
  onChanged,
  focus = 'full',
  editOnOpen = false,
}: {
  vehicle: Vehicle
  onClose: () => void
  onChanged: () => void
  // 'full' = edit the whole car · 'registration' = reg fields + files ·
  // 'driver' = upload files only · 'sell' = sale fields (marks SOLD) ·
  // 'retire' = mark out of service (RETIRED).
  focus?: 'full' | 'registration' | 'driver' | 'sell' | 'retire'
  // Open straight into edit mode (used right after a vehicle is added).
  editOnOpen?: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  const { role } = useCompany()
  const toast = useToast()
  const canEdit = canEditFleet(role.key)
  // Driver focus is upload-only — no field editing form.
  const editable = canEdit && focus !== 'driver'
  // Sell / retire are actions — open straight into edit mode.
  const startEditing = (editOnOpen || focus === 'sell' || focus === 'retire') && canEdit

  const [editing, setEditing] = useState(startEditing)
  const [form, setForm] = useState<Vehicle>(vehicle)
  const [saving, setSaving] = useState(false)

  const { data: companies } = useResource<Company>('companies')
  const { data: projects } = useResource<Project>('projects')
  // Spent-so-far + the full maintenance ledger come from REAL journal lines
  // tagged to this vehicle (imported from the الآليات maintenance sheets).
  const { data: spend } = useApi<{
    by_category: Array<{ iqd: number; usd: number }>
    costs: Array<{ date: string | null; category: string; amount: number; currency: string; note: string; serial_number: string }>
  }>(`/accounting/vehicle-spending/${vehicle.id}`)
  const spent = useMemo(() => {
    let iqd = 0, usd = 0
    for (const c of spend?.by_category ?? []) { iqd += c.iqd; usd += c.usd }
    return { iqd, usd }
  }, [spend])
  const costRows = spend?.costs ?? []

  // ── Documents (license & car-paper scans) ──
  const { data: docs, refetch: refetchDocs } = useApi<VehicleDoc[]>('/vehicle-documents', { vehicle_id: vehicle.id })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState(
    focus === 'registration' ? 'VEHICLE_LICENSE' : focus === 'sell' || focus === 'retire' ? 'OTHER' : 'DRIVER_LICENSE',
  )
  const [uploading, setUploading] = useState(false)
  const uploadDoc = async (file: File) => {
    setUploading(true)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(r.error)
        r.readAsDataURL(file)
      })
      await apiPost('/vehicle-documents', { vehicle_id: vehicle.id, doc_type: docType, title: file.name, file_name: file.name, mime: file.type, data })
      toast.success(t('fleet.mod.uploaded'))
      refetchDocs()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const deleteDoc = async (id: string) => {
    if (!window.confirm(t('fleet.mod.confirm_doc_delete'))) return
    try { await apiDelete(`/vehicle-documents/${id}`); toast.success(t('fleet.mod.doc_deleted')); refetchDocs() }
    catch (e) { toast.error((e as Error)?.message || t('common.error')) }
  }
  const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

  useEffect(() => { setForm(vehicle); setEditing(startEditing) }, [vehicle])

  const set = (patch: Partial<Vehicle>) => setForm((f) => ({ ...f, ...patch }))

  const companyOptions = useMemo(
    () => [{ value: '', label: '—' }, ...companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))],
    [companies, lang],
  )
  const projectOptions = useMemo(
    () => [{ value: '', label: t('fleet.card.no_project') }, ...projects.map((p) => ({ value: p.id, label: pickName(p, lang) }))],
    [projects, lang, t],
  )
  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))
  const typeOptions = VEHICLE_TYPES.map((k) => ({ value: k, label: t(`fleet.type.${k}`) }))
  const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }))
  const ownershipOptions = [{ value: 'PRIVATE', label: t('fleet.veh.PRIVATE') }, { value: 'PUBLIC', label: t('fleet.veh.PUBLIC') }]

  const save = async () => {
    setSaving(true)
    try {
      // Selling / retiring also flips the vehicle's status.
      const patch: Vehicle = focus === 'sell' ? { ...form, status: 'SOLD' }
        : focus === 'retire' ? { ...form, status: 'RETIRED' }
        : form
      if (!vehicle.id) {
        // New vehicle: create it (the الآليات asset account is built with this name).
        await apiPost('/vehicles', patch)
      } else {
        await apiPut(`/vehicles/${vehicle.id}`, patch)
      }
      toast.success(t('fleet.mod.saved'))
      onChanged()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(t('fleet.mod.confirm_delete'))) return
    setSaving(true)
    try {
      await apiDelete(`/vehicles/${vehicle.id}`)
      toast.success(t('fleet.mod.deleted'))
      onChanged()
      onClose()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // ── Editable Leaflet map (re-created when toggling edit so the marker is
  // draggable only for the Fleet Manager). Click or drag updates lat/lng. ──
  const mapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const L = window.L
    if (!L || !mapRef.current) return
    const lat = form.lat ?? 33.3152
    const lng = form.lng ?? 44.3661
    const map = L.map(mapRef.current).setView([lat, lng], form.lat != null ? 12 : 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    const marker = L.marker([lat, lng], { draggable: editing && canEdit }).addTo(map)
    if (editing && canEdit) {
      marker.on('dragend', () => { const p = marker.getLatLng(); set({ lat: p.lat, lng: p.lng }) })
      map.on('click', (e: any) => { marker.setLatLng(e.latlng); set({ lat: e.latlng.lat, lng: e.latlng.lng }) })
    }
    const id = window.setTimeout(() => map.invalidateSize(), 120)
    return () => { window.clearTimeout(id); map.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, vehicle.id])

  // ── Inline render helpers (plain functions — NOT components — so the inputs
  // keep focus while typing in edit mode). ──
  const row = (label: string, name: keyof Vehicle, type: FType = 'text', options?: { value: string; label: string }[]): ReactNode => {
    const raw = form[name] as unknown
    if (!editing) {
      let display: string
      if (type === 'date') display = raw ? formatDate(String(raw), lang) : '—'
      else if (type === 'select' && options) display = options.find((o) => o.value === String(raw ?? ''))?.label ?? '—'
      else display = raw === 0 || raw ? String(raw) : '—'
      return (
        <div key={String(name)} className="flex items-start justify-between gap-3 border-b border-slate-50 py-1.5 last:border-0">
          <span className="shrink-0 text-xs text-slate-400">{label}</span>
          <span className="text-end text-sm font-medium text-slate-700">{display || '—'}</span>
        </div>
      )
    }
    if (type === 'select') {
      return (
        <Field key={String(name)} label={label}>
          <SearchSelect value={String(raw ?? '')} onChange={(v) => set({ [name]: v || null } as Partial<Vehicle>)} options={options ?? []} />
        </Field>
      )
    }
    return (
      <Field key={String(name)} label={label}>
        <Input
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={raw == null ? '' : String(raw)}
          dir={type === 'date' || type === 'number' ? 'ltr' : undefined}
          onChange={(e) => {
            const v = e.target.value
            set({ [name]: type === 'number' ? (v === '' ? null : Number(v)) : v } as Partial<Vehicle>)
          }}
        />
      </Field>
    )
  }

  // Light, journal-style section: a small heading + a dense 2-column grid (same
  // look in view and edit, so the module stays compact).
  const section = (icon: ReactNode, title: string, body: ReactNode): ReactNode => (
    <section>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}{title}
      </h4>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">{body}</div>
    </section>
  )

  const displayName = pickName(form, lang)

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <span className="font-bold tabular-nums" dir="ltr">{form.plate_number}</span>
          <span className="text-sm font-normal text-slate-500">— {displayName}</span>
          <Badge color={form.status === 'ACTIVE' ? 'green' : form.status === 'MAINTENANCE' ? 'amber' : form.status === 'SOLD' ? 'blue' : 'gray'}>
            {t(`status.${form.status}`)}
          </Badge>
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {editable && editing && vehicle.id && (
              <Button variant="outline" onClick={remove} disabled={saving} className="text-danger hover:bg-red-50">
                <Trash2 className="h-4 w-4" />{t('fleet.mod.delete')}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!canEdit && <span className="text-xs text-slate-400">{t('fleet.mod.readonly')}</span>}
            {canEdit && focus === 'driver' && <span className="text-xs text-slate-400">{t('fleet.mod.upload_hint')}</span>}
            {editable && !editing && (
              <Button variant="primary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />{t('fleet.mod.edit')}
              </Button>
            )}
            {editable && editing && (
              <>
                <Button variant="outline" onClick={() => { setForm(vehicle); setEditing(false) }} disabled={saving}>
                  <X className="h-4 w-4" />{t('fleet.mod.cancel')}
                </Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" />{saving ? t('fleet.mod.saving') : t('fleet.mod.save')}
                </Button>
              </>
            )}
            {!editing && <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>}
          </div>
        </div>
      }
    >
      <div className="max-h-[62vh] space-y-4 overflow-y-auto pe-1">
        {focus === 'full' && section(<Car className="h-4 w-4 text-primary" />, t('fleet.mod.sec_vehicle'), (
          <>
            {row(t('fleet.mod.name_ar'), 'name_ar')}
            {row(t('fleet.mod.name_en'), 'name_en')}
            {row(t('fleet.field.type'), 'vehicle_type', 'select', typeOptions)}
            {row(t('fleet.field.plate'), 'plate_number')}
            {row(t('fleet.field.model_year'), 'model_year', 'number')}
            {row(t('fleet.mod.status'), 'status', 'select', statusOptions)}
            {row(t('fleet.mod.veh_license'), 'vehicle_license_no')}
            {row(t('fleet.mod.veh_license_exp'), 'vehicle_license_expiry', 'date')}
            {row(t('fleet.field.registration_expiry'), 'registration_expiry', 'date')}
            {row(t('fleet.field.odometer'), 'last_odometer', 'number')}
            {row(t('fleet.field.oil_change'), 'oil_change_date', 'date')}
          </>
        ))}

        {/* Registration focus: identity (read) + a few editable papers fields. */}
        {focus === 'registration' && section(<Car className="h-4 w-4 text-primary" />, t('fleet.mod.sec_registration'), (
          <>
            {row(t('fleet.field.plate'), 'plate_number')}
            {row(t('fleet.mod.name_ar'), 'name_ar')}
            {row(t('fleet.mod.veh_license'), 'vehicle_license_no')}
            {row(t('fleet.mod.veh_license_exp'), 'vehicle_license_expiry', 'date')}
            {row(t('fleet.field.registration_expiry'), 'registration_expiry', 'date')}
          </>
        ))}

        {focus === 'full' && section(<FolderOpen className="h-4 w-4 text-primary" />, t('fleet.mod.sec_owner'), (
          <>
            {row(t('fleet.field.owner'), 'owner_name')}
            {row(t('fleet.mod.ownership'), 'ownership', 'select', ownershipOptions)}
            {row(t('fleet.mod.op_company'), 'company_id', 'select', companyOptions)}
            {row(t('fleet.field.project'), 'project_id', 'select', projectOptions)}
            {row(t('fleet.field.location'), 'location')}
          </>
        ))}

        {(focus === 'full' || focus === 'driver') && section(<User className="h-4 w-4 text-primary" />, t('fleet.mod.sec_driver'), (
          <>
            {row(t('fleet.field.driver'), 'driver_name')}
            {row(t('fleet.mod.driver_phone'), 'driver_phone')}
            {row(t('fleet.mod.driver_id'), 'driver_id_no')}
            {row(t('fleet.mod.driver_address'), 'driver_address')}
            {row(t('fleet.mod.driver_license'), 'driver_license_no')}
            {row(t('fleet.mod.driver_license_exp'), 'driver_license_expiry', 'date')}
          </>
        ))}

        {/* Maintenance ledger — the real per-vehicle costs imported from the
            الآليات maintenance sheets (read-only; editing is in Accounting). */}
        {focus === 'full' && section(<Wallet className="h-4 w-4 text-primary" />, t('fleet.mod.sec_maint'), (
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-500">
                {t('fleet.mod.maint_total')}
                <span className="ms-1.5 text-slate-400">· {costRows.length} {t('fleet.mod.maint_count')}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(spent.iqd, 'IQD', lang)}</span>
                {spent.usd ? <span className="text-[11px] font-medium text-emerald-600 tabular-nums">{formatCurrency(spent.usd, 'USD', lang)}</span> : null}
              </span>
            </div>
            {costRows.length === 0 ? (
              <p className="text-xs text-slate-400">{t('fleet.mod.no_costs')}</p>
            ) : (
              <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {costRows.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700">{c.note || t(`fleet.cat.${c.category}`)}</p>
                      <p className="text-[11px] text-slate-400">
                        {c.date ? formatDate(c.date, lang) : '—'} · {t(`fleet.cat.${c.category}`)}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-sm font-medium text-slate-700">
                      {c.currency === 'USD' ? formatCurrency(c.amount, 'USD', lang) : formatNumber(c.amount, lang)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {focus === 'sell' && section(<Wallet className="h-4 w-4 text-primary" />, t('fleet.mod.sec_costs'), (
          <>
            {row(t('fleet.field.plate'), 'plate_number')}
            {row(t('fleet.mod.acq_cost'), 'acquisition_cost', 'number')}
            {editing && row(t('common.currency'), 'acquisition_currency', 'select', currencyOptions)}
            {row(t('fleet.mod.acq_date'), 'acquisition_date', 'date')}
            {row(t('fleet.mod.sale_price'), 'sale_price', 'number')}
            {editing && row(t('common.currency'), 'sale_currency', 'select', currencyOptions)}
            {row(t('fleet.mod.sale_date'), 'sale_date', 'date')}
            {!editing && (
              <div className="flex items-start justify-between gap-3 border-b border-slate-50 py-1.5 last:border-0">
                <span className="shrink-0 text-xs text-slate-400">{t('fleet.mod.spent')}</span>
                <span className="inline-flex flex-col items-end">
                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(spent.iqd, 'IQD', lang)}</span>
                  {spent.usd ? <span className="text-[11px] text-emerald-600">{formatCurrency(spent.usd, 'USD', lang)}</span> : null}
                </span>
              </div>
            )}
            {editing && <p className="text-xs text-amber-600 sm:col-span-2">{t('fleet.mod.sell_hint')}</p>}
          </>
        ))}

        {focus === 'retire' && section(<Tag className="h-4 w-4 text-primary" />, t('fleet.mod.sec_retire'), (
          <>
            {row(t('fleet.field.plate'), 'plate_number')}
            {row(t('fleet.mod.name_ar'), 'name_ar')}
            <p className="text-xs text-amber-600 sm:col-span-2">{t('fleet.mod.retire_hint')}</p>
          </>
        ))}

        {section(<StickyNote className="h-4 w-4 text-primary" />, t('fleet.mod.sec_notes'), (
          <div className="sm:col-span-2">
            {editing ? (
              <Textarea value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder={t('fleet.mod.notes_ph')} />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{form.notes || '—'}</p>
            )}
          </div>
        ))}

        {section(<FileText className="h-4 w-4 text-primary" />, t('fleet.mod.sec_docs'), (
          <div className="space-y-3 sm:col-span-2">
            {canEdit && (vehicle.id ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-44">
                  <SearchSelect value={docType} onChange={setDocType} options={DOC_TYPES.map((d) => ({ value: d, label: t(`fleet.doc.${d}`) }))} />
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f) }} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />{uploading ? t('fleet.mod.uploading') : t('fleet.mod.upload')}
                </Button>
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{t('fleet.mod.save_to_attach')}</p>
            ))}
            {(docs ?? []).length === 0 ? (
              <p className="text-xs text-slate-400">{t('fleet.mod.no_docs')}</p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {(docs ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge color="gray">{t(`fleet.doc.${d.doc_type}`)}</Badge>
                        <span className="truncate text-sm font-medium text-slate-700">{d.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {fmtSize(d.size)}{d.expiry ? ' · ' + formatDate(d.expiry, lang) : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a href={`/api/vehicle-documents/${d.id}/file`} target="_blank" rel="noreferrer" title={d.file_name} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-primary/10 hover:text-primary">
                        <Download className="h-4 w-4" />
                      </a>
                      {canEdit && (
                        <button type="button" onClick={() => deleteDoc(d.id)} title={t('fleet.mod.delete')} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {focus === 'full' && section(<MapPin className="h-4 w-4 text-primary" />, t('fleet.mod.sec_location'), (
          <div className="sm:col-span-2">
            {editing && canEdit && <p className="mb-2 text-xs text-slate-400">{t('fleet.mod.map_hint')}</p>}
            <div ref={mapRef} className="h-44 w-full overflow-hidden rounded-xl border border-slate-200" />
            {form.lat == null && <p className="mt-2 text-xs text-slate-400">{t('fleet.mod.no_location')}</p>}
          </div>
        ))}
      </div>
    </Dialog>
  )
}
