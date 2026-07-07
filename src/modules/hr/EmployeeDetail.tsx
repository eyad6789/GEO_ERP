import { type ReactNode, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  CalendarCheck,
  CalendarClock,
  FileText,
  FolderOpen,
  HandCoins,
  IdCard,
  Pencil,
  Star,
  Trash2,
  Upload,
  User,
  Wallet,
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
import { useLang, useT } from '@/context/LangContext'
import { useApi, useRecord, useResource } from '@/hooks/useResource'
import { apiDelete, apiPost, apiPut } from '@/lib/api'
import { formatCurrency, formatDate, pickName } from '@/lib/format'
import type {
  Advance,
  Attendance,
  Company,
  Department,
  Employee,
  EmployeeDoc,
  LeaveRequest,
  Payroll,
  PerformanceReview,
} from '@/types'
import { StarRating } from './lib'

type DetailTab = 'info' | 'documents' | 'attendance' | 'leaves' | 'payroll' | 'advances' | 'reviews'

const EMPLOYEE_DOC_TYPES = ['NATIONAL_ID', 'DRIVER_LICENSE', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'OTHER'] as const

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-50 py-2 last:border-0">
      <span className="shrink-0 text-sm text-slate-400">{label}</span>
      <span className="text-end text-sm font-medium text-slate-700">{value || '—'}</span>
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
  const toast = useToast()
  const [tab, setTab] = useState<DetailTab>('info')
  const [editing, setEditing] = useState(false)

  const { data: emp, loading, refetch } = useRecord<Employee>('employees', id)
  const { data: company } = useRecord<Company>('companies', emp?.company_id)
  const { data: department } = useRecord<Department>(
    'departments',
    emp?.department_id ?? undefined,
  )
  const { data: manager } = useRecord<Employee>('employees', emp?.manager_id ?? undefined)

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
      <div className="py-20 text-center text-slate-400">
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
    { key: 'payroll', label: t('hr.detail.tab.payroll'), icon: <Wallet className="h-4 w-4" /> },
    { key: 'advances', label: t('hr.detail.tab.advances'), icon: <HandCoins className="h-4 w-4" /> },
    { key: 'reviews', label: t('hr.detail.tab.reviews'), icon: <Award className="h-4 w-4" /> },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/hr"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-primary"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        {t('hr.detail.back')}
      </Link>

      {/* Profile header */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-5">
          <Avatar name={pickName(emp, lang)} color={emp.photo_color} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{pickName(emp, lang)}</h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="mt-1 text-primary">{emp.job_title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
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
            <NoteWidget recordType="employee" recordId={emp.id} moduleId="hr" />
          </div>
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
            <InfoRow label={t('hr.f.gender')} value={t(`hr.gender.${emp.gender}`)} />
            <InfoRow label={t('hr.f.marital_status')} value={emp.marital_status} />
            <InfoRow label={t('hr.f.children_count')} value={emp.children_count} />
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
            <InfoRow label={t('hr.f.employment_type')} value={t(`hr.etype.${emp.employment_type}`)} />
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
      {tab === 'attendance' && <EmployeeAttendance employeeId={emp.id} />}
      {tab === 'leaves' && <EmployeeLeaves employeeId={emp.id} />}
      {tab === 'payroll' && <EmployeePayroll employeeId={emp.id} />}
      {tab === 'advances' && <EmployeeAdvances employeeId={emp.id} />}
      {tab === 'reviews' && <EmployeeReviews employeeId={emp.id} />}

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
            try {
              await apiPut(`/employees/${emp.id}`, values)
              toast.success(t('common.saved'))
              setEditing(false)
              refetch()
            } catch (e) {
              toast.error((e as Error)?.message || t('common.error'))
            }
          }}
        />
      )}
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
    { name: 'job_title', label: t('hr.f.job_title'), required: true },
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
  const { lang } = useLang()
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
          <p className="py-8 text-center text-sm text-slate-400">{t('hr.doc.empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((d) => (
              <div key={d.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <button type="button" onClick={() => setViewer(d)} title={d.title} className="block h-32 w-full bg-slate-50">
                  {isImg(d.mime) ? (
                    <img src={fileUrl(d)} alt={d.title} loading="lazy" className="h-32 w-full object-cover" />
                  ) : (
                    <span className="flex h-32 w-full flex-col items-center justify-center gap-1 text-slate-400">
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
                  className="absolute end-1.5 top-1.5 rounded-lg bg-white/90 p-1 text-slate-400 opacity-0 shadow transition hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <p className="truncate px-2 py-1.5 text-xs text-slate-600" title={d.file_name}>{d.title}</p>
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

function EmployeeAttendance({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Attendance>('attendance', {
    employee_id: employeeId,
    sort: 'date',
    order: 'DESC',
  })
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

function EmployeeLeaves({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<LeaveRequest>('leave_requests', { employee_id: employeeId })
  const columns: Column<LeaveRequest>[] = [
    { key: 'type', header: t('hr.leave.type'), sortable: true },
    {
      key: 'period',
      header: `${t('hr.leave.start')} – ${t('hr.leave.end')}`,
      accessor: (l) => l.start_date,
      render: (l) => (
        <span className="whitespace-nowrap tabular-nums text-slate-600">
          {formatDate(l.start_date, lang)} – {formatDate(l.end_date, lang)}
        </span>
      ),
    },
    {
      key: 'days_count',
      header: t('hr.leave.days'),
      render: (l) => <span className="tabular-nums">{l.days_count}</span>,
      align: 'center',
    },
    { key: 'reason', header: t('hr.leave.reason'), render: (l) => l.reason || '—' },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (l) => l.status,
      render: (l) => <StatusBadge status={l.status} />,
      align: 'center',
    },
  ]
  return (
    <ArabicTable<LeaveRequest>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(l) => l.id}
      exportName="employee_leaves"
      emptyTitle={t('hr.leave.empty')}
    />
  )
}

function EmployeePayroll({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Payroll>('payroll', {
    employee_id: employeeId,
    sort: 'period',
    order: 'DESC',
  })
  const allowances = (p: Payroll) =>
    (p.housing_allowance ?? 0) + (p.transport_allowance ?? 0) + (p.phone_allowance ?? 0) + (p.overtime ?? 0)
  const deductions = (p: Payroll) =>
    (p.deductions_absence ?? 0) + (p.deductions_advance ?? 0) + (p.other_deductions ?? 0)
  const columns: Column<Payroll>[] = [
    { key: 'period', header: t('hr.pay.period'), sortable: true, align: 'center' },
    {
      key: 'basic',
      header: t('hr.pay.basic'),
      accessor: (p) => p.basic_salary,
      render: (p) => <span className="tabular-nums">{formatCurrency(p.basic_salary, p.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'allowances',
      header: t('hr.pay.allowances'),
      accessor: (p) => allowances(p),
      render: (p) => <span className="tabular-nums text-success">+{formatCurrency(allowances(p), p.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'deductions',
      header: t('hr.pay.deductions'),
      accessor: (p) => deductions(p),
      render: (p) => <span className="tabular-nums text-danger">−{formatCurrency(deductions(p), p.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'net',
      header: t('hr.pay.net'),
      accessor: (p) => p.net_salary,
      render: (p) => <span className="tabular-nums font-bold text-primary">{formatCurrency(p.net_salary, p.currency, lang)}</span>,
      align: 'end',
      sortable: true,
    },
  ]
  return (
    <ArabicTable<Payroll>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(p) => p.id}
      exportName="employee_payroll"
      emptyTitle={t('hr.pay.empty')}
    />
  )
}

function EmployeeAdvances({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data, loading } = useResource<Advance>('advances', {
    employee_id: employeeId,
    sort: 'date',
    order: 'DESC',
  })
  const columns: Column<Advance>[] = [
    {
      key: 'date',
      header: t('common.date'),
      accessor: (a) => a.date,
      render: (a) => formatDate(a.date, lang),
      sortable: true,
    },
    {
      key: 'amount',
      header: t('hr.adv.amount'),
      accessor: (a) => a.amount,
      render: (a) => <span className="tabular-nums font-medium">{formatCurrency(a.amount, a.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'monthly_deduction',
      header: t('hr.adv.monthly'),
      accessor: (a) => a.monthly_deduction,
      render: (a) => <span className="tabular-nums">{formatCurrency(a.monthly_deduction, a.currency, lang)}</span>,
      align: 'end',
    },
    {
      key: 'balance_remaining',
      header: t('hr.adv.balance'),
      accessor: (a) => a.balance_remaining,
      render: (a) => (
        <span className="tabular-nums font-semibold text-danger">
          {formatCurrency(a.balance_remaining, a.currency, lang)}
        </span>
      ),
      align: 'end',
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (a) => a.status,
      render: (a) => <StatusBadge status={a.status} />,
      align: 'center',
    },
  ]
  return (
    <ArabicTable<Advance>
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(a) => a.id}
      exportName="employee_advances"
      emptyTitle={t('hr.adv.empty')}
    />
  )
}

function EmployeeReviews({ employeeId }: { employeeId: string }) {
  const t = useT()
  const { data, loading } = useResource<PerformanceReview>('performance_reviews', { employee_id: employeeId })

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
  if (data.length === 0) {
    return (
      <Card>
        <CardBody>
          <p className="py-10 text-center text-sm text-slate-400">{t('hr.rev.empty')}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {data.map((r) => (
        <Card key={r.id}>
          <CardHeader
            title={r.period}
            icon={<Star className="h-5 w-5" />}
            action={<StarRating value={r.rating_overall} />}
          />
          <CardBody className="space-y-3">
            {r.manager_comments && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400">{t('hr.rev.comments')}</p>
                <p className="text-sm leading-relaxed text-slate-700">{r.manager_comments}</p>
              </div>
            )}
            {r.goals && (
              <div className="rounded-lg bg-primary/5 p-2.5">
                <p className="mb-1 text-xs font-medium text-primary">{t('hr.rev.goals')}</p>
                <p className="text-sm leading-relaxed text-slate-600">{r.goals}</p>
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
