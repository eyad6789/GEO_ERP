// ============================================================================
// Deterministic seed. Reproducible (fixed PRNG seed) — same DB every run.
// Guarantees: journal entries balance (Σdebit = Σcredit); stock = replayed
// inventory movements; all FKs reference seeded ids.
//   npm run seed
// ============================================================================
import { db, initSchema } from '../db/connection.js'
import { buildAccounts, postingAccounts } from './chartOfAccounts.js'

// ---- deterministic RNG (Mulberry32) ---------------------------------------
let _s = 0x9e3779b9
function rand(): number {
  _s |= 0
  _s = (_s + 0x6d2b79f5) | 0
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1))
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const chance = (p: number) => rand() < p

// ---- dates (anchored, deterministic) --------------------------------------
const BASE = new Date('2026-06-01T00:00:00Z')
const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => isoDay(new Date(BASE.getTime() - n * 86400000))
const isoNow = (n: number) => new Date(BASE.getTime() - n * 86400000).toISOString()

// ---- data pools ------------------------------------------------------------
const MALE = ['محمد', 'أحمد', 'علي', 'حسين', 'حسن', 'عمر', 'مصطفى', 'يوسف', 'إبراهيم', 'عبدالله', 'كرار', 'مرتضى', 'زيد', 'سيف', 'حيدر', 'باسم', 'رعد', 'عماد', 'ليث', 'وسام', 'أمير', 'فهد']
const FEMALE = ['زينب', 'فاطمة', 'مريم', 'نور', 'رغد', 'سارة', 'هدى', 'رنا', 'دعاء', 'شهد', 'آية', 'إسراء', 'تبارك', 'بان']
const FAMILY = ['العبيدي', 'الجبوري', 'الدليمي', 'التميمي', 'الزيدي', 'الساعدي', 'الموسوي', 'الحسيني', 'العزاوي', 'الربيعي', 'الخفاجي', 'الشمري', 'الكناني', 'البياتي', 'العامري', 'القيسي', 'الطائي', 'السوداني', 'الدراجي', 'الجنابي']
const MALE_EN = ['Mohammed', 'Ahmed', 'Ali', 'Hussein', 'Hassan', 'Omar', 'Mustafa', 'Yousif', 'Ibrahim', 'Abdullah', 'Karar', 'Murtadha', 'Zaid', 'Saif', 'Haidar', 'Basim', 'Raad', 'Imad', 'Laith', 'Wisam']
const FAMILY_EN = ['Al-Obaidi', 'Al-Juboori', 'Al-Dulaimi', 'Al-Tamimi', 'Al-Zaidi', 'Al-Saadi', 'Al-Mousawi', 'Al-Husseini', 'Al-Azzawi', 'Al-Rubaie', 'Al-Khafaji', 'Al-Shammari', 'Al-Kinani', 'Al-Bayati', 'Al-Amiri', 'Al-Qaisi', 'Al-Taie', 'Al-Sudani']
const CITIES = ['بغداد', 'البصرة', 'الموصل', 'أربيل', 'النجف', 'كربلاء', 'الناصرية', 'الديوانية', 'الحلة', 'الرمادي', 'كركوك', 'العمارة']
const COLORS = ['#1a5f7a', '#2d9cdb', '#e8a838', '#27ae60', '#e74c3c', '#9b59b6', '#16a085', '#34495e', '#d35400', '#2980b9', '#c0392b', '#8e44ad']

// Only the client's real companies. القبس is the parent (below); these are its
// subsidiaries.
const SUBS = [
  ['LARSA', 'لارسا', 'Larsa'],
  ['TAGHTIA', 'التغطية النفطية', 'Al-Taghtia Petroleum'],
  ['SBGREEN', 'سمو بغداد الخضراء', 'Sumow Baghdad Al-Khadhra'],
]

const DEPTS = ['الإدارة العامة', 'المالية والمحاسبة', 'الموارد البشرية', 'إدارة المشاريع', 'الهندسة والتصميم', 'المشتريات', 'المستودعات', 'تكنولوجيا المعلومات', 'الجودة والسلامة', 'الشؤون القانونية']
const DEPTS_EN = ['Administration', 'Finance & Accounting', 'Human Resources', 'Project Management', 'Engineering', 'Procurement', 'Warehousing', 'IT', 'Quality & Safety', 'Legal']
const TITLES = ['مدير عام', 'نائب المدير العام', 'مدير مالي', 'محاسب أول', 'محاسب', 'مدير موارد بشرية', 'مهندس مدني', 'مهندس معماري', 'مهندس مشروع', 'مدير مشروع', 'مساح', 'فني', 'أمين مستودع', 'مسؤول مشتريات', 'مراقب جودة', 'مسؤول سلامة', 'سكرتير', 'سائق', 'عامل بناء', 'كهربائي']

const ITEM_DEFS: [string, string, string, string][] = [
  ['إسمنت بورتلاندي', 'Portland Cement', 'مواد بناء', 'طن'],
  ['حديد تسليح 16مم', 'Rebar 16mm', 'مواد بناء', 'طن'],
  ['حديد تسليح 12مم', 'Rebar 12mm', 'مواد بناء', 'طن'],
  ['طابوق', 'Bricks', 'مواد بناء', 'قطعة'],
  ['رمل', 'Sand', 'مواد بناء', 'متر مكعب'],
  ['حصى', 'Gravel', 'مواد بناء', 'متر مكعب'],
  ['بلوك إسمنتي', 'Concrete Block', 'مواد بناء', 'قطعة'],
  ['جص', 'Gypsum', 'مواد بناء', 'كيس'],
  ['سيراميك أرضيات', 'Floor Ceramic', 'تشطيبات', 'متر مربع'],
  ['رخام', 'Marble', 'تشطيبات', 'متر مربع'],
  ['كيبل نحاس 4مم', 'Copper Cable 4mm', 'كهربائيات', 'لفة'],
  ['قاطع كهربائي', 'Circuit Breaker', 'كهربائيات', 'قطعة'],
  ['لوحة توزيع', 'Distribution Panel', 'كهربائيات', 'قطعة'],
  ['مصباح LED', 'LED Light', 'كهربائيات', 'قطعة'],
  ['مأخذ كهربائي', 'Power Socket', 'كهربائيات', 'قطعة'],
  ['أنابيب PVC 4 إنش', 'PVC Pipe 4"', 'صحيات', 'متر'],
  ['مغسلة', 'Sink', 'صحيات', 'قطعة'],
  ['خلاط ماء', 'Water Mixer', 'صحيات', 'قطعة'],
  ['سخان ماء', 'Water Heater', 'صحيات', 'قطعة'],
  ['مولدة كهرباء 100KVA', 'Generator 100KVA', 'معدات', 'قطعة'],
  ['مضخة ماء', 'Water Pump', 'معدات', 'قطعة'],
  ['خلاطة إسمنت', 'Cement Mixer', 'معدات', 'قطعة'],
  ['مثقاب كهربائي', 'Electric Drill', 'أدوات', 'قطعة'],
  ['منشار حديد', 'Steel Saw', 'أدوات', 'قطعة'],
  ['خوذة سلامة', 'Safety Helmet', 'أدوات السلامة', 'قطعة'],
  ['قفازات عمل', 'Work Gloves', 'أدوات السلامة', 'علبة'],
  ['أصباغ جدران', 'Wall Paint', 'تشطيبات', 'علبة'],
  ['عازل حراري', 'Thermal Insulation', 'مواد بناء', 'لفة'],
  ['زجاج سيكوريت', 'Tempered Glass', 'تشطيبات', 'متر مربع'],
  ['أبواب خشبية', 'Wooden Doors', 'تشطيبات', 'قطعة'],
]

// Only the client's real projects (from the handwritten list).
const PROJECT_DEFS: [string, string][] = [
  ['مشروع جولان', 'Jawlan Project'],
  ['مشروع خان ضاري', 'Khan Dhari Project'],
]

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
const MACHINERY = ['حفارة', 'شيول', 'رافعة برجية', 'شاحنة قلابة', 'خلاطة خرسانة', 'مضخة خرسانة', 'بلدوزر', 'مدحلة']
const LEAVE_TYPES = ['سنوية', 'مرضية', 'اضطرارية', 'أمومة', 'بدون راتب']
const OCCASIONS = ['عيد الفطر', 'عيد الأضحى', 'ترقية', 'مكافأة سنوية', 'مناسبة خاصة']
const CURR = 'IQD'

// ---- helpers ---------------------------------------------------------------
const pad = (n: number, w = 3) => String(n).padStart(w, '0')

function clearAll() {
  const tables = [
    'companies', 'departments', 'employees', 'attendance', 'leave_requests', 'advances', 'payroll',
    'gifts', 'performance_reviews', 'projects', 'project_milestones', 'project_machinery', 'project_staff',
    'project_expenditures', 'project_diagrams', 'warehouses', 'items', 'stock', 'inventory_transactions',
    'inventory_lines', 'accounts', 'journal_entries', 'journal_lines', 'banks', 'archive_documents', 'notes', 'event_logs',
  ]
  for (const t of tables) db.prepare(`DELETE FROM ${t}`).run()
}

function ins(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row)
  db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((k) => '@' + k).join(',')})`).run(row)
}

// ============================================================================
function seed() {
  initSchema()
  console.log('  · clearing tables')
  clearAll()

  // ---- Companies ----
  console.log('  · companies')
  const parentId = 'co-000'
  ins('companies', {
    id: parentId, code: 'QABAS', name_ar: 'القبس للمقاولات العامة المحدودة', name_en: 'Al-Qabas General Contracting Ltd.',
    type: 'PARENT', parent_id: null, registration_number: 'REG-2005-0001', tax_number: 'TAX-100000',
    address: 'المنصور - شارع الأميرات', city: 'بغداد', country: 'العراق', phone: '+964 770 000 0000',
    email: 'info@qabas.iq', website: 'www.qabas.iq', established_date: '2005-03-15',
    currency_primary: 'IQD', currency_secondary: 'USD', status: 'ACTIVE', logo_color: '#1a5f7a', created_at: isoNow(400),
  })
  // "General" bucket company — used by journal lines that have no company.
  ins('companies', {
    id: 'co-gen', code: 'GEN', name_ar: 'عام', name_en: 'General',
    type: 'SUBSIDIARY', parent_id: parentId, registration_number: '', tax_number: '',
    address: '', city: 'بغداد', country: 'العراق', phone: '', email: '', website: '',
    established_date: '2005-01-01', currency_primary: 'IQD', currency_secondary: 'USD',
    status: 'ACTIVE', logo_color: '#64748b', created_at: isoNow(400),
  })
  const companyIds = [parentId]
  SUBS.forEach((s, i) => {
    const id = `co-${pad(i + 1)}`
    companyIds.push(id)
    ins('companies', {
      id, code: s[0], name_ar: s[1], name_en: s[2], type: 'SUBSIDIARY', parent_id: parentId,
      registration_number: `REG-20${ri(8, 22)}-${pad(ri(1, 999), 4)}`, tax_number: `TAX-${ri(100000, 999999)}`,
      address: `${pick(['حي', 'منطقة', 'شارع'])} ${pick(['الجامعة', 'الصناعة', 'الكرادة', 'اليرموك', 'الجادرية'])}`,
      city: pick(CITIES), country: 'العراق', phone: `+964 7${ri(7, 9)}0 ${ri(100, 999)} ${ri(1000, 9999)}`,
      email: `info@${s[0].toLowerCase()}.iq`, website: `www.${s[0].toLowerCase()}.iq`,
      established_date: daysAgo(ri(700, 5000)), currency_primary: 'IQD',
      currency_secondary: chance(0.5) ? 'USD' : null, status: chance(0.92) ? 'ACTIVE' : 'INACTIVE',
      logo_color: COLORS[i % COLORS.length], created_at: isoNow(ri(200, 400)),
    })
  })
  const subIds = companyIds.slice(1)

  // ---- Departments ----
  console.log('  · departments')
  const deptIds: string[] = []
  const deptByCompany: Record<string, string[]> = {}
  let dseq = 0
  for (const cid of subIds) {
    deptByCompany[cid] = []
    const n = ri(3, 5)
    const chosen = [...DEPTS.keys()].sort(() => rand() - 0.5).slice(0, n)
    for (const di of chosen) {
      const id = `dep-${pad(++dseq)}`
      deptIds.push(id)
      deptByCompany[cid].push(id)
      ins('departments', {
        id, company_id: cid, name_ar: DEPTS[di], name_en: DEPTS_EN[di], parent_id: null,
        manager_id: null, created_at: isoNow(ri(100, 300)),
      })
    }
  }

  // ---- Employees (with manager hierarchy) ----
  console.log('  · employees')
  const empIds: string[] = []
  const empByCompany: Record<string, string[]> = {}
  let eseq = 0
  // one CEO at parent
  const ceoId = `emp-${pad(++eseq)}`
  empIds.push(ceoId)
  {
    const fam = ri(0, FAMILY.length - 1)
    ins('employees', {
      id: ceoId, employee_number: `EMP-${pad(eseq, 4)}`, national_id: `${ri(10, 29)}${ri(10000000, 99999999)}`,
      full_name_ar: `${pick(MALE)} ${pick(MALE)} ${FAMILY[fam]}`, full_name_en: `${pick(MALE_EN)} ${FAMILY_EN[fam % FAMILY_EN.length]}`,
      photo_color: pick(COLORS), dob: daysAgo(ri(16000, 20000)), place_of_birth: 'بغداد', nationality: 'عراقي',
      religion: 'مسلم', gender: 'MALE', marital_status: 'متزوج', children_count: ri(2, 5),
      phone_primary: `+964 770 ${ri(100, 999)} ${ri(1000, 9999)}`, phone_secondary: '', email_work: 'ceo@geo-group.iq',
      email_personal: '', address: 'بغداد - المنصور', emergency_name: '', emergency_phone: '',
      company_id: parentId, department_id: null, job_title: 'الرئيس التنفيذي', employment_type: 'FULL',
      hire_date: daysAgo(ri(3000, 5000)), contract_end_date: null, status: 'ACTIVE', manager_id: null,
      basic_salary: ri(4000, 6000) * 1000, salary_currency: CURR, bank_name: 'مصرف الرافدين',
      bank_account: `${ri(100000, 999999)}`, iban: `IQ${ri(10, 99)}RAFD${ri(100000000, 999999999)}`, created_at: isoNow(400),
    })
  }

  for (const cid of subIds) {
    empByCompany[cid] = []
    // company manager
    const mgrId = `emp-${pad(++eseq)}`
    empIds.push(mgrId)
    empByCompany[cid].push(mgrId)
    const famM = ri(0, FAMILY.length - 1)
    ins('employees', mkEmp(mgrId, eseq, cid, null, ceoId, 'مدير عام', famM, true))
    db.prepare('UPDATE departments SET manager_id=? WHERE id IN (SELECT id FROM departments WHERE company_id=? LIMIT 1)').run(mgrId, cid)

    const count = ri(5, 9)
    for (let k = 0; k < count; k++) {
      const id = `emp-${pad(++eseq)}`
      empIds.push(id)
      empByCompany[cid].push(id)
      const dep = pick(deptByCompany[cid])
      const fam = ri(0, FAMILY.length - 1)
      ins('employees', mkEmp(id, eseq, cid, dep, mgrId, pick(TITLES), fam, false))
    }
    // assign a manager to each department
    for (const dep of deptByCompany[cid]) {
      const cand = empByCompany[cid][ri(0, empByCompany[cid].length - 1)]
      db.prepare('UPDATE departments SET manager_id=? WHERE id=?').run(cand, dep)
    }
  }

  function mkEmp(id: string, seq: number, cid: string, dep: string | null, mgr: string | null, title: string, fam: number, senior: boolean) {
    const female = chance(0.18)
    const first = female ? pick(FEMALE) : pick(MALE)
    return {
      id, employee_number: `EMP-${pad(seq, 4)}`, national_id: `${ri(10, 29)}${ri(10000000, 99999999)}`,
      full_name_ar: `${first} ${pick(MALE)} ${FAMILY[fam]}`,
      full_name_en: `${pick(MALE_EN)} ${FAMILY_EN[fam % FAMILY_EN.length]}`,
      photo_color: pick(COLORS), dob: daysAgo(ri(8000, 18000)), place_of_birth: pick(CITIES), nationality: 'عراقي',
      religion: 'مسلم', gender: female ? 'FEMALE' : 'MALE', marital_status: chance(0.7) ? 'متزوج' : 'أعزب',
      children_count: chance(0.7) ? ri(1, 4) : 0, phone_primary: `+964 7${ri(7, 9)}0 ${ri(100, 999)} ${ri(1000, 9999)}`,
      phone_secondary: '', email_work: `emp${seq}@geo-group.iq`, email_personal: '',
      address: `${pick(CITIES)} - ${pick(['حي العسكري', 'حي الجامعة', 'المركز', 'حي الزهور'])}`,
      emergency_name: `${pick(MALE)} ${FAMILY[fam]}`, emergency_phone: `+964 770 ${ri(100, 999)} ${ri(1000, 9999)}`,
      company_id: cid, department_id: dep, job_title: title, employment_type: pick(['FULL', 'FULL', 'FULL', 'CONTRACT', 'PART']),
      hire_date: daysAgo(ri(100, 2500)), contract_end_date: chance(0.3) ? daysAgo(-ri(100, 700)) : null,
      status: chance(0.9) ? 'ACTIVE' : pick(['ON_LEAVE', 'SUSPENDED']), manager_id: mgr,
      basic_salary: (senior ? ri(2000, 3500) : ri(700, 1800)) * 1000, salary_currency: CURR,
      bank_name: pick(['مصرف الرافدين', 'مصرف الرشيد', 'المصرف التجاري العراقي', 'مصرف بغداد']),
      bank_account: `${ri(100000, 999999)}`, iban: `IQ${ri(10, 99)}BANK${ri(100000000, 999999999)}`, created_at: isoNow(ri(50, 300)),
    }
  }

  // ---- HR sub-records ----
  console.log('  · HR records (attendance, leave, advances, payroll, gifts, performance)')
  const activeEmps = empIds.slice(1) // exclude CEO from bulk records
  let seqA = 0
  for (const e of activeEmps.slice(0, 30)) {
    for (let d = 0; d < 24; d++) {
      const st = chance(0.86) ? 'PRESENT' : pick(['ABSENT', 'LEAVE', 'MISSION', 'HOLIDAY'])
      ins('attendance', {
        id: `att-${pad(++seqA, 5)}`, employee_id: e, date: daysAgo(d + 1), status: st,
        check_in: st === 'PRESENT' ? `0${ri(7, 8)}:${pad(ri(0, 59), 2)}` : null,
        check_out: st === 'PRESENT' ? `1${ri(5, 7)}:${pad(ri(0, 59), 2)}` : null, notes: '', created_at: isoNow(d + 1),
      })
    }
  }
  let seqL = 0
  for (const e of activeEmps.slice(0, 35)) {
    if (!chance(0.7)) continue
    const days = ri(1, 14)
    const start = ri(2, 120)
    ins('leave_requests', {
      id: `lv-${pad(++seqL)}`, employee_id: e, type: pick(LEAVE_TYPES), start_date: daysAgo(start),
      end_date: daysAgo(start - days), days_count: days, reason: pick(['ظروف عائلية', 'سفر', 'مرض', 'مناسبة', 'راحة سنوية']),
      status: pick(['PENDING', 'APPROVED', 'APPROVED', 'REJECTED']), approved_by: pick(empIds), created_at: isoNow(start),
    })
  }
  let seqAdv = 0
  for (const e of activeEmps.slice(0, 30)) {
    if (!chance(0.5)) continue
    const amount = ri(500, 3000) * 1000
    const monthly = Math.round(amount / ri(3, 10))
    const paid = ri(0, amount)
    ins('advances', {
      id: `adv-${pad(++seqAdv)}`, employee_id: e, date: daysAgo(ri(20, 200)), amount, currency: CURR,
      reason: pick(['ظرف طارئ', 'مصاريف علاج', 'مناسبة', 'سلفة شهرية']), monthly_deduction: monthly,
      status: pick(['APPROVED', 'REPAYING', 'REPAYING', 'SETTLED', 'PENDING']),
      balance_remaining: amount - paid, created_at: isoNow(ri(20, 200)),
    })
  }
  let seqP = 0
  const periods = ['2026-03', '2026-04', '2026-05']
  for (const e of activeEmps.slice(0, 45)) {
    const emp = db.prepare('SELECT basic_salary FROM employees WHERE id=?').get(e) as { basic_salary: number }
    for (const per of periods) {
      const basic = emp.basic_salary
      const housing = Math.round(basic * 0.15), transport = Math.round(basic * 0.08), phone = 50000
      const overtime = chance(0.4) ? ri(50, 300) * 1000 : 0
      const dedAbs = chance(0.3) ? ri(20, 150) * 1000 : 0
      const dedAdv = chance(0.3) ? ri(100, 400) * 1000 : 0
      const net = basic + housing + transport + phone + overtime - dedAbs - dedAdv
      ins('payroll', {
        id: `pay-${pad(++seqP, 4)}`, employee_id: e, period: per, basic_salary: basic, housing_allowance: housing,
        transport_allowance: transport, phone_allowance: phone, overtime, deductions_absence: dedAbs,
        deductions_advance: dedAdv, other_deductions: 0, net_salary: net, currency: CURR, status: 'مدفوع', created_at: isoNow(10),
      })
    }
  }
  let seqG = 0
  for (const e of activeEmps.slice(0, 25)) {
    if (!chance(0.6)) continue
    ins('gifts', {
      id: `gft-${pad(++seqG)}`, employee_id: e, date: daysAgo(ri(10, 250)), occasion: pick(OCCASIONS),
      type: pick(['CASH', 'CASH', 'IN_KIND', 'VOUCHER']), value: ri(100, 800) * 1000, currency: CURR,
      description: pick(['هدية بمناسبة العيد', 'مكافأة أداء متميز', 'هدية ترقية', 'قسيمة شرائية']),
      given_by: ceoId, created_at: isoNow(ri(10, 250)),
    })
  }
  let seqPerf = 0
  for (const e of activeEmps.slice(0, 30)) {
    if (!chance(0.6)) continue
    const cats = { 'الالتزام': ri(3, 5), 'الجودة': ri(3, 5), 'التعاون': ri(3, 5), 'المبادرة': ri(2, 5), 'الإنتاجية': ri(3, 5) }
    const overall = Math.round((Object.values(cats).reduce((a, b) => a + b, 0) / 5) * 10) / 10
    ins('performance_reviews', {
      id: `prf-${pad(++seqPerf)}`, employee_id: e, period: '2025 - السنوي', rating_overall: overall,
      ratings_json: JSON.stringify(cats), manager_comments: pick(['أداء ممتاز ومستوى عالٍ من الالتزام', 'يحتاج لتطوير مهارات إدارة الوقت', 'موظف متميز ومتعاون', 'أداء جيد بشكل عام']),
      goals: 'تطوير المهارات الفنية وزيادة الإنتاجية للعام القادم', created_at: isoNow(30),
    })
  }

  // ---- Projects + sub-records ----
  console.log('  · projects (+ milestones, machinery, staff, expenditures, diagrams)')
  const projectIds: string[] = []
  PROJECT_DEFS.forEach((p, i) => {
    const id = `prj-${pad(i + 1)}`
    projectIds.push(id)
    const cid = pick(subIds)
    const status = PROJECT_STATUSES[i % PROJECT_STATUSES.length]
    const start = ri(60, 600)
    const dur = ri(180, 720)
    const progress = status === 'COMPLETED' ? 100 : status === 'PLANNING' ? ri(0, 10) : status === 'CANCELLED' ? ri(10, 60) : ri(20, 90)
    const mgr = pick(empByCompany[cid] ?? empIds)
    ins('projects', {
      id, code: `PRJ-${pad(i + 1)}`, name_ar: p[0], name_en: p[1], company_id: cid,
      client: pick(['أمانة بغداد', 'وزارة الإعمار', 'وزارة الصحة', 'وزارة التربية', 'مجلس المحافظة', 'القطاع الخاص', 'وزارة الكهرباء']),
      contract_number: `CON-2026-${pad(ri(100, 999))}`, contract_value: ri(500, 8000) * 1000000, currency: CURR,
      start_date: daysAgo(start), end_date: daysAgo(start - dur),
      actual_end_date: status === 'COMPLETED' ? daysAgo(start - dur + ri(-30, 30)) : null, status,
      manager_id: mgr, location: pick(CITIES), description: `مشروع ${p[0]} ضمن خطة التطوير العمراني`, progress,
      created_at: isoNow(start),
    })

    // milestones
    const mCount = ri(4, 6)
    for (let m = 0; m < mCount; m++) {
      const ms = start - Math.round((dur / mCount) * m)
      ins('project_milestones', {
        id: `mil-${id}-${m}`, project_id: id, name_ar: pick(['الأعمال الترابية', 'الأساسات', 'الهيكل الإنشائي', 'الأعمال الكهربائية', 'الأعمال الصحية', 'التشطيبات', 'التسليم النهائي']) + ` - مرحلة ${m + 1}`,
        start_date: daysAgo(ms), end_date: daysAgo(ms - Math.round(dur / mCount)),
        percent_complete: m === 0 ? 100 : Math.max(0, Math.min(100, progress - m * 15 + ri(-10, 10))),
        depends_on: m > 0 ? `mil-${id}-${m - 1}` : null, created_at: isoNow(ms),
      })
    }
    // machinery
    for (let mc = 0; mc < ri(2, 5); mc++) {
      ins('project_machinery', {
        id: `mch-${id}-${mc}`, project_id: id, code: `MCH-${ri(100, 999)}`, name_ar: pick(MACHINERY), type: pick(['ثقيلة', 'متوسطة', 'خفيفة']),
        operator_id: pick(empByCompany[cid] ?? empIds), assigned_date: daysAgo(start - ri(0, 30)),
        return_date: status === 'COMPLETED' ? daysAgo(start - dur) : null, hours_worked: ri(100, 2000),
        fuel_consumed: ri(500, 8000), status: pick(['تعمل', 'تعمل', 'صيانة', 'متوقفة']), created_at: isoNow(start),
      })
    }
    // staff
    const team = (empByCompany[cid] ?? empIds).slice(0, ri(3, 6))
    team.forEach((e, ti) => {
      ins('project_staff', {
        id: `pst-${id}-${ti}`, project_id: id, employee_id: e, project_role: pick(['مدير موقع', 'مهندس تنفيذ', 'مشرف', 'فني', 'عامل']),
        start_date: daysAgo(start), end_date: status === 'COMPLETED' ? daysAgo(start - dur) : null, status: 'نشط', created_at: isoNow(start),
      })
    })
    // expenditures
    for (let ex = 0; ex < ri(6, 12); ex++) {
      ins('project_expenditures', {
        id: `exp-${id}-${ex}`, project_id: id, serial_number: `SER-${pad(ex + 1, 6)}`, doc_number: `EXP-${cid.slice(-2)}-2026-${pad(ex + 1, 4)}`,
        date: daysAgo(ri(1, start)), category: pick(['مواد', 'عمالة', 'معدات', 'إداري', 'نقل', 'أخرى']),
        description: pick(['شراء مواد بناء', 'أجور عمال يومية', 'إيجار معدات', 'وقود وزيوت', 'مصاريف نقل', 'مصاريف إدارية']),
        amount: ri(2, 80) * 1000000, currency: CURR, paid_to: pick(['مورد محلي', 'مقاول ثانوي', 'شركة تأجير', 'عمالة']),
        payment_method: pick(['نقد', 'تحويل بنكي', 'صك']), approved_by: mgr, created_at: isoNow(ri(1, start)),
      })
    }
    // diagrams
    for (let dg = 0; dg < ri(3, 4); dg++) {
      ins('project_diagrams', {
        id: `dgm-${id}-${dg}`, project_id: id, name_ar: pick(['مخطط معماري', 'مخطط إنشائي', 'مخطط كهربائي', 'مخطط صحي', 'مخطط الموقع العام']),
        version: `v${ri(1, 3)}.${ri(0, 9)}`, file_type: pick(['PDF', 'DWG', 'PNG']), comments_count: ri(0, 12),
        uploaded_at: daysAgo(ri(1, start)), created_at: isoNow(ri(1, start)),
      })
    }
  })

  // ---- Warehouses + items + stock + transactions ----
  console.log('  · warehouse (items, stock, transactions)')
  ins('warehouses', { id: 'WH-01', name_ar: 'مستودع أبو غريب', location: 'أبو غريب', created_at: isoNow(400) })
  ins('warehouses', { id: 'WH-02', name_ar: 'مستودع الدورة', location: 'الدورة - بغداد', created_at: isoNow(400) })

  const itemIds: string[] = []
  const itemMeta: Record<string, { uom: string; cost: number }> = {}
  ITEM_DEFS.forEach((it, i) => {
    const id = `itm-${pad(i + 1)}`
    itemIds.push(id)
    const cost = ri(10, 500) * 1000
    itemMeta[id] = { uom: it[3], cost }
    ins('items', {
      id, code: `ITM-${pad(i + 1, 4)}`, name_ar: it[0], name_en: it[1], category: it[2], sub_category: '',
      uom: it[3], min_stock: ri(20, 100), max_stock: ri(500, 2000), shelf_location: `${pick(['A', 'B', 'C', 'D'])}-${ri(1, 20)}`,
      description: `${it[0]} - صنف ${it[2]}`, unit_cost: cost, currency: CURR, created_at: isoNow(ri(100, 300)),
    })
  })

  // stock map: itemId -> { WH-01, WH-02 }
  const stockMap: Record<string, Record<string, number>> = {}
  for (const id of itemIds) stockMap[id] = { 'WH-01': 0, 'WH-02': 0 }

  let invSeq = 0
  function txn(type: string, wh: string, fromWh: string | null, lines: { item: string; qty: number }[], dayOffset: number) {
    const id = `inv-${pad(++invSeq, 5)}`
    let total = 0
    const lineRows = lines.map((l) => {
      const price = itemMeta[l.item].cost
      const t = l.qty * price
      total += t
      return { id: `invl-${id}-${l.item}`, transaction_id: id, item_id: l.item, quantity: l.qty, uom: itemMeta[l.item].uom, unit_price: price, total: t }
    })
    ins('inventory_transactions', {
      id, serial_number: `SER-${pad(invSeq, 6)}`, doc_number: `${type}-2026-${pad(invSeq, 4)}`, date: daysAgo(dayOffset),
      type, warehouse_id: wh, from_warehouse_id: fromWh, company_id: pick(subIds), project_id: chance(0.5) ? pick(projectIds) : null,
      currency: CURR, total_value: total, approved_by: pick(empIds), notes: '', created_at: isoNow(dayOffset),
    })
    for (const lr of lineRows) ins('inventory_lines', lr)
    // apply deltas
    for (const l of lines) {
      if (type === 'IN' || type === 'RETURN') stockMap[l.item][wh] += l.qty
      else if (type === 'OUT') stockMap[l.item][wh] -= l.qty
      else if (type === 'ADJUST') stockMap[l.item][wh] += l.qty
      else if (type === 'TRANSFER') { stockMap[l.item][fromWh!] -= l.qty; stockMap[l.item][wh] += l.qty }
    }
  }

  // opening stock for every item
  for (const id of itemIds) txn('IN', 'WH-01', null, [{ item: id, qty: ri(200, 1200) }], 300)
  for (const id of itemIds) if (chance(0.6)) txn('IN', 'WH-02', null, [{ item: id, qty: ri(100, 600) }], 295)
  // ongoing movements
  for (let k = 0; k < 160; k++) {
    const type = pick(['OUT', 'OUT', 'OUT', 'IN', 'TRANSFER', 'RETURN', 'ADJUST'])
    const day = ri(1, 290)
    const nLines = ri(1, 3)
    const lines = Array.from({ length: nLines }, () => ({ item: pick(itemIds), qty: ri(5, 80) }))
    // dedup items in lines
    const seen = new Set<string>()
    const uniq = lines.filter((l) => (seen.has(l.item) ? false : (seen.add(l.item), true)))
    if (type === 'TRANSFER') txn('TRANSFER', 'WH-02', 'WH-01', uniq, day)
    else if (type === 'ADJUST') txn('ADJUST', chance(0.5) ? 'WH-01' : 'WH-02', null, uniq.map((l) => ({ item: l.item, qty: chance(0.5) ? l.qty : -l.qty })), day)
    else txn(type, chance(0.6) ? 'WH-01' : 'WH-02', null, uniq, day)
  }
  // Drain the last 5 items via real OUT transactions so the low-stock alert has
  // data (keeps stock = replayed-movements consistent).
  for (const id of itemIds.slice(-5)) {
    if (stockMap[id]['WH-01'] > 8) txn('OUT', 'WH-01', null, [{ item: id, qty: stockMap[id]['WH-01'] - ri(0, 8) }], ri(1, 20))
    if (stockMap[id]['WH-02'] > 0) txn('OUT', 'WH-02', null, [{ item: id, qty: stockMap[id]['WH-02'] }], ri(1, 20))
  }

  // write final stock (clamp negatives to 0 for display sanity)
  let stkSeq = 0
  for (const id of itemIds) {
    for (const wh of ['WH-01', 'WH-02']) {
      ins('stock', { id: `stk-${pad(++stkSeq, 4)}`, item_id: id, warehouse_id: wh, quantity: Math.max(0, stockMap[id][wh]) })
    }
  }

  // ---- Accounts ----
  console.log('  · chart of accounts')
  for (const a of buildAccounts()) {
    ins('accounts', { code: a.code, name_ar: a.name_ar, name_en: a.name_en, type: a.type, normal_balance: a.normal_balance, parent_code: a.parent_code, level: a.level, is_posting: a.is_posting, sort_order: a.sort_order })
  }

  // ---- Banks (from the client's list — dual-currency IQD/USD) ----
  console.log('  · banks')
  const BANKS: Array<[string, string]> = [
    ['مصرف بغداد', 'Bank of Baghdad'],
    ['مصرف الاتحاد', 'Union Bank of Iraq'],
    ['مصرف الرشيد', 'Al-Rasheed Bank'],
  ]
  // المصارف (183) becomes a header; each bank is a posting sub-account under it.
  db.prepare(`UPDATE accounts SET is_posting = 0 WHERE code = '183'`).run()
  BANKS.forEach(([ar, en], i) => {
    const iqd = ri(50, 900) * 1000000
    const usd = ri(10, 300) * 1000
    const acctCode = `183${pad(i + 1, 2)}`
    ins('accounts', {
      code: acctCode, name_ar: ar, name_en: en, type: 'ASSET', normal_balance: 'DEBIT',
      parent_code: '183', level: 4, is_posting: 1, sort_order: 1000 + i, archived: 0,
    })
    ins('banks', {
      id: `bank-${pad(i + 1, 3)}`, name_ar: ar, name_en: en,
      account_number: `${ri(1000, 9999)}-${ri(100000, 999999)}`, branch: pick(['الفرع الرئيسي', 'فرع المنصور', 'فرع الكرادة']),
      company_id: pick(subIds), opening_balance_iqd: iqd, opening_balance_usd: usd,
      balance_iqd: iqd, balance_usd: usd, status: 'ACTIVE', account_code: acctCode, created_at: isoNow(ri(100, 380)),
    })
  })


  // ---- Archive ----
  console.log('  · archive documents')
  const ARCH: [string, number][] = [['CV', 12], ['MESSAGE', 14], ['EMAIL_EXT', 12], ['EMAIL_INT', 12], ['NEWS', 10], ['FINANCIAL', 14]]
  let arSeq = 0
  for (const [type, n] of ARCH) {
    for (let k = 0; k < n; k++) {
      const cid = pick(companyIds)
      arSeq++
      const base: Record<string, unknown> = {
        id: `arc-${pad(arSeq, 4)}`, doc_type: type, title: '', ref_number: `REF-${type.slice(0, 3)}-${pad(arSeq, 4)}`,
        date: daysAgo(ri(1, 300)), company_id: cid, project_id: chance(0.3) ? pick(projectIds) : null,
        from_party: '', to_party: '', cc: '', subject: '', body: '', category: '', author: pick(MALE),
        amount: null, currency: null, doc_status: 'مؤرشف', tags: '', attachments_count: ri(0, 4), created_at: isoNow(ri(1, 300)),
      }
      if (type === 'CV') { base.title = `السيرة الذاتية - ${pick(MALE)} ${pick(FAMILY)}`; base.category = pick(['مهندس', 'محاسب', 'إداري', 'فني']); base.tags = 'توظيف,سيرة ذاتية' }
      else if (type === 'MESSAGE') { base.title = pick(['تعميم داخلي', 'إشعار اجتماع', 'تنبيه إداري']); base.subject = base.title; base.from_party = 'الإدارة'; base.to_party = 'كافة الأقسام'; base.body = 'يرجى الاطلاع والعمل بموجبه.' }
      else if (type === 'EMAIL_EXT') { base.title = pick(['عرض سعر مورد', 'مراسلة عميل', 'استفسار مناقصة']); base.subject = base.title; base.from_party = pick(['شركة موردة', 'العميل', 'جهة حكومية']); base.to_party = 'قسم المشتريات'; base.doc_status = pick(['معلق', 'تم الرد', 'مؤرشف']) }
      else if (type === 'EMAIL_INT') { base.title = pick(['مذكرة داخلية', 'تعميم رسمي', 'كتاب إداري']); base.ref_number = `INT-2026-${pad(arSeq, 4)}`; base.subject = base.title; base.from_party = pick(DEPTS); base.to_party = pick(DEPTS) }
      else if (type === 'NEWS') { base.title = pick(['إنجاز مشروع جديد', 'توقيع عقد استراتيجي', 'حصول الشركة على شهادة الجودة', 'افتتاح فرع جديد']); base.category = pick(['إنجازات', 'عقود', 'فعاليات']); base.body = 'خبر سار للمجموعة ضمن مسيرة النجاح.' }
      else if (type === 'FINANCIAL') { base.title = pick(['فاتورة شراء', 'إيصال قبض', 'عقد مقاولة', 'كشف حساب']); base.amount = ri(5, 500) * 1000000; base.currency = CURR; base.category = pick(['فواتير', 'إيصالات', 'عقود']) }
      ins('archive_documents', base)
    }
  }

  // ---- Notes ----
  console.log('  · notes')
  let ntSeq = 0
  const noteTargets: [string, string][] = [
    ['projects', projectIds[0]], ['projects', projectIds[1]], ['employees', empIds[2]],
    ['companies', subIds[0]], ['items', itemIds[3]], ['journal_entries', 'je-0001'],
  ]
  for (const [rt, rid] of noteTargets) {
    ins('notes', {
      id: `nt-${pad(++ntSeq)}`, module_id: rt, record_type: rt, record_id: rid,
      content: pick(['ملاحظة خاصة: يحتاج للمتابعة الأسبوع القادم.', 'تم التنسيق مع الإدارة بهذا الخصوص.', 'مراجعة المستندات قبل الاعتماد النهائي.']),
      visibility: pick(['PRIVATE', 'RESTRICTED', 'PUBLIC']), author: 'أحمد المدير', pinned: chance(0.3) ? 1 : 0, created_at: isoNow(ri(1, 30)),
    })
  }

  // ---- Event logs ----
  console.log('  · event logs')
  const MODULES = ['ACCOUNTING', 'HR', 'WAREHOUSE', 'PROJECTS', 'COMPANIES', 'ARCHIVE']
  const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'PRINT', 'LOGIN']
  let lgSeq = 0
  for (let k = 0; k < 120; k++) {
    const mod = pick(MODULES)
    ins('event_logs', {
      id: `log-${pad(++lgSeq, 4)}`, timestamp: isoNow(ri(0, 60)), user_name: pick(['أحمد المدير', 'علي المحاسب', 'زينب الموارد', 'حسين المخزن']),
      user_role: pick(['super_admin', 'accountant', 'hr_manager', 'warehouse_manager']), company_id: pick(companyIds),
      module: mod, action: pick(ACTIONS), record_type: pick(['journal_entries', 'employees', 'items', 'projects']),
      record_id: `rec-${ri(1, 999)}`, record_description: pick(['إنشاء قيد محاسبي', 'تعديل بيانات موظف', 'إضافة حركة مخزنية', 'تحديث مشروع', 'تصدير تقرير']),
      ip_address: `192.168.1.${ri(2, 254)}`, device: pick(['Desktop', 'Laptop', 'Mobile']), browser: pick(['Chrome', 'Firefox', 'Edge']),
      status: chance(0.9) ? 'SUCCESS' : pick(['WARNING', 'FAILED']), old_values: null, new_values: null, error_message: null,
    })
  }

  // counts
  const c = (t: string) => (db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n
  console.log('\n  ✓ seeded:')
  for (const t of ['companies', 'departments', 'employees', 'projects', 'accounts', 'journal_entries', 'journal_lines', 'items', 'inventory_transactions', 'archive_documents', 'event_logs'])
    console.log(`     ${t.padEnd(24)} ${c(t)}`)
}

const run = db.transaction(seed)
run()
console.log('\n  ✅ Seed complete → server/data/erp.db\n')
