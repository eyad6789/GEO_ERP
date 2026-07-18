// HR business rules — the numbers and access rules management can change live
// here. All balance math in the module goes through these functions.
import type { LeaveRequest } from '../../types'
import { inMonth, inYear, splitMonthKey, todayKey, workingDaysInMonth } from './hours'

// ---- Access control --------------------------------------------------------
// Managing HR (adding employees, importing attendance, deciding leaves, editing
// an employee file) is open to the HR Manager and the Super Admin. Everyone else
// reads. Mirrors canEditFleet(); Accounting deliberately excludes super_admin.
export function canManageHr(roleKey: string): boolean {
  return roleKey === 'super_admin' || roleKey === 'hr_manager'
}

/** ساعات الدوام اليومي */
export const WORK_HOURS_PER_DAY = 8
/** عطلة نهاية الأسبوع في العراق: الجمعة (JS getDay() — الجمعة = 5) */
export const WEEKEND_DAYS = [5]
/** رصيد الإجازة الزمنية الشهري (ساعات) — غير تراكمي */
export const HOURLY_LEAVE_HOURS_PER_MONTH = 7
/** يوم إجازة اعتيادية يُستحق عن كل شهر — يتراكم خلال السنة ويُصفَّر في كانون الثاني */
export const LEAVE_DAYS_ACCRUED_PER_MONTH = 1

/** Required work hours for a month. For the CURRENT month only the working days
 *  elapsed up to today count (fair mid-month numbers); past/future months use
 *  the full month. */
export function requiredHoursForMonth(month: string, today: string = todayKey()): number {
  const { year, month: m } = splitMonthKey(month)
  const upTo = today.startsWith(month) ? today : undefined
  return workingDaysInMonth(year, m, { weekend: WEEKEND_DAYS, upTo }) * WORK_HOURS_PER_DAY
}

/** Leave days entitled through month M of the year (cumulative accrual). */
export function leaveDaysEntitledThrough(month: string): number {
  return splitMonthKey(month).month * LEAVE_DAYS_ACCRUED_PER_MONTH
}

/** A leave request measured in hours (زمنية) rather than days. */
export function isHourlyLeave(l: Pick<LeaveRequest, 'hours_count' | 'days_count'>): boolean {
  return (l.hours_count ?? 0) > 0 && (l.days_count ?? 0) === 0
}

/** Approved leave DAYS taken in the year of `month`, up to and including it.
 *  Attributed to start_date's month (cross-month spans are a documented
 *  simplification at this team size). */
export function leaveDaysTakenThrough(leaves: LeaveRequest[], month: string): number {
  const year = month.slice(0, 4)
  let sum = 0
  for (const l of leaves) {
    if (l.status !== 'APPROVED' || isHourlyLeave(l)) continue
    if (!inYear(l.start_date, year) || l.start_date.slice(0, 7) > month) continue
    sum += l.days_count || 0
  }
  return sum
}

/** Remaining leave-day balance at the end of `month` (clamped ≥ 0). */
export function leaveDaysRemaining(leaves: LeaveRequest[], month: string): number {
  return Math.max(0, leaveDaysEntitledThrough(month) - leaveDaysTakenThrough(leaves, month))
}

/** Approved hourly-leave (زمنية) hours taken inside `month`. */
export function hourlyLeaveTaken(leaves: LeaveRequest[], month: string): number {
  let sum = 0
  for (const l of leaves) {
    if (l.status !== 'APPROVED' || !isHourlyLeave(l)) continue
    if (inMonth(l.start_date, month)) sum += l.hours_count ?? 0
  }
  return sum
}

/** Remaining زمنية hours for `month` (non-cumulative, clamped ≥ 0). */
export function hourlyLeaveRemaining(leaves: LeaveRequest[], month: string): number {
  return Math.max(0, HOURLY_LEAVE_HOURS_PER_MONTH - hourlyLeaveTaken(leaves, month))
}

export type LeaveBucket = 'PENDING' | 'INQUIRY' | 'APPROVED' | 'REJECTED'

/** The four board sections. INQUIRY is derived — a pending request on which the
 *  manager asked «لماذا تريد الإجازة؟» and the employee hasn't answered yet, OR
 *  on which the employee was summoned for a face-to-face talk (استدعاء). A
 *  summon stays in the inquiry column until the manager decides. */
export function leaveBucket(l: LeaveRequest): LeaveBucket {
  if (l.status === 'APPROVED' || l.status === 'REJECTED') return l.status
  if ((l.summoned_at ?? '').trim()) return 'INQUIRY'
  if ((l.manager_question ?? '').trim() && !(l.question_answer ?? '').trim()) return 'INQUIRY'
  return 'PENDING'
}
