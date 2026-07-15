// Employees tab — card grid over the real staff, with this-month balances on
// every card and two leaderboards (most worked hours / most leave days).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Clock, Phone, Search, Trophy, UserPlus } from 'lucide-react'
import { EmptyState, FormDialog, Card, CardBody, CardHeader, StatusBadge } from '../../components/shared'
import { Avatar, Button, Input } from '../../components/ui'
import { useLang, useT } from '../../context/LangContext'
import { apiPost } from '../../lib/api'
import { formatNumber, pickName } from '../../lib/format'
import type { Company, Department, Employee } from '../../types'
import { MiniBar } from './lib'
import { emptyStats, type MonthStats } from './useHrStats'

export function EmployeeCardsSection({
  companyId,
  employees,
  loading,
  refetch,
  deptMap,
  companies,
  canManage,
  month,
  empFilter,
  stats,
  photoMap,
}: {
  companyId: string | null
  employees: Employee[]
  loading: boolean
  refetch: () => void
  deptMap: Map<string, Department>
  companies: Company[]
  canManage: boolean
  month: string
  empFilter: string
  stats: Map<string, MonthStats>
  photoMap: Map<string, string>
}) {
  const t = useT()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const zero = useMemo(() => emptyStats(month), [month])

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
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
            {t('hr.emp.new')}
          </Button>
        )}
      </div>

      {/* Leaderboards */}
      {(topHours.length > 0 || topLeaves.length > 0) && (
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
      )}

      {/* Cards */}
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        // Toolbar (incl. «موظف جديد») stays visible — an empty company must
        // still be able to add its first employee.
        <EmptyState
          title={t('hr.emp.empty')}
          hint={employees.length === 0 ? (companyId ? t('hr.emp.empty_company') : t('hr.emp.empty_hint')) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((e) => (
            <EmployeeCard
              key={e.id}
              emp={e}
              dept={e.department_id ? deptMap.get(e.department_id) : undefined}
              stats={statsOf(e)}
              photoDocId={photoMap.get(e.id)}
              onClick={() => navigate(`/hr/employees/${e.id}`)}
            />
          ))}
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
    </div>
  )
}

// ---------------------------------------------------------------------------

function EmployeeCard({
  emp,
  dept,
  stats,
  photoDocId,
  onClick,
}: {
  emp: Employee
  dept?: Department
  stats: MonthStats
  photoDocId?: string
  onClick: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const name = pickName(emp, lang)
  const secondary = [emp.job_title, dept ? pickName(dept, lang) : ''].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="h-1" style={{ backgroundColor: emp.photo_color || '#1a5f7a' }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {photoDocId ? (
            <img
              src={`/api/employee-documents/${photoDocId}/file`}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <Avatar name={name} color={emp.photo_color} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-bold text-slate-800 group-hover:text-primary">{name}</p>
              <StatusBadge status={emp.status} />
            </div>
            {secondary && <p className="mt-0.5 truncate text-xs text-slate-400">{secondary}</p>}
            {emp.phone_primary && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span dir="ltr" className="tabular-nums">{emp.phone_primary}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-500">{t('hr.card.worked_hours')}</span>
              <span className="text-xs font-semibold tabular-nums text-slate-700">
                {t('hr.card.of_hours')
                  .replace('{x}', formatNumber(stats.workedHours, lang, 1))
                  .replace('{y}', formatNumber(stats.requiredHours, lang))}
              </span>
            </div>
            <MiniBar value={stats.workedHours} max={stats.requiredHours} tone="primary" />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-500">{t('hr.card.leave_left')}</span>
              <span className="text-xs font-semibold tabular-nums text-slate-700">
                {t('hr.card.of_days')
                  .replace('{x}', formatNumber(stats.leaveDaysRemaining, lang))
                  .replace('{y}', formatNumber(stats.leaveDaysEntitled, lang))}
              </span>
            </div>
            <MiniBar value={stats.leaveDaysRemaining} max={stats.leaveDaysEntitled} tone="auto" />
          </div>
        </div>
      </div>
    </div>
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
