// Generate a believable attendance + leave HISTORY for the current (real)
// employees — the owner wants the HR module populated with each person's
// story: present/absent days, approved & rejected leaves, hourly (زمنية)
// leaves, and a couple of open requests for the leaves board.
//
// Touches ONLY attendance and leave_requests (wipes both, then regenerates —
// re-runnable and deterministic). Employees/departments are never modified.
// Range: May 1st of the current year → today. Fridays are skipped (weekend).
//
// Run: npm run seed:hr:history
import { db } from '../db/connection.js'
import { genId, nowISO } from '../lib/ids.js'
import { logEvent } from '../lib/eventLog.js'

// Deterministic RNG (same generator the main seed uses).
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260715)
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const pad = (n: number) => String(n).padStart(2, '0')

const employees = db.prepare(`SELECT id, full_name_ar FROM employees ORDER BY id`).all() as Array<{
  id: string
  full_name_ar: string
}>
if (employees.length === 0) {
  console.error('✗ لا يوجد موظفون — شغّل npm run seed:hr أولاً.')
  process.exit(1)
}

// ---- date helpers -----------------------------------------------------------
const today = new Date()
const start = new Date(today.getFullYear(), 4, 1) // May 1st
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const workingDays: string[] = []
for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
  if (d.getDay() !== 5) workingDays.push(dateKey(d)) // skip Fridays
}

// ---- leave plan per employee -------------------------------------------------
// Approved day-leaves become LEAVE attendance rows on their working days, so
// the two histories always agree.
const DAY_TYPES = ['سنوية', 'اضطرارية', 'مرضية']
const REASONS = ['ظرف عائلي', 'مراجعة دائرة رسمية', 'وعكة صحية', 'سفر قصير', 'مناسبة اجتماعية', 'إجراء معاملة عقارية']
const HOURLY_REASONS = ['مراجعة طبيب', 'مراجعة دائرة الجوازات', 'التزام عائلي طارئ', 'مراجعة مصرف']
const DECISION_OK = ['رصيده يسمح والعمل لا يتأثر', 'موافقة الإدارة', 'لا يوجد ارتباط بمهام حرجة']
const DECISION_NO = ['ضغط عمل في هذا الأسبوع', 'تجاوز الرصيد المتاح لهذا الشهر']
const QUESTION = 'لماذا تريد الإجازة؟'
const ANSWERS = ['مراجعة مستشفى لوالدي', 'التزام عائلي لا يمكن تأجيله', 'إكمال معاملة رسمية لها موعد محدد']

interface LeaveRow {
  id: string
  employee_id: string
  type: string
  start_date: string
  end_date: string
  days_count: number
  hours_count: number
  reason: string
  status: string
  approved_by: string | null
  decision_note: string | null
  manager_question: string | null
  question_answer: string | null
  created_at: string
}

const leaves: LeaveRow[] = []
const leaveDaysByEmp = new Map<string, Set<string>>() // approved day-leave dates

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return dateKey(dt)
}

for (const emp of employees) {
  const taken = new Set<string>()
  leaveDaysByEmp.set(emp.id, taken)

  // 1-3 daily leaves per person, mostly approved.
  const nDaily = ri(1, 3)
  for (let i = 0; i < nDaily; i++) {
    const startDate = pick(workingDays.slice(0, Math.max(1, workingDays.length - 3)))
    const days = ri(1, 2)
    const endDate = addDays(startDate, days - 1)
    const roll = rnd()
    const status = roll < 0.7 ? 'APPROVED' : roll < 0.85 ? 'REJECTED' : 'PENDING'
    const withQA = status === 'PENDING' && rnd() < 0.5
    leaves.push({
      id: genId('lea'),
      employee_id: emp.id,
      type: pick(DAY_TYPES),
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      hours_count: 0,
      reason: pick(REASONS),
      status,
      approved_by: status === 'PENDING' ? null : 'أحمد المدير',
      decision_note: status === 'APPROVED' ? pick(DECISION_OK) : status === 'REJECTED' ? pick(DECISION_NO) : null,
      manager_question: withQA ? QUESTION : null,
      question_answer: withQA && rnd() < 0.5 ? pick(ANSWERS) : null,
      created_at: nowISO(),
    })
    if (status === 'APPROVED') {
      for (let d = 0; d < days; d++) taken.add(addDays(startDate, d))
    }
  }

  // 0-2 hourly (زمنية) leaves, approved.
  const nHourly = ri(0, 2)
  for (let i = 0; i < nHourly; i++) {
    const date = pick(workingDays)
    if (taken.has(date)) continue
    leaves.push({
      id: genId('lea'),
      employee_id: emp.id,
      type: 'زمنية',
      start_date: date,
      end_date: date,
      days_count: 0,
      hours_count: ri(2, 6) / 2, // 1.0 .. 3.0 hours
      reason: pick(HOURLY_REASONS),
      status: 'APPROVED',
      approved_by: 'أحمد المدير',
      decision_note: pick(DECISION_OK),
      manager_question: null,
      question_answer: null,
      created_at: nowISO(),
    })
  }
}

// ---- attendance --------------------------------------------------------------
interface AttRow {
  id: string
  employee_id: string
  date: string
  status: string
  check_in: string | null
  check_out: string | null
  notes: string | null
}

const attendance: AttRow[] = []
for (const emp of employees) {
  const onLeave = leaveDaysByEmp.get(emp.id)!
  for (const date of workingDays) {
    if (onLeave.has(date)) {
      attendance.push({ id: genId('att'), employee_id: emp.id, date, status: 'LEAVE', check_in: null, check_out: null, notes: 'إجازة معتمدة' })
      continue
    }
    const roll = rnd()
    if (roll < 0.05) {
      attendance.push({ id: genId('att'), employee_id: emp.id, date, status: 'ABSENT', check_in: null, check_out: null, notes: null })
      continue
    }
    if (roll < 0.08) {
      attendance.push({ id: genId('att'), employee_id: emp.id, date, status: 'MISSION', check_in: null, check_out: null, notes: 'إيفاد رسمي' })
      continue
    }
    // Present: arrive 07:45-08:35, leave 15:50-16:45.
    const inMin = 7 * 60 + 45 + ri(0, 50)
    const outMin = 15 * 60 + 50 + ri(0, 55)
    attendance.push({
      id: genId('att'),
      employee_id: emp.id,
      date,
      status: 'PRESENT',
      check_in: `${pad(Math.floor(inMin / 60))}:${pad(inMin % 60)}`,
      check_out: `${pad(Math.floor(outMin / 60))}:${pad(outMin % 60)}`,
      notes: null,
    })
  }
}

// ---- write -------------------------------------------------------------------
const before = {
  attendance: (db.prepare(`SELECT COUNT(*) c FROM attendance`).get() as { c: number }).c,
  leave_requests: (db.prepare(`SELECT COUNT(*) c FROM leave_requests`).get() as { c: number }).c,
}

const insLeave = db.prepare(`
  INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, days_count, hours_count, reason, status, approved_by, decision_note, manager_question, question_answer, created_at)
  VALUES (@id, @employee_id, @type, @start_date, @end_date, @days_count, @hours_count, @reason, @status, @approved_by, @decision_note, @manager_question, @question_answer, @created_at)
`)
const insAtt = db.prepare(`
  INSERT INTO attendance (id, employee_id, date, status, check_in, check_out, notes, created_at)
  VALUES (@id, @employee_id, @date, @status, @check_in, @check_out, @notes, @created_at)
`)

db.transaction(() => {
  db.prepare(`DELETE FROM attendance`).run()
  db.prepare(`DELETE FROM leave_requests`).run()
  for (const l of leaves) insLeave.run(l)
  for (const a of attendance) insAtt.run({ ...a, created_at: nowISO() })
})()

logEvent({
  module: 'HR',
  action: 'CREATE',
  record_type: 'attendance',
  record_id: 'seed:hr:history',
  record_description: `توليد سجل الحضور والإجازات (${attendance.length} حضور، ${leaves.length} إجازة)`,
  old_values: before,
  new_values: { attendance: attendance.length, leave_requests: leaves.length },
})

const byStatus = (s: string) => leaves.filter((l) => l.status === s).length
console.log('\n✓ تم توليد سجل الحضور والإجازات\n')
console.log(`  الفترة: ${workingDays[0]} → ${workingDays[workingDays.length - 1]} (${workingDays.length} يوم عمل، الجمعة عطلة)`)
console.log(`  الحضور: ${attendance.length} سجلاً لـ ${employees.length} موظفاً`)
console.log(`  الإجازات: ${leaves.length} طلباً — معتمدة ${byStatus('APPROVED')}، مرفوضة ${byStatus('REJECTED')}، معلقة ${byStatus('PENDING')}`)
console.log('  ملاحظة: استيراد ملف بصمة لاحقاً سيحدّث أيام الحضور الفعلية دون حذف هذا السجل.\n')
