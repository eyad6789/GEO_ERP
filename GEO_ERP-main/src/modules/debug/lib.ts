// ============================================================================
// Debug module — shared mock-data generators, types & a real health-ping probe.
// Everything here is CLIENT-SIDE for the demo, except probeHealth() which
// performs a genuine fetch('/api/health') and measures round-trip latency.
// ============================================================================

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

export interface LogLine {
  id: number
  ts: Date
  level: LogLevel
  source: string
  message: string
}

export interface ApiCall {
  id: number
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  status: number
  ms: number
  size: string
  at: Date
  real?: boolean
}

export interface SlowQuery {
  id: number
  sql: string
  table: string
  rows: number
  ms: number
  calls: number
}

export interface ActiveUser {
  id: string
  name: string
  role: string
  page: string
  startedAt: Date
  ip: string
  color: string
}

/** Real, measured ping of the backend health endpoint. */
export async function probeHealth(): Promise<{ ms: number; ok: boolean }> {
  const t0 = performance.now()
  try {
    const res = await fetch('/api/health', { cache: 'no-store' })
    const ms = Math.round(performance.now() - t0)
    return { ms, ok: res.ok }
  } catch {
    return { ms: Math.round(performance.now() - t0), ok: false }
  }
}

/** Real, measured probe of an arbitrary endpoint (for the API inspector). */
export async function probeEndpoint(
  method: ApiCall['method'],
  endpoint: string,
): Promise<Omit<ApiCall, 'id'>> {
  const t0 = performance.now()
  let status = 0
  let size = '—'
  try {
    const res = await fetch(`/api${endpoint}`, { method, cache: 'no-store' })
    status = res.status
    const txt = await res.text()
    size = formatBytes(new Blob([txt]).size)
  } catch {
    status = 0
  }
  const ms = Math.round(performance.now() - t0)
  return { method, endpoint, status, ms, size, at: new Date(), real: true }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** "منذ 12 ث" / "12s ago" relative time helper. */
export function relTime(d: Date, lang: 'ar' | 'en'): string {
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (sec < 60) return lang === 'ar' ? `قبل ${sec} ث` : `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return lang === 'ar' ? `قبل ${min} د` : `${min}m ago`
  const hr = Math.round(min / 60)
  return lang === 'ar' ? `قبل ${hr} س` : `${hr}h ago`
}

/** hh:mm:ss.mmm timestamp for the console. */
export function stamp(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

export function durationSince(d: Date, lang: 'ar' | 'en'): string {
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  void lang
  return `${p(h)}:${p(m)}:${p(s)}`
}

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(arr: T[]): T => arr[rand(0, arr.length - 1)]

// ---- mock console lines -----------------------------------------------------
const LOG_TEMPLATES: { level: LogLevel; source: string; ar: string; en: string }[] = [
  { level: 'INFO', source: 'http', ar: 'GET /api/projects 200 خلال 42ms', en: 'GET /api/projects 200 in 42ms' },
  { level: 'INFO', source: 'auth', ar: 'تم تسجيل دخول المستخدم acc-iq-204', en: 'User acc-iq-204 signed in' },
  { level: 'DEBUG', source: 'cache', ar: 'إصابة الذاكرة المؤقتة: dashboard:co-001', en: 'cache HIT dashboard:co-001' },
  { level: 'DEBUG', source: 'sql', ar: 'تنفيذ: SELECT * FROM stock WHERE warehouse_id=?', en: 'exec: SELECT * FROM stock WHERE warehouse_id=?' },
  { level: 'WARN', source: 'pool', ar: 'مجمّع الاتصالات عند 82% من السعة', en: 'connection pool at 82% capacity' },
  { level: 'WARN', source: 'rate', ar: 'اقتراب من حد المعدل لـ /api/reports', en: 'rate-limit nearing for /api/reports' },
  { level: 'WARN', source: 'inventory', ar: 'صنف ITM-0142 تحت الحد الأدنى للمخزون', en: 'item ITM-0142 below min stock' },
  { level: 'ERROR', source: 'journal', ar: 'رفض القيد JE-2291: المدين ≠ الدائن', en: 'JE-2291 rejected: debit ≠ credit' },
  { level: 'ERROR', source: 'pdf', ar: 'فشل توليد PDF للأرشيف DOC-883', en: 'PDF generation failed for DOC-883' },
  { level: 'INFO', source: 'job', ar: 'اكتملت مهمة احتساب الرواتب payroll-2026-05', en: 'payroll-2026-05 job completed' },
  { level: 'DEBUG', source: 'i18n', ar: 'تحميل حزمة اللغة ar (٤١٢ مفتاح)', en: 'loaded locale bundle ar (412 keys)' },
  { level: 'INFO', source: 'backup', ar: 'بدء النسخ الاحتياطي التزايدي', en: 'incremental backup started' },
]

let logId = 1
export function seedLogs(n = 22): LogLine[] {
  const out: LogLine[] = []
  for (let i = 0; i < n; i++) {
    const tpl = pick(LOG_TEMPLATES)
    out.push({
      id: logId++,
      ts: new Date(Date.now() - (n - i) * rand(800, 4000)),
      level: tpl.level,
      source: tpl.source,
      message: i % 2 === 0 ? tpl.ar : tpl.en, // mix for realism; UI shows raw line
    })
  }
  return out
}

export function nextLog(): LogLine {
  const tpl = pick(LOG_TEMPLATES)
  return { id: logId++, ts: new Date(), level: tpl.level, source: tpl.source, message: `${tpl.ar} · ${tpl.en}` }
}

// ---- mock API inspector rows ------------------------------------------------
let apiId = 1
export function seedApiCalls(): ApiCall[] {
  const rows: { method: ApiCall['method']; endpoint: string; status: number; ms: number; size: string }[] = [
    { method: 'GET', endpoint: '/employees?company_id=co-001', status: 200, ms: 64, size: '18.4 KB' },
    { method: 'POST', endpoint: '/journal_entries', status: 201, ms: 132, size: '0.9 KB' },
    { method: 'GET', endpoint: '/reports/trial-balance', status: 200, ms: 1240, size: '6.1 KB' },
    { method: 'GET', endpoint: '/warehouse/stock-summary', status: 200, ms: 318, size: '12.7 KB' },
    { method: 'PUT', endpoint: '/projects/prj-014', status: 200, ms: 88, size: '1.2 KB' },
    { method: 'POST', endpoint: '/journal_entries', status: 400, ms: 47, size: '0.2 KB' },
    { method: 'GET', endpoint: '/reports/balance-sheet', status: 200, ms: 1683, size: '5.5 KB' },
    { method: 'DELETE', endpoint: '/notes/nt-552', status: 204, ms: 29, size: '—' },
  ]
  return rows.map((r, i) => ({
    id: apiId++,
    ...r,
    at: new Date(Date.now() - (rows.length - i) * rand(2000, 9000)),
  }))
}

export function nextApiId(): number {
  return apiId++
}

// ---- mock slow queries ------------------------------------------------------
export function seedQueries(): SlowQuery[] {
  return [
    { id: 1, sql: 'SELECT * FROM journal_lines JOIN accounts ON … GROUP BY account_code', table: 'journal_lines', rows: 18420, ms: 842, calls: 37 },
    { id: 2, sql: 'SELECT SUM(amount) FROM project_expenditures WHERE project_id=?', table: 'project_expenditures', rows: 6210, ms: 612, calls: 112 },
    { id: 3, sql: 'SELECT * FROM stock s JOIN items i ON s.item_id=i.id', table: 'stock', rows: 4980, ms: 538, calls: 64 },
    { id: 4, sql: 'SELECT * FROM attendance WHERE date BETWEEN ? AND ?', table: 'attendance', rows: 31200, ms: 1190, calls: 21 },
    { id: 5, sql: 'SELECT e.*, d.name_ar FROM employees e LEFT JOIN departments d …', table: 'employees', rows: 312, ms: 94, calls: 540 },
    { id: 6, sql: 'SELECT * FROM inventory_transactions ORDER BY date DESC LIMIT 50', table: 'inventory_transactions', rows: 50, ms: 41, calls: 88 },
    { id: 7, sql: 'SELECT code, SUM(debit-credit) FROM journal_lines GROUP BY code', table: 'journal_lines', rows: 240, ms: 705, calls: 18 },
    { id: 8, sql: 'SELECT * FROM payroll WHERE period=? AND company_id=?', table: 'payroll', rows: 298, ms: 167, calls: 73 },
  ]
}

// ---- mock active users ------------------------------------------------------
export function seedUsers(): ActiveUser[] {
  const colors = ['#1a5f7a', '#e8a838', '#2d9cdb', '#27ae60', '#9b59b6', '#e74c3c']
  const seed: Omit<ActiveUser, 'startedAt' | 'color'>[] = [
    { id: 'u1', name: 'علي حسين الجبوري', role: 'super_admin', page: '/dashboard', ip: '10.0.2.14' },
    { id: 'u2', name: 'سارة عبد الرحمن', role: 'accountant', page: '/accounting/journal', ip: '10.0.2.31' },
    { id: 'u3', name: 'مصطفى كاظم', role: 'warehouse_manager', page: '/inventory/stock', ip: '10.0.5.8' },
    { id: 'u4', name: 'ليلى الخفاجي', role: 'hr_manager', page: '/hr/employees', ip: '10.0.2.77' },
    { id: 'u5', name: 'Omar K. (API)', role: 'project_manager', page: '/projects/prj-014', ip: '192.168.1.42' },
    { id: 'u6', name: 'noor.dev', role: 'viewer', page: '/debug', ip: '127.0.0.1' },
  ]
  return seed.map((u, i) => ({
    ...u,
    color: colors[i % colors.length],
    startedAt: new Date(Date.now() - rand(120, 9800) * 1000),
  }))
}

/** Build the synthetic response-time series for the status line chart. */
export function buildSeries(latest: number | null): { t: string; ms: number }[] {
  const now = Date.now()
  const out: { t: string; ms: number }[] = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 60 * 1000)
    const base = 35 + Math.sin(i / 3) * 14 + rand(0, 22)
    const spike = i === 7 || i === 16 ? rand(40, 90) : 0
    out.push({ t: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, ms: Math.round(base + spike) })
  }
  if (latest !== null && out.length) out[out.length - 1].ms = latest
  return out
}
