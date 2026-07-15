// Per-employee monthly stats — one memoized pass shared by the employee cards,
// the KPI strip, the leaderboards and the detail page.
import { useMemo } from 'react'
import type { Attendance, LeaveRequest } from '../../types'
import { inMonth, minutesToHours, workedMinutes } from './hours'
import {
  HOURLY_LEAVE_HOURS_PER_MONTH,
  hourlyLeaveTaken,
  isHourlyLeave,
  leaveDaysEntitledThrough,
  leaveDaysTakenThrough,
  requiredHoursForMonth,
} from './policy'

export interface MonthStats {
  workedMinutes: number
  workedHours: number // Σ(check_out − check_in) inside the month, 1 decimal
  presentDays: number
  requiredHours: number // policy.requiredHoursForMonth
  hoursRemaining: number // max(0, required − worked)
  leaveDaysTakenMonth: number // approved day-leaves starting in the month
  leaveDaysTakenYear: number // approved day-leaves in the year through the month
  leaveDaysEntitled: number // cumulative accrual through the month
  leaveDaysRemaining: number
  hourlyTakenMonth: number // approved زمنية hours in the month
  hourlyAllowance: number
  hourlyRemaining: number
}

export function computeMonthStats(attendance: Attendance[], leaves: LeaveRequest[], month: string): MonthStats {
  let minutes = 0
  let presentDays = 0
  for (const a of attendance) {
    if (!inMonth(a.date, month)) continue
    if (a.status === 'PRESENT') presentDays++
    minutes += workedMinutes(a.check_in, a.check_out)
  }
  let leaveDaysTakenMonth = 0
  for (const l of leaves) {
    if (l.status === 'APPROVED' && !isHourlyLeave(l) && inMonth(l.start_date, month)) {
      leaveDaysTakenMonth += l.days_count || 0
    }
  }
  const requiredHours = requiredHoursForMonth(month)
  const workedHours = minutesToHours(minutes)
  const leaveDaysTakenYear = leaveDaysTakenThrough(leaves, month)
  const leaveDaysEntitled = leaveDaysEntitledThrough(month)
  const hourlyTakenMonth = hourlyLeaveTaken(leaves, month)
  return {
    workedMinutes: minutes,
    workedHours,
    presentDays,
    requiredHours,
    hoursRemaining: Math.max(0, Math.round((requiredHours - workedHours) * 10) / 10),
    leaveDaysTakenMonth,
    leaveDaysTakenYear,
    leaveDaysEntitled,
    leaveDaysRemaining: Math.max(0, leaveDaysEntitled - leaveDaysTakenYear),
    hourlyTakenMonth,
    hourlyAllowance: HOURLY_LEAVE_HOURS_PER_MONTH,
    hourlyRemaining: Math.max(0, HOURLY_LEAVE_HOURS_PER_MONTH - hourlyTakenMonth),
  }
}

/** employee_id → MonthStats for every employee that has any row (plus none —
 *  callers fall back to computeMonthStats([], [], month) via `emptyStats`). */
export function useHrStats(attendance: Attendance[], leaves: LeaveRequest[], month: string): Map<string, MonthStats> {
  return useMemo(() => {
    const attBy = new Map<string, Attendance[]>()
    for (const a of attendance) {
      const arr = attBy.get(a.employee_id)
      if (arr) arr.push(a)
      else attBy.set(a.employee_id, [a])
    }
    const lvBy = new Map<string, LeaveRequest[]>()
    for (const l of leaves) {
      const arr = lvBy.get(l.employee_id)
      if (arr) arr.push(l)
      else lvBy.set(l.employee_id, [l])
    }
    const out = new Map<string, MonthStats>()
    const ids = new Set([...attBy.keys(), ...lvBy.keys()])
    for (const id of ids) {
      out.set(id, computeMonthStats(attBy.get(id) ?? [], lvBy.get(id) ?? [], month))
    }
    return out
  }, [attendance, leaves, month])
}

/** Zeroed stats for employees without any attendance/leave rows this month. */
export function emptyStats(month: string): MonthStats {
  return computeMonthStats([], [], month)
}
