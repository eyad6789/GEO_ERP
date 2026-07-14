// ============================================================================
// Deterministic seed. Reproducible (fixed PRNG seed) — same DB every run.
// Guarantees: journal entries balance (Σdebit = Σcredit); stock = replayed
// inventory movements; all FKs reference seeded ids.
//   npm run seed
// ============================================================================
import { db, initSchema, ensureVehicleAccounts } from '../db/connection.js'
import { buildAccounts, postingAccounts } from './chartOfAccounts.js'
import { FLEET_ROWS } from './fleetData.js'
import { seedWarehouseData } from './warehouseSeeder.js'

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
  ['QABASOIL', 'شركة القبس للخدمات النفطية المحدودة', 'AlQabas Oil Services Co. Ltd.'],
  ['URANUSTA', 'شركة اورانوس للوكالات التجارية المحدودة', 'Uranus Trading Agencies Co. Ltd.'],
  ['LARSA', 'شركة لارسا للاستشارات الهندسية والتجارة', 'Larsa for Engineering Consultations & Trade Co.'],
  ['SOILTECH', 'شركة تقنيات التربة للمقاولات والتجارة المحدودة', 'Soil Technique Contracting & Trading Co. Ltd.'],
  ['URANUSINT', 'شركة أورانوس المتكاملة للمقاولات والتجارة', 'Uranus Integrated Cont. & Trade L.L.C'],
  ['BAGHKHAD', 'شركة بغداد الخضراء للمقاولات والتجارة العامة المحدودة', 'Baghdad Al-Khadra Cont. & General Trad. Co. Ltd.'],
  ['SBK', 'شركة سمو بغداد الخضراء للتجارة والمقاولات المحدودة', 'Sumoh Baghdad Al-Khadra Trading & Contracting Co.'],
  ['ASADBABEL', 'شركة اسد بابل لتكنولوجيا البناء', 'Asad Babel for Construction Technology'],
  ['ENGPLAST', 'الشركة الهندسية للصناعات البلاستيكية', 'Engineering Plastic Industrial Co.'],
  ['JANAN', 'مكتب الجنان العلمي', 'Al-Janan Scientific Bureau'],
  ['SAMAQTR', 'سما قطر', 'Sama Qatar'],
  ['HADARA', 'حضارة ما بين النهرين', 'Mesopotamia Civilization'],
]

const DEPTS = ['الإدارة العامة', 'المالية والمحاسبة', 'الموارد البشرية', 'إدارة المشاريع', 'الهندسة والتصميم', 'المشتريات', 'المستودعات', 'تكنولوجيا المعلومات', 'الجودة والسلامة', 'الشؤون القانونية']
const DEPTS_EN = ['Administration', 'Finance & Accounting', 'Human Resources', 'Project Management', 'Engineering', 'Procurement', 'Warehousing', 'IT', 'Quality & Safety', 'Legal']
const TITLES = ['مدير عام', 'نائب المدير العام', 'مدير مالي', 'محاسب أول', 'محاسب', 'مدير موارد بشرية', 'مهندس مدني', 'مهندس معماري', 'مهندس مشروع', 'مدير مشروع', 'مساح', 'فني', 'أمين مستودع', 'مسؤول مشتريات', 'مراقب جودة', 'مسؤول سلامة', 'سكرتير', 'سائق', 'عامل بناء', 'كهربائي']


// The client's real projects. The first 3 are ACTIVE construction sites that get
// vehicles; the last 3 are master-plan sites (PLANNING) shown as map pins only.
// [name_ar, name_en, location, lat, lng, status]. Order is stable: prj-001 = جلولاء …
const PROJECT_DEFS: [string, string, string, number, number, string][] = [
  ['مشروع جلولاء', 'Jalawla Project', 'جلولاء - ديالى', 34.27, 45.15, 'ACTIVE'],
  ['مشروع خان ضاري', 'Khan Dhari Project', 'خان ضاري - بغداد', 33.36, 43.78, 'ACTIVE'],
  ['مشروع اليرموك', 'Al-Yarmouk Project', 'اليرموك - بغداد', 33.295, 44.336, 'ACTIVE'],
  ['مخطط واسط الرئيسي', 'Wasit Master Plan', 'واسط - الكوت', 32.512, 45.818, 'PLANNING'],
  ['مخطط المثنى الرئيسي', 'Muthanna Master Plan', 'المثنى - السماوة', 31.318, 45.281, 'PLANNING'],
  ['مخطط ميسان الرئيسي', 'Maysan Master Plan', 'ميسان - العمارة', 31.836, 47.144, 'PLANNING'],
]
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
    'project_expenditures', 'project_diagrams', 'vehicles', 'vehicle_costs', 'warehouses', 'items', 'stock', 'inventory_transactions',
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
    const status = p[5]
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
      manager_id: mgr, location: p[2], lat: p[3], lng: p[4], description: `مشروع ${p[0]} ضمن خطة التطوير العمراني`, progress,
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

  // ---- Vehicles + costs (Fleet module) ----
  console.log('  · vehicles + vehicle costs')
  {
    // Map location strings to {project_id, base lat, base lng}
    // The 5 real fleet locations. جلولاء + خان ضاري are active project sites; المنصور
    // (HQ), الدورة and أبو غريب are Baghdad yards with no project. Strays were merged
    // into المنصور in fleetData.ts, so no extra keys are needed here.
    const LOCATION_MAP: Record<string, { pid: string | null; lat: number; lng: number }> = {
      'خان ضاري': { pid: projectIds[1], lat: 33.36,  lng: 43.78  },
      'جلولاء':   { pid: projectIds[0], lat: 34.27,  lng: 45.15  },
      'المنصور':  { pid: null,           lat: 33.313, lng: 44.358 },
      'الدورة':   { pid: null,           lat: 33.265, lng: 44.401 },
      'أبو غريب': { pid: null,           lat: 33.308, lng: 44.000 },
    }

    for (const row of FLEET_ROWS) {
      // Resolve location
      const loc = LOCATION_MAP[row.location.trim()] ?? { pid: null, lat: 33.313, lng: 44.358 }

      // Small deterministic jitter so pins don't overlap
      const jLat = loc.lat + (rand() - 0.5) * 0.06
      const jLng = loc.lng + (rand() - 0.5) * 0.06

      // Deterministic status. Cars parked at المنصور (HQ/warehouse bucket) are good but
      // idle — show them as MAINTENANCE. Field/yard cars keep the random spread so the
      // archive's sold/retired lists stay populated.
      const r = rand()
      const status =
        row.location.trim() === 'المنصور' ? 'MAINTENANCE' :
        r < 0.72 ? 'ACTIVE' :
        r < 0.85 ? 'MAINTENANCE' :
        r < 0.95 ? 'INACTIVE' :
                   'RETIRED'

      const oil_change_date = daysAgo(ri(10, 240))
      const company_id = pick(subIds)

      ins('vehicles', {
        id: `veh-${pad(row.seq)}`,
        code: row.code,
        vehicle_type: row.vehicle_type,
        type_group: row.type_group,
        name_ar: row.name_ar,
        name_en: row.name_en,
        emoji: row.emoji,
        plate_number: row.plate_number,
        model_year: row.model_year,
        owner_name: row.owner_name,
        owner_company_id: null,
        registration_expiry: row.registration_expiry,
        oil_change_date,
        status,
        location: row.location,
        project_id: loc.pid,
        driver_name: row.driver_name,
        driver_id: null,
        company_id,
        last_odometer: row.last_odometer,
        lat: jLat,
        lng: jLng,
        notes: '',
        created_at: isoNow(ri(100, 400)),
      })

      // Vehicle costs / journals are intentionally NOT seeded — the Vehicle
      // Accounting tab starts at zero. Real costs come from the fleet import
      // (npm run seed:fleet) when needed.
    }
  }

  // ---- Warehouses + items + stock + transactions (real Abu Ghraib + Al Dora data) ----
  console.log('  · warehouse (real Abu Ghraib + Al Dora data)')
  seedWarehouseData(projectIds, parentId)

  // ---- Accounts ----
  console.log('  · chart of accounts')
  for (const a of buildAccounts()) {
    ins('accounts', { code: a.code, name_ar: a.name_ar, name_en: a.name_en, type: a.type, normal_balance: a.normal_balance, parent_code: a.parent_code, level: a.level, is_posting: a.is_posting, sort_order: a.sort_order })
  }

  // ---- Fleet asset branch (5 — الآليات) ----
  // The base chart only defines roots 1–4, so create the «الآليات» asset root
  // here, then let ensureVehicleAccounts() add + link a 5xxx asset account for
  // every vehicle (zero balance — no journals reference them).
  ins('accounts', {
    code: '5', name_ar: 'الآليات', name_en: 'Fleet Assets', type: 'ASSET',
    normal_balance: 'DEBIT', parent_code: null, level: 1, is_posting: 0, sort_order: 500, archived: 0,
  })
  ensureVehicleAccounts()

  // ---- Banks (from the client's list — dual-currency IQD/USD) ----
  console.log('  · banks')
  const BANKS: Array<[string, string]> = [
    ['مصرف بغداد', 'Bank of Baghdad'],
    ['مصرف الاتحاد', 'Union Bank of Iraq'],
    ['مصرف الرشيد', 'Al-Rasheed Bank'],
  ]
  // المصارف (183) becomes a header; each bank is a posting sub-account under it.
  db.prepare(`UPDATE accounts SET is_posting = 0 WHERE code = '183'`).run()
  const bankCodes: string[] = []
  BANKS.forEach(([ar, en], i) => {
    const acctCode = `183${pad(i + 1, 2)}`
    bankCodes.push(acctCode)
    ins('accounts', {
      code: acctCode, name_ar: ar, name_en: en, type: 'ASSET', normal_balance: 'DEBIT',
      parent_code: '183', level: 4, is_posting: 1, sort_order: 1000 + i, archived: 0,
    })
    // Bank balances start at zero — real opening balances are set from the app.
    ins('banks', {
      id: `bank-${pad(i + 1, 3)}`, name_ar: ar, name_en: en,
      account_number: `${ri(1000, 9999)}-${ri(100000, 999999)}`, branch: pick(['الفرع الرئيسي', 'فرع المنصور', 'فرع الكرادة']),
      company_id: pick(subIds), opening_balance_iqd: 0, opening_balance_usd: 0,
      balance_iqd: 0, balance_usd: 0, status: 'ACTIVE', account_code: acctCode, created_at: isoNow(ri(100, 380)),
    })
  })


  // ---- Journal entries (balanced double-entry — drives EVERY accounting report) ----
  // Each entry has Σdebit === Σcredit, so the books always balance. Entries spread
  // across the last ~8 months so the dashboard month chart and reports have data.
  console.log('  · journal entries (balanced double-entry)')
  const projRows = db.prepare('SELECT id, company_id FROM projects').all() as Array<{ id: string; company_id: string }>
  const M = 1_000_000
  let jeSeq = 0
  let jlSeq = 0
  type JLine = { acc: string; debit?: number; credit?: number; project_id?: string | null; desc?: string }
  function jentry(day: number, desc: string, companyId: string, lines: JLine[], opts: { project_id?: string | null; currency?: string; rate?: number } = {}) {
    const id = `je-${pad(++jeSeq, 4)}`
    const cur = opts.currency ?? 'IQD'
    const rate = opts.rate ?? 1
    const round = (n: number) => Math.round(n * 100) / 100
    const td = round(lines.reduce((s, l) => s + (l.debit ?? 0), 0))
    const tc = round(lines.reduce((s, l) => s + (l.credit ?? 0), 0))
    ins('journal_entries', {
      id, serial_number: `JV-${pad(jeSeq, 5)}`, doc_number: `JV-2026-${pad(jeSeq, 4)}`,
      company_id: companyId, project_id: opts.project_id ?? null, date: daysAgo(day), description: desc,
      currency: cur, exchange_rate: rate, status: 'APPROVED', total_debit: td, total_credit: tc, created_at: isoNow(day),
    })
    for (const l of lines) {
      const amt = l.debit ?? l.credit ?? 0
      ins('journal_lines', {
        id: `jl-${pad(++jlSeq, 6)}`, entry_id: id, account_code: l.acc,
        company_id: companyId, project_id: l.project_id ?? opts.project_id ?? null, description: l.desc ?? desc,
        currency: cur, price: rate, value: round(amt * rate), debit: l.debit ?? 0, credit: l.credit ?? 0,
      })
    }
  }
  const bankPick = () => pick(bankCodes)

  // Completed-works revenue per project (مدين نقد/مصرف، دائن إيراد ذرعات منجزة).
  // Sized so the group is comfortably profitable across the period.
  for (const p of projRows) {
    const n = ri(8, 12)
    for (let k = 0; k < n; k++) {
      const amt = ri(120, 550) * M
      jentry(ri(10, 230), `إيراد ذرعة منجزة - دفعة ${k + 1}`, p.company_id, [
        { acc: chance(0.7) ? '181' : bankPick(), debit: amt },
        { acc: '4121', credit: amt },
      ], { project_id: p.id })
    }
  }
  // Scrap / incidental revenue.
  for (let k = 0; k < 6; k++) {
    const amt = ri(2, 20) * M
    jentry(ri(10, 220), 'إيراد عرضي', pick(subIds), [
      { acc: '181', debit: amt },
      { acc: chance(0.5) ? '417' : '49', credit: amt },
    ])
  }
  // Monthly salaries per company (مدين رواتب + ضمان اجتماعي، دائن مصرف).
  const salaryMonths = [200, 170, 140, 110, 80, 50, 20]
  for (const cid of subIds) {
    const payroll = db.prepare(`SELECT COALESCE(SUM(basic_salary),0) s FROM employees WHERE company_id=? AND status='ACTIVE'`).get(cid) as { s: number }
    const base = payroll.s || ri(20, 60) * M
    for (const day of salaryMonths) {
      const ss = Math.round(base * 0.05)
      jentry(day, 'رواتب وأجور الموظفين', cid, [
        { acc: '311', debit: base },
        { acc: '316', debit: ss },
        { acc: bankPick(), credit: base + ss },
      ])
    }
  }
  // Construction material purchases (cash, bank, or on account/accruals).
  const matAccts = ['3521', '3522', '3523', '3524', '3525', '3526']
  for (let k = 0; k < 30; k++) {
    const amt = ri(5, 120) * M
    const p = chance(0.7) ? pick(projRows) : null
    const credAcc = chance(0.4) ? '22' : chance(0.5) ? '181' : bankPick()
    jentry(ri(5, 235), 'شراء مواد إنشائية', p ? p.company_id : pick(subIds), [
      { acc: pick(matAccts), debit: amt },
      { acc: credAcc, credit: amt },
    ], { project_id: p?.id ?? null })
  }
  // Fuel & oils.
  for (let k = 0; k < 12; k++) {
    const amt = ri(1, 15) * M
    jentry(ri(5, 235), 'وقود وزيوت للآليات', pick(subIds), [
      { acc: pick(['3511', '3512', '3513']), debit: amt },
      { acc: '181', credit: amt },
    ])
  }
  // Service expenses (maintenance, rent, transport, communications, …).
  const svcAccts = ['3201', '3202', '3203', '3204', '3206', '3207', '3209', '3210', '3211', '3212', '3216', '3219']
  for (let k = 0; k < 18; k++) {
    const amt = ri(2, 40) * M
    jentry(ri(5, 235), 'مصاريف خدمية', pick(subIds), [
      { acc: pick(svcAccts), debit: amt },
      { acc: chance(0.5) ? bankPick() : '181', credit: amt },
    ])
  }
  // Sub-contracts (مقاولات ثانوية) — tied to projects.
  for (let k = 0; k < 10; k++) {
    const amt = ri(20, 200) * M
    const p = pick(projRows)
    jentry(ri(5, 235), 'مستخلص مقاول ثانوي', p.company_id, [
      { acc: '371', debit: amt },
      { acc: chance(0.5) ? '22' : bankPick(), credit: amt },
    ], { project_id: p.id })
  }
  // Employee advances (سلف المنتسبين).
  for (let k = 0; k < 8; k++) {
    const amt = ri(1, 8) * M
    jentry(ri(20, 230), 'صرف سلفة منتسب', pick(subIds), [
      { acc: '16114', debit: amt },
      { acc: '181', credit: amt },
    ])
  }
  // Operational advances (السلف التشغيلية) — always disbursed from the cash box
  // (181), never a bank account.
  for (let k = 0; k < 10; k++) {
    const amt = ri(3, 30) * M
    jentry(ri(20, 230), 'صرف سلفة تشغيلية', pick(subIds), [
      { acc: '16112', debit: amt },
      { acc: '181', credit: amt },
    ])
  }
  // Operational-advance settlements (تسوية السلف — مدين مصروف، دائن السلفة).
  for (let k = 0; k < 6; k++) {
    const amt = ri(2, 15) * M
    jentry(ri(5, 60), 'تسوية سلفة تشغيلية', pick(subIds), [
      { acc: pick(['3215', '3219', '3206']), debit: amt },
      { acc: '16112', credit: amt },
    ])
  }
  // Taxes, fees & audit.
  for (let k = 0; k < 5; k++) {
    const amt = ri(5, 50) * M
    jentry(ri(10, 200), 'ضرائب ورسوم / أتعاب تدقيق', pick(subIds), [
      { acc: chance(0.5) ? '382' : '381', debit: amt },
      { acc: bankPick(), credit: amt },
    ])
  }
  // Fixed-asset purchases (machines, vehicles, office equipment).
  for (let k = 0; k < 6; k++) {
    const amt = ri(50, 400) * M
    jentry(ri(40, 235), 'شراء أصل ثابت', pick(subIds), [
      { acc: pick(['113', '114', '116']), debit: amt },
      { acc: chance(0.5) ? '22' : bankPick(), credit: amt },
    ])
  }
  // Cash deposited into the bank (IQD) — asset↔asset, no P&L impact.
  for (let k = 0; k < 8; k++) {
    const amt = ri(20, 150) * M
    jentry(ri(5, 235), 'إيداع نقدي في المصرف', pick(subIds), [
      { acc: bankPick(), debit: amt },
      { acc: '181', credit: amt },
    ])
  }
  // USD completed-works revenue paid into a bank account (exercises dual-currency).
  for (let k = 0; k < 3; k++) {
    const usd = ri(20, 150) * 1000
    const rate = 1300 + ri(0, 40)
    const p = pick(projRows)
    jentry(ri(10, 200), 'إيراد ذرعة منجزة (دولار)', p.company_id, [
      { acc: bankPick(), debit: usd },
      { acc: '4121', credit: usd },
    ], { project_id: p.id, currency: 'USD', rate })
  }
  // USD withdrawn from bank into the USD cash box (صندوق $) — asset↔asset.
  for (let k = 0; k < 2; k++) {
    const usd = ri(5, 40) * 1000
    const rate = 1300 + ri(0, 40)
    jentry(ri(5, 150), 'سحب دولار إلى الصندوق', pick(subIds), [
      { acc: '182', debit: usd },
      { acc: bankPick(), credit: usd },
    ], { currency: 'USD', rate })
  }

  // ---- Clean-slate accounting ----
  // The chart-of-accounts tree is the single source of truth and starts at ZERO:
  // wipe every journal entry/line so all accounts, bank nodes and advances compute
  // to 0. Real transactions are entered from the app and flow back into the tree.
  db.prepare('DELETE FROM journal_lines').run()
  db.prepare('DELETE FROM journal_entries').run()

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
    ['companies', subIds[0]], ['items', 'itm-ag-002'], ['journal_entries', 'je-0001'],
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
  for (const t of ['companies', 'departments', 'employees', 'projects', 'vehicles', 'vehicle_costs', 'accounts', 'journal_entries', 'journal_lines', 'items', 'inventory_transactions', 'archive_documents', 'event_logs'])
    console.log(`     ${t.padEnd(24)} ${c(t)}`)
}

const run = db.transaction(seed)
run()
console.log('\n  ✅ Seed complete → server/data/erp.db\n')
