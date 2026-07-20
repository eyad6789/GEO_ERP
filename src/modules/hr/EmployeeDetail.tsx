import { type ReactNode, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Camera,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  Hourglass,
  IdCard,
  Pencil,
  Trash2,
  Upload,
  User,
  Wallet,
  X,
  ZoomIn,
} from 'lucide-react'
import {
  ArabicTable,
  Card,
  CardBody,
  CardHeader,
  FormDialog,
  NoteWidget,
  StatusBadge,
} from '@/components/shared'
import type { Column, FormFieldConfig } from '@/components/shared'
import { Avatar, Badge, Button, Dialog, SearchSelect, Spinner, Tabs, useToast } from '@/components/ui'
import type { TabItem } from '@/components/ui'
import { useCompany } from '@/context/CompanyContext'
import { useLang, useT } from '@/context/LangContext'
import { useApi, useRecord, useResource } from '@/hooks/useResource'
import { apiDelete, apiPost, apiPut } from '@/lib/api'
import { formatCurrency, formatDate, formatNumber, pickName } from '@/lib/format'
import type { Attendance, Company, Department, Employee, EmployeeDoc, LeaveRequest } from '@/types'
import { MiniBar } from './lib'
import { typeLabel } from './LeavesBoard'
import { MonthPicker } from './MonthPicker'
import { currentMonthKey, minutesToHours, workedMinutes } from './hours'
import { isHourlyLeave } from './policy'
import { computeMonthStats } from './useHrStats'
import { EmployeeTraining } from './EmployeeTraining'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'

type DetailTab = 'info' | 'documents' | 'attendance' | 'leaves' | 'training'

const EMPLOYEE_DOC_TYPES = ['PHOTO', 'NATIONAL_ID', 'DRIVER_LICENSE', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'OTHER'] as const

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 dark:border-slate-700/70 py-2 last:border-0">
      <span className="shrink-0 text-sm text-slate-400 dark:text-slate-400">{label}</span>
      <span className="text-end text-sm font-medium text-slate-700 dark:text-slate-200">{value || '—'}</span>
    </div>
  )
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} icon={icon} />
      <CardBody className="py-2">{children}</CardBody>
    </Card>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const { lang } = useLang()
  const { role } = useCompany()
  const toast = useToast()
  const [tab, setTab] = useState<DetailTab>('info')
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const navigate = useNavigate()

  // HR management actions (photo, edit) — same gate as the shell.
  const isHR = role.key === 'hr_manager'

  // Profile photo — stored as an employee document of type PHOTO; the newest
  // one is shown instead of the initials avatar. HR manager can replace/remove.
  const { data: allDocs, refetch: refetchDocs } = useApi<EmployeeDoc[]>(
    '/employee-documents',
    id ? { employee_id: id } : undefined,
  )
  const photoDoc = (allDocs ?? []).find((d) => d.doc_type === 'PHOTO')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const uploadPhoto = async (file: File) => {
    if (!id) return
    setPhotoBusy(true)
    try {
      const data64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(new Error('read failed'))
        r.readAsDataURL(file)
      })
      // Upload the replacement FIRST — deleting first would lose the old photo
      // for good if the POST fails.
      await apiPost('/employee-documents', {
        employee_id: id,
        doc_type: 'PHOTO',
        title: t('hr.doc.PHOTO'),
        file_name: file.name,
        mime: file.type || 'image/jpeg',
        data: data64,
      })
      if (photoDoc) await apiDelete(`/employee-documents/${photoDoc.id}`).catch(() => undefined)
      refetchDocs()
      toast.success(t('hr.photo.saved'))
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setPhotoBusy(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }
  const removePhoto = async () => {
    if (!photoDoc || !window.confirm(t('hr.photo.confirm_delete'))) return
    setPhotoBusy(true)
    try {
      await apiDelete(`/employee-documents/${photoDoc.id}`)
      refetchDocs()
      toast.success(t('hr.photo.deleted'))
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setPhotoBusy(false)
    }
  }

  const { data: emp, loading, refetch } = useRecord<Employee>('employees', id)
  const { data: company } = useRecord<Company>('companies', emp?.company_id)
  const { data: department } = useRecord<Department>(
    'departments',
    emp?.department_id ?? undefined,
  )
  const { data: manager } = useRecord<Employee>('employees', emp?.manager_id ?? undefined)

  // Attendance + leaves fetched once at page level: the month-stats row and the
  // sub-tabs read the same rows.
  const { data: attendance, loading: attLoading } = useResource<Attendance>('attendance', {
    employee_id: id ?? '—',
    sort: 'date',
    order: 'DESC',
  })
  const { data: leaves, loading: lvLoading } = useResource<LeaveRequest>('leave_requests', {
    employee_id: id ?? '—',
  })

  // «هذا الشهر» balances — independent month picker for this page.
  const [month, setMonth] = useState(currentMonthKey())
  const stats = useMemo(() => computeMonthStats(attendance, leaves, month), [attendance, leaves, month])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!id) return <Navigate to="/hr" replace />
  if (!emp) {
    return (
      <div className="py-20 text-center text-slate-400 dark:text-slate-400">
        <p>{t('hr.detail.not_found')}</p>
        <Link to="/hr" className="mt-3 inline-block text-primary hover:underline">
          {t('hr.detail.back')}
        </Link>
      </div>
    )
  }

  const tabs: TabItem[] = [
    { key: 'info', label: t('hr.detail.tab.info'), icon: <User className="h-4 w-4" /> },
    { key: 'documents', label: t('hr.detail.tab.documents'), icon: <FolderOpen className="h-4 w-4" /> },
    { key: 'attendance', label: t('hr.detail.tab.attendance'), icon: <CalendarCheck className="h-4 w-4" /> },
    { key: 'leaves', label: t('hr.detail.tab.leaves'), icon: <CalendarClock className="h-4 w-4" /> },
    { key: 'training', label: t('hr.detail.tab.training'), icon: <GraduationCap className="h-4 w-4" /> },
  ]

  const fmtOf = (x: number, y: number, key: string, dec = 0) =>
    t(key).replace('{x}', formatNumber(x, lang, dec)).replace('{y}', formatNumber(y, lang))

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/hr"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 transition hover:text-primary"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        {t('hr.detail.back')}
      </Link>

      {/* Profile header */}
      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-5">
          <div className="relative">
            {photoDoc ? (
              <img
                src={`/api/employee-documents/${photoDoc.id}/file`}
                alt={pickName(emp, lang)}
                className="h-20 w-20 rounded-2xl object-cover shadow ring-1 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <Avatar name={pickName(emp, lang)} color={emp.photo_color} size="xl" />
            )}
            {/* Photo upload is always available (the role switcher is cosmetic). */}
            {(
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f) }}
                />
                <button
                  type="button"
                  title={t('hr.photo.upload')}
                  disabled={photoBusy}
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1.5 -end-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow transition hover:bg-primary-dark disabled:opacity-50"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                {photoDoc && (
                  <button
                    type="button"
                    title={t('hr.photo.delete')}
                    disabled={photoBusy}
                    onClick={() => void removePhoto()}
                    className="absolute -top-1.5 -end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 shadow ring-1 ring-slate-200 dark:ring-slate-700 transition hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pickName(emp, lang)}</h1>
              <StatusBadge status={emp.status} />
            </div>
            {emp.job_title && <p className="mt-1 text-primary">{emp.job_title}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <IdCard className="h-4 w-4" />
                {emp.employee_number}
              </span>
              <span>{pickName(company, lang)}</span>
              {department && <span>· {pickName(department, lang)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              {t('common.edit')}
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-red-50 dark:hover:bg-red-500/15" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </Button>
            <NoteWidget recordType="employee" recordId={emp.id} moduleId="hr" />
          </div>
        </CardBody>
      </Card>

      {/* This-month balances: worked hours, hours left, leave days left, زمنية left */}
      <Card className="mb-6">
        <CardHeader
          title={t('hr.detail.month_stats')}
          icon={<Clock className="h-5 w-5" />}
          action={<MonthPicker value={month} onChange={setMonth} />}
        />
        <CardBody>
          {attLoading || lvLoading ? (
            <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-400">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label={t('hr.card.worked_hours')}
                value={fmtOf(stats.workedHours, stats.requiredHours, 'hr.card.of_hours', 1)}
                bar={<MiniBar value={stats.workedHours} max={stats.requiredHours} tone="primary" />}
                icon={<Clock className="h-4 w-4" />}
              />
              <StatTile
                label={t('hr.card.hours_left')}
                value={`${formatNumber(stats.hoursRemaining, lang, 1)} ${t('hr.board.hours_unit')}`}
                bar={<MiniBar value={stats.hoursRemaining} max={stats.requiredHours} tone="auto" />}
                icon={<Hourglass className="h-4 w-4" />}
              />
              <StatTile
                label={t('hr.card.leave_left')}
                value={fmtOf(stats.leaveDaysRemaining, stats.leaveDaysEntitled, 'hr.card.of_days')}
                bar={<MiniBar value={stats.leaveDaysRemaining} max={stats.leaveDaysEntitled} tone="auto" />}
                icon={<CalendarClock className="h-4 w-4" />}
              />
              <StatTile
                label={t('hr.card.hourly_left')}
                value={fmtOf(stats.hourlyRemaining, stats.hourlyAllowance, 'hr.card.of_hours', 1)}
                bar={<MiniBar value={stats.hourlyRemaining} max={stats.hourlyAllowance} tone="auto" />}
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mb-5">
        <Tabs tabs={tabs} value={tab} onChange={(k) => setTab(k as DetailTab)} variant="underline" />
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <InfoCard title={t('hr.info.identity')} icon={<User className="h-5 w-5" />}>
            <InfoRow label={t('hr.f.national_id')} value={emp.national_id} />
            <InfoRow label={t('hr.f.dob')} value={formatDate(emp.dob, lang)} />
            <InfoRow label={t('hr.f.place_of_birth')} value={emp.place_of_birth} />
            <InfoRow label={t('hr.f.nationality')} value={emp.nationality} />
            <InfoRow label={t('hr.f.religion')} value={emp.religion} />
            <InfoRow label={t('hr.f.gender')} value={emp.gender ? t(`hr.gender.${emp.gender}`) : '—'} />
            <InfoRow label={t('hr.f.marital_status')} value={emp.marital_status} />
            <InfoRow label={t('hr.f.children_count')} value={emp.children_count} />
            <InfoRow label={t('hr.f.education')} value={emp.education} />
            <InfoRow label={t('hr.f.graduation_year')} value={<span dir="ltr">{emp.graduation_year}</span>} />
          </InfoCard>

          <InfoCard title={t('hr.info.contact')} icon={<IdCard className="h-5 w-5" />}>
            <InfoRow label={t('hr.f.phone_primary')} value={<span dir="ltr">{emp.phone_primary}</span>} />
            <InfoRow label={t('hr.f.phone_secondary')} value={<span dir="ltr">{emp.phone_secondary}</span>} />
            <InfoRow label={t('hr.f.email_work')} value={<span dir="ltr">{emp.email_work}</span>} />
            <InfoRow label={t('hr.f.email_personal')} value={<span dir="ltr">{emp.email_personal}</span>} />
            <InfoRow label={t('hr.f.address')} value={emp.address} />
            <InfoRow label={t('hr.f.emergency_name')} value={emp.emergency_name} />
            <InfoRow label={t('hr.f.emergency_phone')} value={<span dir="ltr">{emp.emergency_phone}</span>} />
          </InfoCard>

          <InfoCard title={t('hr.info.employment')} icon={<CalendarCheck className="h-5 w-5" />}>
            <InfoRow label={t('hr.f.company')} value={pickName(company, lang)} />
            <InfoRow label={t('hr.f.department')} value={department ? pickName(department, lang) : '—'} />
            <InfoRow label={t('hr.f.job_title')} value={emp.job_title} />
            <InfoRow label={t('hr.f.employment_type')} value={emp.employment_type ? t(`hr.etype.${emp.employment_type}`) : '—'} />
            <InfoRow label={t('hr.f.hire_date')} value={formatDate(emp.hire_date, lang)} />
            <InfoRow label={t('hr.f.contract_end')} value={emp.contract_end_date ? formatDate(emp.contract_end_date, lang) : '—'} />
            <InfoRow label={t('hr.f.manager')} value={manager ? pickName(manager, lang) : '—'} />
            <InfoRow label={t('hr.f.status')} value={<StatusBadge status={emp.status} />} />
          </InfoCard>

          <InfoCard title={t('hr.info.financial')} icon={<Wallet className="h-5 w-5" />}>
            <InfoRow
              label={t('hr.f.basic_salary')}
              value={
                <span className="font-bold text-primary">{formatCurrency(emp.basic_salary, emp.salary_currency, lang)}</span>
              }
            />
            <InfoRow label={t('hr.f.salary_currency')} value={emp.salary_currency} />
            <InfoRow label={t('hr.f.bank_name')} value={emp.bank_name} />
            <InfoRow label={t('hr.f.bank_account')} value={<span dir="ltr">{emp.bank_account}</span>} />
            <InfoRow label={t('hr.f.iban')} value={<span dir="ltr">{emp.iban}</span>} />
          </InfoCard>
        </div>
      )}

      {tab === 'documents' && <EmployeeDocuments employeeId={emp.id} />}
      {tab === 'attendance' && <EmployeeAttendance data={attendance} loading={attLoading} />}
      {tab === 'leaves' && <EmployeeLeaves data={leaves} loading={lvLoading} />}
      {tab === 'training' && <EmployeeTraining employeeId={emp.id} />}

      {editing && (
        <FormDialog
          open={editing}
          onClose={() => setEditing(false)}
          title={t('hr.edit.title')}
          size="lg"
          initial={emp as unknown as Record<string, unknown>}
          fields={EDIT_FIELDS(t)}
          submitLabel={t('common.save')}
          onSubmit={async (values) => {
            // Let errors propagate — FormDialog toasts and keeps the dialog
            // open on failure, closes + toasts success otherwise.
            await apiPut(`/employees/${emp.id}`, values)
            refetch()
          }}
        />
      )}

      <DeleteEmployeeDialog
        employee={emp}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDone={() => navigate('/hr')}
      />
    </div>
  )
}

function StatTile({ label, value, bar, icon }: { label: string; value: string; bar: ReactNode; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-800/50 p-3.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-400">{icon}</span>
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</span>
      </div>
      {bar}
    </div>
  )
}

// Editable fields for an existing employee — identity, contact/address,
// employment and financial. Company/department are set at creation (a transfer),
// so they are intentionally not edited here.
function EDIT_FIELDS(t: (k: string) => string): FormFieldConfig[] {
  const sel = (name: string, label: string, values: string[], prefix: string): FormFieldConfig => ({
    name,
    label,
    type: 'select',
    options: values.map((v) => ({ value: v, label: t(`${prefix}${v}`) })),
  })
  return [
    { name: 'full_name_ar', label: t('hr.emp.full_name_ar'), required: true, dir: 'rtl' },
    { name: 'full_name_en', label: t('hr.emp.full_name_en'), dir: 'ltr' },
    { name: 'national_id', label: t('hr.f.national_id'), dir: 'ltr' },
    { name: 'dob', label: t('hr.f.dob'), type: 'date' },
    { name: 'place_of_birth', label: t('hr.f.place_of_birth') },
    { name: 'nationality', label: t('hr.f.nationality') },
    sel('gender', t('hr.f.gender'), ['MALE', 'FEMALE'], 'hr.gender.'),
    { name: 'marital_status', label: t('hr.f.marital_status') },
    { name: 'phone_primary', label: t('hr.f.phone_primary'), dir: 'ltr' },
    { name: 'phone_secondary', label: t('hr.f.phone_secondary'), dir: 'ltr' },
    { name: 'email_work', label: t('hr.f.email_work'), type: 'email', dir: 'ltr' },
    { name: 'email_personal', label: t('hr.f.email_personal'), type: 'email', dir: 'ltr' },
    { name: 'address', label: t('hr.f.address'), colSpan: 2 },
    { name: 'emergency_name', label: t('hr.f.emergency_name') },
    { name: 'emergency_phone', label: t('hr.f.emergency_phone'), dir: 'ltr' },
    { name: 'job_title', label: t('hr.f.job_title') },
    { name: 'education', label: t('hr.f.education') },
    { name: 'graduation_year', label: t('hr.f.graduation_year'), dir: 'ltr' },
    sel('employment_type', t('hr.f.employment_type'), ['FULL', 'PART', 'CONTRACT', 'TEMP'], 'hr.etype.'),
    sel('status', t('hr.f.status'), ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'], 'status.'),
    { name: 'hire_date', label: t('hr.f.hire_date'), type: 'date' },
    { name: 'basic_salary', label: t('hr.f.basic_salary'), type: 'number' },
    { name: 'bank_name', label: t('hr.f.bank_name') },
    { name: 'bank_account', label: t('hr.f.bank_account'), dir: 'ltr' },
    { name: 'iban', label: t('hr.f.iban'), dir: 'ltr' },
  ]
}

// --- Employee documents (ID / license / contract scans) ---------------------

function EmployeeDocuments({ employeeId }: { employeeId: string }) {
  const t = useT()
  const toast = useToast()
  const { data: docs, refetch } = useApi<EmployeeDoc[]>('/employee-documents', { employee_id: employeeId })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<string>('NATIONAL_ID')
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState<EmployeeDoc | null>(null)

  const fileUrl = (d: EmployeeDoc) => `/api/employee-documents/${d.id}/file`
  const isImg = (m: string) => (m || '').startsWith('image/')
  const isPdf = (m: string) => (m || '').includes('pdf')

  const uploadDoc = async (file: File) => {
    setUploading(true)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(r.error)
        r.readAsDataURL(file)
      })
      await apiPost('/employee-documents', { employee_id: employeeId, doc_type: docType, title: file.name, file_name: file.name, mime: file.type, data })
      toast.success(t('hr.doc.uploaded'))
      refetch()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const deleteDoc = async (id: string) => {
    if (!window.confirm(t('hr.doc.confirm_delete'))) return
    try {
      await apiDelete(`/employee-documents/${id}`)
      toast.success(t('hr.doc.deleted'))
      refetch()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    }
  }

  const list = docs ?? []
  return (
    <Card>
      <CardHeader title={t('hr.detail.tab.documents')} icon={<FileText className="h-5 w-5" />} />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-52">
            <SearchSelect
              value={docType}
              onChange={setDocType}
              options={EMPLOYEE_DOC_TYPES.map((d) => ({ value: d, label: t(`hr.doc.${d}`) }))}
            />
          </div>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f) }} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? t('hr.doc.uploading') : t('hr.doc.upload')}
          </Button>
        </div>

        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-400">{t('hr.doc.empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((d) => (
              <div key={d.id} className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition hover:shadow-md">
                <button type="button" onClick={() => setViewer(d)} title={d.title} className="block h-32 w-full bg-slate-50 dark:bg-slate-800/60">
                  {isImg(d.mime) ? (
                    <img src={fileUrl(d)} alt={d.title} loading="lazy" className="h-32 w-full object-cover" />
                  ) : (
                    <span className="flex h-32 w-full flex-col items-center justify-center gap-1 text-slate-400 dark:text-slate-400">
                      <FileText className="h-7 w-7" />
                      <span className="text-[10px] font-semibold uppercase">{isPdf(d.mime) ? 'PDF' : (d.file_name.split('.').pop() || 'FILE')}</span>
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-white drop-shadow" />
                  </span>
                </button>
                <span className="pointer-events-none absolute start-1.5 top-1.5">
                  <Badge color={isPdf(d.mime) ? 'red' : 'blue'}>{t(`hr.doc.${d.doc_type}`)}</Badge>
                </span>
                <button
                  type="button"
                  onClick={() => deleteDoc(d.id)}
                  title={t('hr.doc.delete')}
                  className="absolute end-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-slate-400 dark:text-slate-400 opacity-0 shadow transition hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <p className="truncate px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300" title={d.file_name}>{d.title}</p>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <Dialog open={!!viewer} onClose={() => setViewer(null)} size="xl" title={viewer?.title ?? ''}>
        {viewer && (
          isImg(viewer.mime) ? (
            <img src={fileUrl(viewer)} alt={viewer.title} className="mx-auto max-h-[70vh] w-auto rounded-lg" />
          ) : (
            <object data={fileUrl(viewer)} type={viewer.mime} className="h-[70vh] w-full rounded-lg">
              <a href={fileUrl(viewer)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {viewer.file_name}
              </a>
            </object>
          )
        )}
      </Dialog>
    </Card>
  )
}

// --- per-employee sub-tables ------------------------------------------------

function EmployeeAttendance({ data, loading }: { data: Attendance[]; loading: boolean }) {
  const t = useT()
  const { lang } = useLang()
  const columns: Column<Attendance>[] = [
    {
      key: 'date',
      header: t('common.date'),
      accessor: (a) => a.date,
      render: (a) => formatDate(a.date, lang),
      sortable: true,
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (a) => a.status,
      render: (a) => <StatusBadge status={a.status} />,
      align: 'center',
    },
    { key: 'check_in', header: t('hr.att.check_in'), render: (a) => a.check_in ?? '—', align: 'center' },
    { key: 'check_out', header: t('hr.att.check_out'), render: (a) => a.check_out ?? '—', align: 'center' },
    {
      key: 'worked',
      header: t('hr.att.worked_hours'),
      accessor: (a) => workedMinutes(a.check_in, a.check_out),
      render: (a) => {
        const min = workedMinutes(a.check_in, a.check_out)
        return (
          <span className="tabular-nums font-semibold text-primary">
            {min > 0 ? formatNumber(minutesToHours(min), lang, 1) : '—'}
          </span>
        )
      },
      align: 'center',
      sortable: true,
    },
    { key: 'notes', header: t('common.notes'), render: (a) => a.notes || '—' },
  ]
  return (
    <ArabicTable<Attendance>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(a) => a.id}
      exportName="employee_attendance"
      emptyTitle={t('hr.att.empty')}
    />
  )
}

function EmployeeLeaves({ data, loading }: { data: LeaveRequest[]; loading: boolean }) {
  const t = useT()
  const { lang } = useLang()

  // Balance tiles: approved days this year / all time / days pending.
  const balance = useMemo(() => {
    const thisYear = String(new Date().getFullYear())
    let approvedYear = 0
    let approvedAll = 0
    let pending = 0
    for (const l of data) {
      if (isHourlyLeave(l)) continue
      if (l.status === 'APPROVED') {
        approvedAll += l.days_count || 0
        if ((l.start_date || '').startsWith(thisYear)) approvedYear += l.days_count || 0
      } else if (l.status === 'PENDING') pending += l.days_count || 0
    }
    return { approvedYear, approvedAll, pending, year: thisYear }
  }, [data])

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'type',
      header: t('hr.leave.type'),
      accessor: (l) => l.type,
      render: (l) =>
        isHourlyLeave(l) ? (
          <Badge color="purple">
            {t('hr.leave.hourly_badge').replace('{n}', formatNumber(l.hours_count ?? 0, lang, 1))}
          </Badge>
        ) : (
          typeLabel(l.type, t)
        ),
      sortable: true,
    },
    {
      key: 'period',
      header: `${t('hr.leave.start')} – ${t('hr.leave.end')}`,
      accessor: (l) => l.start_date,
      render: (l) => (
        <span className="whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
          {isHourlyLeave(l)
            ? formatDate(l.start_date, lang)
            : `${formatDate(l.start_date, lang)} – ${formatDate(l.end_date, lang)}`}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'amount',
      header: `${t('hr.leave.days')} / ${t('hr.leave.hours')}`,
      accessor: (l) => (isHourlyLeave(l) ? l.hours_count ?? 0 : l.days_count),
      render: (l) => (
        <span className="tabular-nums">
          {isHourlyLeave(l)
            ? `${formatNumber(l.hours_count ?? 0, lang, 1)} ${t('hr.board.hours_unit')}`
            : `${formatNumber(l.days_count, lang)} ${t('hr.board.days_unit')}`}
        </span>
      ),
      align: 'center',
    },
    {
      key: 'reason',
      header: t('hr.leave.reason'),
      render: (l) => (
        <span className="block max-w-[240px] truncate text-slate-600 dark:text-slate-300" title={l.reason ?? ''}>
          {l.reason || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (l) => l.status,
      render: (l) => <StatusBadge status={l.status} />,
      align: 'center',
    },
    {
      key: 'decision_note',
      header: t('hr.leave.decision'),
      accessor: (l) => l.decision_note ?? '',
      render: (l) => (
        <span className="block max-w-[220px] truncate text-slate-500 dark:text-slate-400" title={l.decision_note ?? ''}>
          {l.decision_note || '—'}
        </span>
      ),
    },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-primary/5 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-primary">{formatNumber(balance.approvedYear, lang)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('hr.leave.days_this_year').replace(
              '{year}',
              new Intl.NumberFormat(lang === 'ar' ? 'ar-IQ' : 'en-US', { useGrouping: false }).format(Number(balance.year)),
            )}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-200">{formatNumber(balance.approvedAll, lang)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('hr.leave.days_all_time')}</p>
        </div>
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/15 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatNumber(balance.pending, lang)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('hr.leave.days_pending')}</p>
        </div>
      </div>
      <ArabicTable<LeaveRequest>
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(l) => l.id}
        exportName="employee_leaves"
        emptyTitle={t('hr.leave.empty')}
      />
    </div>
  )
}
