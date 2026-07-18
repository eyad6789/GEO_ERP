// Employees tab — card grid over the real staff, with this-month balances on
// every card and two leaderboards (most worked hours / most leave days).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, CalendarClock, Clock, Search, SlidersHorizontal, Trophy, UserPlus } from 'lucide-react'
import { EmptyState, FormDialog, Card, CardBody, CardHeader } from '../../components/shared'
import { Avatar, Button, Input, Popover, useToast } from '../../components/ui'
import { useLang, useT } from '../../context/LangContext'
import { useResource } from '../../hooks/useResource'
import { apiPost, apiPut } from '../../lib/api'
import { cn } from '../../lib/cn'
import { formatNumber, pickName } from '../../lib/format'
import type { Company, Department, Employee } from '../../types'
import { AvatarUploadField } from './AvatarUploadField'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { EmployeeCard } from './EmployeeCard'
import { EDIT_FIELDS } from './employeeForm'
import { CARD_FIELDS, MAX_METRICS, useCardFields, type CardSlot } from './cardFields'
import { indexBy } from './lib'
import { emptyStats, type MonthStats } from './useHrStats'

export function EmployeeCardsSection({
  companyId,
  employees,
  loading,
  refetch,
  companies,
  deptMap,
  canManage,
  month,
  empFilter,
  stats,
  photoMap,
  refetchDocs,
}: {
  companyId: string | null
  employees: Employee[]
  loading: boolean
  refetch: () => void
  companies: Company[]
  deptMap: Map<string, Department>
  canManage: boolean
  month: string
  empFilter: string
  stats: Map<string, MonthStats>
  photoMap: Map<string, string>
  refetchDocs: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const zero = useMemo(() => emptyStats(month), [month])
  const { fields, has, toggle, reset } = useCardFields()

  // Archived roster (company-scoped like the active one) so the toggle flips
  // instantly. `archived: 1` bypasses the API's default hide of archived rows.
  const { data: archived, refetch: refetchArchived } = useResource<Employee>(
    'employees',
    companyId ? { archived: 1, company_id: companyId } : { archived: 1 },
  )

  const restore = async (e: Employee) => {
    try {
      await apiPost(`/employees/${e.id}/restore`, {})
      toast.success(t('hr.restore.done'))
      refetch()
      refetchArchived()
    } catch (err) {
      toast.error((err as Error)?.message || t('common.error'))
    }
  }

  // Resolved here so EmployeeCard stays a dumb leaf — no lookup Maps threaded
  // into it. '' (not pickName's '—') so an absent value hides its line.
  const coMap = useMemo(() => indexBy(companies, (c) => c.id), [companies])
  const nameOf = (rec: Company | Department | undefined) => {
    if (!rec) return ''
    const n = pickName(rec, lang)
    return n === '—' ? '' : n
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees
      .filter((e) => !empFilter || e.id === empFilter)
      .filter(
        (e) =>
          !q ||
          (e.full_name_ar ?? '').toLowerCase().includes(q) ||
          (e.full_name_en ?? '').toLowerCase().includes(q) ||
          (e.employee_number ?? '').includes(q) ||
          (e.phone_primary ?? '').includes(q),
      )
      .slice()
      .sort((a, b) => (Number(a.employee_number) || 999) - (Number(b.employee_number) || 999))
  }, [employees, empFilter, query])

  // Archived list only honours the free-text search (the shell's employee filter
  // dropdown lists active staff, so it would blank the archived view).
  const filteredArchived = useMemo(() => {
    const q = query.trim().toLowerCase()
    return archived
      .filter(
        (e) =>
          !q ||
          (e.full_name_ar ?? '').toLowerCase().includes(q) ||
          (e.full_name_en ?? '').toLowerCase().includes(q) ||
          (e.employee_number ?? '').includes(q) ||
          (e.phone_primary ?? '').includes(q),
      )
      .slice()
      .sort((a, b) => (Number(a.employee_number) || 999) - (Number(b.employee_number) || 999))
  }, [archived, query])

  const statsOf = (e: Employee) => stats.get(e.id) ?? zero

  // Leaderboards over ALL employees in scope (not the search subset).
  const topHours = useMemo(
    () =>
      employees
        .map((e) => ({ e, v: statsOf(e).workedHours }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, stats, zero],
  )
  const topLeaves = useMemo(
    () =>
      employees
        .map((e) => ({ e, v: statsOf(e).leaveDaysTakenMonth, h: statsOf(e).hourlyTakenMonth }))
        .filter((x) => x.v > 0 || x.h > 0)
        .sort((a, b) => b.v - a.v || b.h - a.h)
        .slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, stats, zero],
  )

  return (
    <div className="space-y-5">
      {/* Toolbar: search + new employee */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('hr.emp.search')}
            className="ps-9"
          />
        </div>
        {/* A view preference, not a mutation — every role gets it. */}
        <CardFieldsPicker fields={fields} has={has} toggle={toggle} reset={reset} />
        {canManage && !showArchived && (
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
            {t('hr.emp.new')}
          </Button>
        )}
        {canManage && (
          <Button
            variant={showArchived ? 'primary' : 'outline'}
            onClick={() => setShowArchived((v) => !v)}
            title={t('hr.emp.show_archived')}
          >
            <Archive className="h-4 w-4" />
            {t('hr.emp.show_archived')}
            {archived.length > 0 && (
              <span className="ms-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-200 px-1 text-[11px] font-bold text-slate-600">
                {formatNumber(archived.length, lang)}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* The roster IS the content — it sits right under the toolbar */}
      {showArchived ? (
        // Archived view: restore or permanently delete.
        filteredArchived.length === 0 ? (
          <EmptyState title={t('hr.archived.empty')} hint={t('hr.archived.hint')} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredArchived.map((e) => (
              <EmployeeCard
                key={e.id}
                emp={e}
                stats={statsOf(e)}
                photoDocId={photoMap.get(e.id)}
                fields={fields}
                deptName={e.department_id ? nameOf(deptMap.get(e.department_id)) : ''}
                coName={nameOf(coMap.get(e.company_id))}
                onClick={() => navigate(`/hr/employees/${e.id}`)}
                archived
                onRestore={() => void restore(e)}
                onDelete={() => setDeleting(e)}
              />
            ))}
          </div>
        )
      ) : loading ? (
        <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        // Toolbar (incl. «موظف جديد») stays visible — an empty company must
        // still be able to add its first employee.
        <EmptyState
          title={t('hr.emp.empty')}
          hint={employees.length === 0 ? (companyId ? t('hr.emp.empty_company') : t('hr.emp.empty_hint')) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((e) => (
            <EmployeeCard
              key={e.id}
              emp={e}
              stats={statsOf(e)}
              photoDocId={photoMap.get(e.id)}
              fields={fields}
              deptName={e.department_id ? nameOf(deptMap.get(e.department_id)) : ''}
              coName={nameOf(coMap.get(e.company_id))}
              onClick={() => navigate(`/hr/employees/${e.id}`)}
              onEdit={canManage ? () => setEditing(e) : undefined}
              onDelete={canManage ? () => setDeleting(e) : undefined}
            />
          ))}
        </div>
      )}

      {/* Month highlights — commentary AFTER the people, never above them */}
      {!showArchived && (topHours.length > 0 || topLeaves.length > 0) && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-slate-500">{t('hr.board.month_highlights')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Leaderboard
              title={t('hr.board.top_hours')}
              icon={<Clock className="h-5 w-5" />}
              rows={topHours.map(({ e, v }) => ({
                emp: e,
                value: `${formatNumber(v, lang, 1)} ${t('hr.board.hours_unit')}`,
              }))}
              empty={t('hr.board.empty')}
            />
            <Leaderboard
              title={t('hr.board.top_leaves')}
              icon={<CalendarClock className="h-5 w-5" />}
              rows={topLeaves.map(({ e, v, h }) => ({
                emp: e,
                value:
                  v > 0
                    ? `${formatNumber(v, lang)} ${t('hr.board.days_unit')}`
                    : `${formatNumber(h, lang, 1)} ${t('hr.board.hours_unit')}`,
              }))}
              empty={t('hr.board.empty')}
            />
          </div>
        </div>
      )}

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('hr.emp.new')}
        size="lg"
        initial={{ company_id: companyId ?? 'co-000', status: 'ACTIVE', employment_type: 'FULL' }}
        fields={[
          { name: 'full_name_ar', label: t('hr.emp.full_name_ar'), required: true, dir: 'rtl' },
          { name: 'full_name_en', label: t('hr.emp.full_name_en'), dir: 'ltr' },
          { name: 'employee_number', label: t('hr.emp.number'), required: true },
          { name: 'national_id', label: t('hr.f.national_id'), dir: 'ltr' },
          { name: 'job_title', label: t('hr.emp.job_title') },
          { name: 'phone_primary', label: t('hr.f.phone_primary'), dir: 'ltr' },
          { name: 'address', label: t('hr.f.address'), colSpan: 2 },
          { name: 'emergency_name', label: t('hr.f.emergency_name') },
          { name: 'emergency_phone', label: t('hr.f.emergency_phone'), dir: 'ltr' },
          {
            name: 'company_id',
            label: t('common.company'),
            type: 'select',
            required: true,
            options: companies.map((c) => ({ value: c.id, label: pickName(c, lang) })),
          },
          { name: 'basic_salary', label: t('hr.emp.basic_salary'), type: 'number' },
          {
            name: 'employment_type',
            label: t('hr.emp.employment_type'),
            type: 'select',
            options: (['FULL', 'PART', 'CONTRACT', 'TEMP'] as const).map((v) => ({
              value: v,
              label: t(`hr.etype.${v}`),
            })),
          },
          {
            name: 'status',
            label: t('common.status'),
            type: 'select',
            options: (['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'] as const).map((v) => ({
              value: v,
              label: t(`status.${v}`),
            })),
          },
          { name: 'hire_date', label: t('hr.emp.hire_date'), type: 'date' },
        ]}
        onSubmit={async (values) => {
          await apiPost('/employees', values)
          refetch()
        }}
      />

      {/* Quick edit from a card — same field set + avatar as the profile edit. */}
      {editing && (
        <FormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          title={t('hr.edit.title')}
          size="lg"
          initial={editing as unknown as Record<string, unknown>}
          fields={EDIT_FIELDS(t)}
          submitLabel={t('common.save')}
          header={
            <AvatarUploadField
              employeeId={editing.id}
              name={pickName(editing, lang)}
              color={editing.photo_color}
              currentPhotoDocId={photoMap.get(editing.id)}
              onChanged={refetchDocs}
            />
          }
          onSubmit={async (values) => {
            await apiPut(`/employees/${editing.id}`, values)
            refetch()
            refetchArchived()
          }}
        />
      )}

      {/* Archive (نقل للأرشيف) or permanent delete (حذف نهائي). */}
      {deleting && (
        <DeleteEmployeeDialog
          employee={deleting}
          open={!!deleting}
          onClose={() => setDeleting(null)}
          onDone={() => {
            refetch()
            refetchArchived()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

// «الحقول المعروضة» — chooses what every card shows. Grouped by slot; the month
// metrics are capped because the footer strip stops fitting past four.
const PICKER_GROUPS: Array<{ labelKey: string; slots: CardSlot[] }> = [
  { labelKey: 'hr.card.group_chips', slots: ['chip'] },
  { labelKey: 'hr.card.group_lines', slots: ['line'] },
  { labelKey: 'hr.card.group_metrics', slots: ['meter', 'metric'] },
]

function CardFieldsPicker({
  fields,
  has,
  toggle,
  reset,
}: {
  fields: string[]
  has: (key: string) => boolean
  toggle: (key: string) => void
  reset: () => void
}) {
  const t = useT()
  const metricCount = CARD_FIELDS.filter((f) => f.slot === 'metric' && fields.includes(f.key)).length
  const metricsFull = metricCount >= MAX_METRICS

  return (
    <Popover
      align="end"
      width="w-72"
      trigger={({ toggle: openIt }) => (
        <Button variant="outline" onClick={openIt}>
          <SlidersHorizontal className="h-4 w-4" />
          {t('hr.card.fields')}
        </Button>
      )}
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm font-bold text-slate-700">{t('hr.card.fields')}</p>
          <p className="mt-0.5 text-xs text-slate-400">{t('hr.card.fields_hint')}</p>
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {PICKER_GROUPS.map((g) => (
            <div key={g.labelKey}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {t(g.labelKey)}
                {g.slots.includes('metric') && (
                  <span className="ms-1 font-medium normal-case tracking-normal text-slate-300">
                    {t('hr.card.fields_max').replace('{n}', String(MAX_METRICS))}
                  </span>
                )}
              </p>
              {CARD_FIELDS.filter((f) => g.slots.includes(f.slot)).map((f) => {
                const checked = has(f.key)
                // A cap the UI doesn't show reads as a bug — disable, don't ignore.
                const disabled = f.slot === 'metric' && !checked && metricsFull
                return (
                  <label
                    key={f.key}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm text-slate-600 hover:bg-slate-50',
                      disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(f.key)}
                    />
                    <span className="truncate">{t(f.labelKey)}</span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>

        {/* The way back after hiding everything */}
        <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
          {t('hr.card.fields_reset')}
        </Button>
      </div>
    </Popover>
  )
}

// ---------------------------------------------------------------------------

const MEDALS = [
  'bg-amber-100 text-amber-700',
  'bg-slate-100 text-slate-500',
  'bg-orange-100 text-orange-700',
]

function Leaderboard({
  title,
  icon,
  rows,
  empty,
}: {
  title: string
  icon: React.ReactNode
  rows: Array<{ emp: Employee; value: string }>
  empty: string
}) {
  const { lang } = useLang()
  return (
    <Card>
      <CardHeader title={title} icon={icon} />
      <CardBody>
        {rows.length === 0 ? (
          <p className="py-3 text-center text-sm text-slate-400">{empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map(({ emp, value }, i) => (
              <li key={emp.id} className="flex items-center gap-3 py-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${MEDALS[i] ?? MEDALS[2]}`}
                >
                  {i === 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <Avatar name={pickName(emp, lang)} color={emp.photo_color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                  {pickName(emp, lang)}
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
