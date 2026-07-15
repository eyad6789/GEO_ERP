// Pure time/date math for HR attendance & leave balances. No React, no policy —
// business rules (allowances, weekends) live in policy.ts.

/** 'HH:MM' → minutes since midnight; null when missing/malformed.
 *  '24:00' (end-of-day from older fingerprint imports) is accepted as 1440. */
export function parseHHMM(s: string | null | undefined): number | null {
  if (!s) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h === 24 && min === 0) return 1440
  if (h < 0 || h >= 24 || min < 0 || min >= 60) return null
  return h * 60 + min
}

/** Minutes worked between check-in/out; 0 if either is missing/malformed or out ≤ in.
 *  Open check-outs (fingerprint gaps) deliberately contribute nothing — the UI
 *  shows them as '—' so gaps are visible instead of silently wrong. */
export function workedMinutes(checkIn: string | null | undefined, checkOut: string | null | undefined): number {
  const a = parseHHMM(checkIn)
  const b = parseHHMM(checkOut)
  if (a == null || b == null || b <= a) return 0
  return b - a
}

/** Minutes → hours with 1 decimal (7.5). */
export function minutesToHours(min: number): number {
  return Math.round(min / 6) / 10
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM' for the given date (local time). */
export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** 'YYYY-MM-DD' for the given date (local time). */
export function todayKey(d: Date = new Date()): string {
  return `${currentMonthKey(d)}-${pad(d.getDate())}`
}

/** Does the ISO date fall inside the 'YYYY-MM' month? */
export function inMonth(date: string | null | undefined, month: string): boolean {
  return !!date && date.startsWith(month)
}

/** Does the ISO date fall inside the 'YYYY' year? */
export function inYear(date: string | null | undefined, year: string): boolean {
  return !!date && date.startsWith(year)
}

/** 'YYYY-MM' → { year, month(1..12) }. */
export function splitMonthKey(month: string): { year: number; month: number } {
  const [y, m] = month.split('-')
  return { year: Number(y), month: Number(m) }
}

/** Working days in a month, excluding weekend days (JS getDay values).
 *  opts.upTo ('YYYY-MM-DD'): count only days ≤ upTo — used so the CURRENT month
 *  requires only the hours elapsed so far, not the whole month on day 3. */
export function workingDaysInMonth(
  year: number,
  month: number, // 1..12
  opts?: { weekend?: number[]; upTo?: string },
): number {
  const weekend = opts?.weekend ?? [5]
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad(month)}-${pad(d)}`
    if (opts?.upTo && key > opts.upTo) break
    if (!weekend.includes(new Date(year, month - 1, d).getDay())) count++
  }
  return count
}
