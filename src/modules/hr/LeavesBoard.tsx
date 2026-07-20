// Leaves tab — a 4-column board: قيد الانتظار / استفسار / الموافَق عليها / المرفوضة.
// The inquiry column holds pending requests where the manager asked
// «لماذا تريد الإجازة؟» and is waiting for the employee's answer.
// Pending + inquiry always show; approved/rejected follow the month filter.
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  HelpCircle,
  MessageCircleQuestion,
  PhoneCall,
  Plus,
  Reply,
  Undo2,
  X,
} from 'lucide-react'
import { EmptyState } from '../../components/shared'
import { Badge, Button, Dialog, Field, Input, SearchSelect, Textarea, useToast } from '../../components/ui'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiPost, apiPut } from '../../lib/api'
import { formatDate, formatNumber, pickName } from '../../lib/format'
import type { Employee, LeaveRequest } from '../../types'
import { EmployeeCell } from './lib'
import { inMonth, todayKey } from './hours'
import { HOURLY_LEAVE_HOURS_PER_MONTH, isHourlyLeave, leaveBucket, type LeaveBucket } from './policy'

const DAY_TYPES = ['سنوية', 'اضطرارية', 'مرضية', 'أمومة', 'بدون راتب']

/** Stored leave types are Arabic data values — show the bilingual label when
 *  one is registered, otherwise fall back to the raw value. */
export function typeLabel(type: string, t: (k: string) => string): string {
  const l = t(`hr.ltype.${type}`)
  return l.startsWith('hr.ltype.') ? type : l
}

const COLUMNS: Array<{
  bucket: LeaveBucket
  labelKey: string
  accent: string
  badge: 'amber' | 'sky' | 'green' | 'red'
}> = [
  { bucket: 'PENDING', labelKey: 'hr.leave.board.pending', accent: 'border-t-amber-400', badge: 'amber' },
  { bucket: 'INQUIRY', labelKey: 'hr.leave.board.inquiry', accent: 'border-t-sky-400', badge: 'sky' },
  { bucket: 'APPROVED', labelKey: 'hr.leave.board.approved', accent: 'border-t-emerald-400', badge: 'green' },
  { bucket: 'REJECTED', labelKey: 'hr.leave.board.rejected', accent: 'border-t-red-400', badge: 'red' },
]

export function LeavesBoard({
  employees,
  empMap,
  leaves,
  loading,
  refetch,
  canManage,
  month,
  empFilter,
}: {
  employees: Employee[]
  empMap: Map<string, Employee>
  leaves: LeaveRequest[]
  loading: boolean
  refetch: () => void
  canManage: boolean
  month: string
  empFilter: string
}) {
  const t = useT()
  const { lang } = useLang()
  const { currentUser } = useCompany()
  const toast = useToast()

  const [requestOpen, setRequestOpen] = useState(false)
  const [decision, setDecision] = useState<{ leave: LeaveRequest; status: 'APPROVED' | 'REJECTED' } | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [ask, setAsk] = useState<LeaveRequest | null>(null)
  const [askText, setAskText] = useState('')
  const [answer, setAnswer] = useState<LeaveRequest | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [summon, setSummon] = useState<LeaveRequest | null>(null)
  const [recall, setRecall] = useState<LeaveRequest | null>(null)
  const [recallDate, setRecallDate] = useState(todayKey())
  const [recallNote, setRecallNote] = useState('')
  const [busy, setBusy] = useState(false)

  const buckets = useMemo(() => {
    const out: Record<LeaveBucket, LeaveRequest[]> = { PENDING: [], INQUIRY: [], APPROVED: [], REJECTED: [] }
    for (const l of leaves) {
      if (empFilter && l.employee_id !== empFilter) continue
      const b = leaveBucket(l)
      // Open requests are an inbox — always visible. Decided ones follow the month.
      if ((b === 'APPROVED' || b === 'REJECTED') && !inMonth(l.start_date, month)) continue
      out[b].push(l)
    }
    for (const b of Object.keys(out) as LeaveBucket[]) {
      out[b].sort((a, z) => (z.start_date || '').localeCompare(a.start_date || ''))
    }
    return out
  }, [leaves, empFilter, month])

  const run = async (op: () => Promise<unknown>, doneMsg: string, close: () => void) => {
    if (busy) return
    setBusy(true)
    try {
      await op()
      toast.success(doneMsg)
      close()
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-400">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          {t('hr.leave.board.month_hint')}
        </p>
        <Button onClick={() => setRequestOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('hr.leave.request_btn')}
        </Button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-400">{t('common.loading')}</p>
      ) : leaves.length === 0 ? (
        <EmptyState title={t('hr.leave.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.bucket} className={`card border-t-4 ${col.accent}`}>
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/70 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(col.labelKey)}</h3>
                <Badge color={col.badge}>{formatNumber(buckets[col.bucket].length, lang)}</Badge>
              </div>
              <div className="space-y-3 p-3">
                {buckets[col.bucket].length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-300">{t('hr.leave.no_requests')}</p>
                ) : (
                  buckets[col.bucket].map((l) => (
                    <LeaveCard
                      key={l.id}
                      leave={l}
                      bucket={col.bucket}
                      emp={empMap.get(l.employee_id)}
                      canManage={canManage}
                      onApprove={() => { setDecisionNote(''); setDecision({ leave: l, status: 'APPROVED' }) }}
                      onReject={() => { setDecisionNote(''); setDecision({ leave: l, status: 'REJECTED' }) }}
                      onAsk={() => { setAskText(''); setAsk(l) }}
                      onAnswer={() => { setAnswerText(''); setAnswer(l) }}
                      onSummon={() => setSummon(l)}
                      onRecall={() => { setRecallDate(todayKey()); setRecallNote(''); setRecall(l) }}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RequestLeaveDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        employees={employees}
        busy={busy}
        onSubmit={(body) =>
          run(() => apiPost('/leave_requests', { ...body, status: 'PENDING' }), t('hr.leave.requested_toast'), () => setRequestOpen(false))
        }
      />

      {/* Decision — the manager records WHY before approving/rejecting */}
      <Dialog
        open={!!decision}
        onClose={() => !busy && setDecision(null)}
        size="md"
        title={decision?.status === 'APPROVED' ? t('hr.leave.decision_approve_title') : t('hr.leave.decision_reject_title')}
        description={
          decision
            ? `${pickName(empMap.get(decision.leave.employee_id), lang)} · ${leaveAmount(decision.leave, t, lang)} · ${decision.leave.reason || ''}`
            : undefined
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDecision(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={decision?.status === 'APPROVED' ? 'primary' : 'danger'}
              disabled={busy}
              onClick={() =>
                decision &&
                run(
                  () =>
                    apiPut(`/leave_requests/${decision.leave.id}`, {
                      status: decision.status,
                      decision_note: decisionNote.trim() || null,
                      approved_by: currentUser.name,
                    }),
                  t(decision.status === 'APPROVED' ? 'hr.leave.approved_toast' : 'hr.leave.rejected_toast'),
                  () => setDecision(null),
                )
              }
            >
              {decision?.status === 'APPROVED' ? t('hr.leave.approve') : t('hr.leave.reject')}
            </Button>
          </div>
        }
      >
        <Field label={t('hr.leave.decision_note')}>
          <Textarea value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder={t('hr.leave.decision_note_ph')} rows={3} />
        </Field>
      </Dialog>

      {/* Ask why — sends the question to the employee, request moves to استفسار */}
      <Dialog
        open={!!ask}
        onClose={() => !busy && setAsk(null)}
        size="md"
        title={t('hr.leave.ask_title')}
        description={ask ? `${pickName(empMap.get(ask.employee_id), lang)} · ${ask.reason || ''}` : undefined}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setAsk(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy || !askText.trim()}
              onClick={() =>
                ask && run(() => apiPut(`/leave_requests/${ask.id}`, { manager_question: askText.trim() }), t('hr.leave.ask_sent'), () => setAsk(null))
              }
            >
              <MessageCircleQuestion className="h-4 w-4" />
              {t('hr.leave.ask_btn')}
            </Button>
          </div>
        }
      >
        <Field label={t('hr.leave.ask_label')}>
          <Textarea value={askText} onChange={(e) => setAskText(e.target.value)} placeholder={t('hr.leave.ask_ph')} rows={3} />
        </Field>
        <button
          type="button"
          className="mt-2 rounded-full bg-sky-50 dark:bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300 transition hover:bg-sky-100"
          onClick={() => setAskText(t('hr.leave.ask_ph'))}
        >
          {t('hr.leave.ask_ph')}
        </button>
      </Dialog>

      {/* Answer — the employee replies; request returns to قيد الانتظار */}
      <Dialog
        open={!!answer}
        onClose={() => !busy && setAnswer(null)}
        size="md"
        title={t('hr.leave.answer_title')}
        description={answer?.manager_question ?? undefined}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setAnswer(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy || !answerText.trim()}
              onClick={() =>
                answer && run(() => apiPut(`/leave_requests/${answer.id}`, { question_answer: answerText.trim() }), t('hr.leave.answer_sent'), () => setAnswer(null))
              }
            >
              <Reply className="h-4 w-4" />
              {t('hr.leave.answer_btn')}
            </Button>
          </div>
        }
      >
        <Field label={t('hr.leave.answer_label')}>
          <Textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder={t('hr.leave.answer_ph')} rows={3} />
        </Field>
      </Dialog>

      {/* Summon — the manager calls the employee in for a face-to-face talk */}
      <Dialog
        open={!!summon}
        onClose={() => !busy && setSummon(null)}
        size="md"
        title={t('hr.leave.summon_title')}
        description={summon ? `${pickName(empMap.get(summon.employee_id), lang)} · ${leaveAmount(summon, t, lang)} · ${summon.reason || ''}` : undefined}
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setSummon(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                summon &&
                run(
                  () => apiPut(`/leave_requests/${summon.id}`, { summoned_at: todayKey() }),
                  t('hr.leave.summon_sent'),
                  () => setSummon(null),
                )
              }
            >
              <PhoneCall className="h-4 w-4" />
              {t('hr.leave.summon_btn')}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t('hr.leave.summon_desc')}</p>
      </Dialog>

      {/* Recall from leave — cut an ongoing approved leave; unused days return */}
      <Dialog
        open={!!recall}
        onClose={() => !busy && setRecall(null)}
        size="md"
        title={t('hr.leave.recall_title')}
        description={
          recall
            ? `${pickName(empMap.get(recall.employee_id), lang)} · ${formatDate(recall.start_date, lang)} – ${formatDate(recall.end_date, lang)} · ${formatNumber(recall.days_count, lang)} ${t('hr.board.days_unit')}`
            : undefined
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setRecall(null)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy || !recall || !recallDate || !recallNote.trim() || recallDate < recall.start_date || recallDate > recall.end_date}
              onClick={() => {
                if (!recall) return
                // Days actually consumed = start .. the day BEFORE he returns.
                const usedDays = Math.max(
                  0,
                  Math.round((new Date(recallDate).getTime() - new Date(recall.start_date).getTime()) / 86400000),
                )
                void run(
                  () =>
                    apiPut(`/leave_requests/${recall.id}`, {
                      end_date: usedDays > 0 ? addDaysISO(recall.start_date, usedDays - 1) : recall.start_date,
                      days_count: usedDays,
                      recalled_at: recallDate,
                      recall_note: recallNote.trim(),
                    }),
                  t('hr.leave.recall_done'),
                  () => setRecall(null),
                )
              }}
            >
              <Undo2 className="h-4 w-4" />
              {t('hr.leave.recall_btn')}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field label={t('hr.leave.recall_date')} hint={t('hr.leave.recall_days_hint')}>
            <Input
              type="date"
              value={recallDate}
              min={recall?.start_date}
              max={recall?.end_date}
              onChange={(e) => setRecallDate(e.target.value)}
              dir="ltr"
            />
          </Field>
          <Field label={t('hr.leave.recall_note')} required>
            <Textarea value={recallNote} onChange={(e) => setRecallNote(e.target.value)} placeholder={t('hr.leave.recall_note_ph')} rows={2} />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}

/** ISO date + n days → ISO date (local, calendar arithmetic only). */
function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

// ---------------------------------------------------------------------------

function leaveAmount(l: LeaveRequest, t: (k: string) => string, lang: 'ar' | 'en'): string {
  return isHourlyLeave(l)
    ? t('hr.leave.hourly_badge').replace('{n}', formatNumber(l.hours_count ?? 0, lang, 1))
    : `${formatNumber(l.days_count, lang)} ${t('hr.board.days_unit')}`
}

function LeaveCard({
  leave,
  bucket,
  emp,
  canManage,
  onApprove,
  onReject,
  onAsk,
  onAnswer,
  onSummon,
  onRecall,
}: {
  leave: LeaveRequest
  bucket: LeaveBucket
  emp?: Employee
  canManage: boolean
  onApprove: () => void
  onReject: () => void
  onAsk: () => void
  onAnswer: () => void
  onSummon: () => void
  onRecall: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const hourly = isHourlyLeave(leave)
  const summoned = (leave.summoned_at ?? '').trim() !== ''
  const recalled = (leave.recalled_at ?? '').trim() !== ''
  // An approved day-leave that hasn't finished yet can be cut short.
  const recallable =
    canManage && bucket === 'APPROVED' && !hourly && !recalled && leave.end_date >= todayKey()

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm transition hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <EmployeeCell employee={emp} />
        </div>
        <span className="shrink-0">
          {hourly ? (
            <Badge color="purple">
              <Clock className="h-3 w-3" />
              {t('hr.leave.hourly_badge').replace('{n}', formatNumber(leave.hours_count ?? 0, lang, 1))}
            </Badge>
          ) : (
            <Badge color="primary">
              <CalendarDays className="h-3 w-3" />
              {formatNumber(leave.days_count, lang)} {t('hr.board.days_unit')}
            </Badge>
          )}
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
        <span className="tabular-nums">
          {hourly
            ? formatDate(leave.start_date, lang)
            : `${formatDate(leave.start_date, lang)} – ${formatDate(leave.end_date, lang)}`}
        </span>
        <span className="text-slate-300">·</span>
        <span>{typeLabel(leave.type, t)}</span>
      </p>

      {leave.reason && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2" title={leave.reason}>
          {leave.reason}
        </p>
      )}

      {/* Summoned marker — the employee must visit the office for a talk */}
      {summoned && bucket !== 'APPROVED' && bucket !== 'REJECTED' && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border-s-2 border-violet-300 bg-violet-50 dark:bg-violet-500/15 px-2.5 py-1.5">
          <PhoneCall className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <p className="text-xs leading-relaxed text-violet-800 dark:text-violet-200">
            {t('hr.leave.summoned_since').replace('{date}', formatDate(leave.summoned_at!, lang))}
          </p>
        </div>
      )}

      {/* Recalled marker — leave was cut short; he is back at work */}
      {recalled && (
        <div className="mt-2 rounded-lg border-s-2 border-teal-300 bg-teal-50 dark:bg-teal-500/15 px-2.5 py-1.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
            <Undo2 className="h-3.5 w-3.5 shrink-0" />
            {t('hr.leave.recalled_badge').replace('{date}', formatDate(leave.recalled_at!, lang))}
          </p>
          {leave.recall_note && <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{leave.recall_note}</p>}
        </div>
      )}

      {/* Q&A thread */}
      {(leave.manager_question ?? '').trim() !== '' && (
        <div className="mt-2 space-y-1.5">
          <div className="rounded-lg border-s-2 border-sky-300 bg-sky-50 dark:bg-sky-500/15 px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-300">{t('hr.leave.question_label')}</p>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{leave.manager_question}</p>
          </div>
          {(leave.question_answer ?? '').trim() !== '' ? (
            <div className="rounded-lg border-s-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t('hr.leave.answer_label')}</p>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{leave.question_answer}</p>
            </div>
          ) : (
            <p className="text-xs italic text-slate-400 dark:text-slate-400">{t('hr.leave.waiting_answer')}</p>
          )}
        </div>
      )}

      {/* Decision note on decided cards */}
      {(bucket === 'APPROVED' || bucket === 'REJECTED') && (leave.decision_note || leave.approved_by) && (
        <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5">
          {leave.decision_note && <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{leave.decision_note}</p>}
          {leave.approved_by && (
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-400">
              {t('hr.leave.decided_by')}: {leave.approved_by}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {(bucket === 'INQUIRY' || (canManage && bucket === 'PENDING') || recallable) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-700/70 pt-2.5">
          {bucket === 'INQUIRY' && !summoned && (
            <Button size="sm" onClick={onAnswer}>
              <Reply className="h-3.5 w-3.5" />
              {t('hr.leave.answer_btn')}
            </Button>
          )}
          {canManage && (bucket === 'PENDING' || bucket === 'INQUIRY') && (
            <>
              <Button size="sm" variant="subtle" onClick={onApprove}>
                <Check className="h-3.5 w-3.5" />
                {t('hr.leave.approve')}
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject}>
                <X className="h-3.5 w-3.5 text-danger" />
                {t('hr.leave.reject')}
              </Button>
              {bucket === 'PENDING' && (
                <>
                  <Button size="sm" variant="outline" onClick={onAsk}>
                    <MessageCircleQuestion className="h-3.5 w-3.5" />
                    {t('hr.leave.ask_btn')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onSummon}>
                    <PhoneCall className="h-3.5 w-3.5" />
                    {t('hr.leave.summon_btn')}
                  </Button>
                </>
              )}
            </>
          )}
          {recallable && (
            <Button size="sm" variant="outline" onClick={onRecall}>
              <Undo2 className="h-3.5 w-3.5" />
              {t('hr.leave.recall_btn')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function RequestLeaveDialog({
  open,
  onClose,
  employees,
  busy,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  employees: Employee[]
  busy: boolean
  onSubmit: (body: Partial<LeaveRequest>) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const [kind, setKind] = useState<'daily' | 'hourly'>('daily')
  const [employeeId, setEmployeeId] = useState('')
  const [type, setType] = useState('اضطرارية')
  const [start, setStart] = useState(todayKey())
  const [end, setEnd] = useState(todayKey())
  const [days, setDays] = useState(1)
  const [daysTouched, setDaysTouched] = useState(false)
  const [hours, setHours] = useState(2)
  const [reason, setReason] = useState('')

  // The dialog stays mounted between uses — start every request from a clean
  // form (otherwise daysTouched from a past submit disables the auto-count).
  useEffect(() => {
    if (!open) return
    setKind('daily')
    setEmployeeId('')
    setType('اضطرارية')
    const d = todayKey()
    setStart(d)
    setEnd(d)
    setDays(1)
    setDaysTouched(false)
    setHours(2)
    setReason('')
  }, [open])

  // Auto-compute the day count from the range until the user edits it manually.
  const setRange = (s: string, e: string) => {
    setStart(s)
    setEnd(e)
    if (!daysTouched && s && e) {
      const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1
      if (diff > 0) setDays(diff)
    }
  }

  const valid =
    !!employeeId && !!reason.trim() && !!start && (kind === 'daily' ? !!end && days > 0 : hours > 0)

  const submit = () => {
    if (!valid || busy) return
    onSubmit(
      kind === 'hourly'
        ? { employee_id: employeeId, type: 'زمنية', start_date: start, end_date: start, days_count: 0, hours_count: hours, reason: reason.trim() }
        : { employee_id: employeeId, type, start_date: start, end_date: end, days_count: days, hours_count: 0, reason: reason.trim() },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      size="lg"
      title={t('hr.leave.request_title')}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={busy || !valid}>
            <Plus className="h-4 w-4" />
            {t('hr.leave.request_btn')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* يومية / زمنية toggle */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">{t('hr.leave.kind')}</p>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {(['daily', 'hourly'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  kind === k ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {k === 'daily' ? <CalendarDays className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {t(k === 'daily' ? 'hr.leave.kind_daily' : 'hr.leave.kind_hourly')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('hr.emp.employee')} required>
            <SearchSelect
              value={employeeId}
              onChange={setEmployeeId}
              options={employees.map((e) => ({ value: e.id, label: pickName(e, lang) }))}
              placeholder={t('hr.filter.employee')}
            />
          </Field>
          <Field label={t('hr.leave.type')} required>
            <select
              value={kind === 'hourly' ? 'زمنية' : type}
              onChange={(e) => setType(e.target.value)}
              disabled={kind === 'hourly'}
              className="input-base w-full"
            >
              {(kind === 'hourly' ? ['زمنية'] : DAY_TYPES).map((v) => (
                <option key={v} value={v}>
                  {typeLabel(v, t)}
                </option>
              ))}
            </select>
          </Field>

          {kind === 'daily' ? (
            <>
              <Field label={t('hr.leave.start')} required>
                <Input type="date" value={start} onChange={(e) => setRange(e.target.value, end < e.target.value ? e.target.value : end)} dir="ltr" />
              </Field>
              <Field label={t('hr.leave.end')} required>
                <Input type="date" value={end} onChange={(e) => setRange(start, e.target.value)} dir="ltr" />
              </Field>
              <Field label={t('hr.leave.days')} required>
                <Input
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) => {
                    setDaysTouched(true)
                    setDays(Math.max(1, Number(e.target.value) || 1))
                  }}
                  dir="ltr"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label={t('hr.leave.date')} required>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} dir="ltr" />
              </Field>
              <Field
                label={t('hr.leave.hours')}
                required
                hint={t('hr.leave.hours_hint').replace('{n}', formatNumber(HOURLY_LEAVE_HOURS_PER_MONTH, lang))}
              >
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setHours(Math.max(0.5, Number(e.target.value) || 0.5))}
                  dir="ltr"
                />
              </Field>
            </>
          )}
        </div>

        <Field label={t('hr.leave.reason')} required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </Field>
      </div>
    </Dialog>
  )
}
