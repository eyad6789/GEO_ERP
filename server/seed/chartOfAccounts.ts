// ============================================================================
// Chart of accounts — Iraqi Unified Accounting System (النظام المحاسبي الموحد).
// Transcribed from the client's handwritten chart. Defined compactly as
// [code, ar, en, parent]; type / normal_balance / level / is_posting are
// derived by buildAccounts().
//   1 الموجودات (Assets) · 2 المطلوبات (Liabilities)
//   3 الاستخدامات (Uses/Expenses) · 4 الموارد (Revenue)
// ============================================================================

export interface AccountRow {
  code: string
  name_ar: string
  name_en: string
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  normal_balance: 'DEBIT' | 'CREDIT'
  parent_code: string | null
  level: number
  is_posting: number
  sort_order: number
}

type Raw = [code: string, ar: string, en: string, parent: string | null]

const RAW: Raw[] = [
  // ===== 1 — الموجودات (ASSETS) =====
  ['1', 'الموجودات', 'Assets', null],
  ['11', 'الموجودات الثابتة', 'Fixed Assets', '1'],
  ['111', 'أراضي', 'Lands', '11'],
  ['112', 'مباني', 'Buildings', '11'],
  ['113', 'الات ومعدات', 'Machines & Equipment', '11'],
  ['114', 'وسائل النقل', 'Vehicles', '11'],
  ['115', 'عدد وقوالب', 'Tools & Molds', '11'],
  ['116', 'أثاث ومعدات مكاتب', 'Furniture & Office Equipment', '11'],
  ['13', 'مشاريع تحت التنفيذ', 'Projects Under Execution', '1'],
  ['12', 'مخزون', 'Inventory', '1'],
  ['1263', 'مخزون أعمال تحت التنفيذ', 'Inventory - Work Under Execution', '12'],
  ['16', 'مدينون', 'Debtors', '1'],
  ['164', 'سلف المشاريع', 'Project Advances', '16'],
  ['166', 'حسابات مدينة متنوعة', 'Sundry Debtors', '16'],
  ['16114', 'سلف المنتسبين', 'Employee Advances', '16'],
  ['16112', 'السلف التشغيلية', 'Operational Advances', '16'],
  ['18', 'النقود', 'Cash', '1'],
  ['181', 'صندوق د.ع', 'Cash Box (IQD)', '18'],
  ['182', 'صندوق $', 'Cash Box (USD)', '18'],
  ['183', 'المصارف', 'Banks', '18'],

  // ===== 2 — المطلوبات (LIABILITIES) =====
  ['2', 'المطلوبات', 'Liabilities', null],
  ['22', 'الاستحقاقيات', 'Accruals', '2'],
  ['26', 'الدائنون', 'Creditors', '2'],
  ['268', 'دائنون توزيع أرباح', 'Creditors - Profit Distribution', '26'],

  // ===== 3 — الاستخدامات (USES / EXPENSES) =====
  ['3', 'الاستخدامات', 'Uses (Expenses)', null],
  ['31', 'الأجور', 'Wages', '3'],
  ['311', 'الرواتب', 'Salaries', '31'],
  ['312', 'أجور', 'Wages', '31'],
  ['316', 'الضمان الاجتماعي', 'Social Security', '31'],
  ['32', 'المستلزمات الخدمية', 'Service Requirements', '3'],
  ['3201', 'صيانة مباني', 'Buildings Maintenance', '32'],
  ['3202', 'صيانة الآلات والمعدات (الآليات الكبيرة)', 'Machinery & Equipment Maintenance', '32'],
  ['3203', 'صيانة وسائل النقل (الآليات الصغيرة)', 'Vehicles Maintenance', '32'],
  ['3204', 'الاتصالات', 'Communications', '32'],
  ['3205', 'كارتات', 'Phone Cards', '32'],
  ['3206', 'نقل بضائع', 'Goods Transport', '32'],
  ['3207', 'نقل عاملين', 'Staff Transport', '32'],
  ['3208', 'بحوث ودراسات', 'Research & Studies', '32'],
  ['3209', 'استئجار مباني', 'Buildings Rental', '32'],
  ['3210', 'استئجار آلات ومعدات', 'Machinery Rental', '32'],
  ['3211', 'استئجار وسائل النقل', 'Vehicles Rental', '32'],
  ['3212', 'سفر وإيفاد العاملين', 'Travel & Delegation', '32'],
  ['3213', 'اشتراكات وانتماءات', 'Subscriptions & Memberships', '32'],
  ['3214', 'مكافآت', 'Bonuses', '32'],
  ['3215', 'نثرية', 'Petty Expenses', '32'],
  ['3216', 'عمولات مصرفية', 'Bank Commissions', '32'],
  ['3217', 'شراء مطبوعات', 'Printed Materials', '32'],
  ['3218', 'خدمات قانونية', 'Legal Services', '32'],
  ['3219', 'مصاريف خدمية أخرى', 'Other Service Expenses', '32'],
  ['35', 'المستلزمات السلعية', 'Commodity Requirements', '3'],
  ['351', 'الوقود', 'Fuel', '35'],
  ['3511', 'بنزين', 'Gasoline', '351'],
  ['3512', 'زيوت', 'Oils', '351'],
  ['3513', 'كاز', 'Kerosene', '351'],
  ['352', 'الخامات', 'Raw Materials', '35'],
  ['3521', 'الاسمنت', 'Cement', '352'],
  ['3522', 'طابوق', 'Bricks', '352'],
  ['3523', 'حديد', 'Iron', '352'],
  ['3524', 'رمل', 'Sand', '352'],
  ['3525', 'حصى', 'Gravel', '352'],
  ['3526', 'خامات أخرى', 'Other Materials', '352'],
  ['353', 'ماء وكهرباء', 'Water & Electricity', '35'],
  ['3531', 'ماء', 'Water', '353'],
  ['3532', 'كهرباء', 'Electricity', '353'],
  ['354', 'لوازم ومهمات', 'Supplies & Equipment', '35'],
  ['355', 'قرطاسية', 'Stationery', '35'],
  ['356', 'تجهيزات العاملين', 'Staff Outfitting', '35'],
  ['3561', 'كساوي', 'Uniforms', '356'],
  ['3562', 'خزانة', 'Lockers', '356'],
  ['37', 'مقاولات وخدمات', 'Contracts & Services', '3'],
  ['371', 'مقاولات ثانوية', 'Sub-contracts', '37'],
  ['38', 'المصاريف التحويلية', 'Transfer Expenses', '3'],
  ['381', 'تدقيق حسابات', 'Audit Fees', '38'],
  ['382', 'ضرائب ورسوم', 'Taxes & Fees', '38'],

  // ===== 4 — الموارد (REVENUE / RESOURCES) =====
  ['4', 'الموارد', 'Revenue', null],
  ['41', 'إيراد النشاط السلعي', 'Commodity Activity Revenue', '4'],
  ['417', 'إيراد بيع مخلفات', 'Scrap Sales Revenue', '41'],
  ['4121', 'إيراد ذرعات منجزة', 'Completed Works Revenue', '41'],
  ['49', 'إيرادات عرضية', 'Incidental Revenue', '4'],
]

// Unified Accounting System major groups by leading digit:
//   1 الموجودات (Assets) · 2 المطلوبات (Liabilities)
//   3 الاستخدامات (Expenses) · 4 الموارد (Revenue)
const TYPE_BY_DIGIT: Record<string, AccountRow['type']> = {
  '1': 'ASSET',
  '2': 'LIABILITY',
  '3': 'EXPENSE',
  '4': 'REVENUE',
}

export function buildAccounts(): AccountRow[] {
  const parentOf = new Map<string, string | null>()
  const hasChild = new Set<string>()
  for (const [code, , , parent] of RAW) {
    parentOf.set(code, parent)
    if (parent) hasChild.add(parent)
  }

  const levelOf = (code: string): number => {
    let lvl = 1
    let p = parentOf.get(code) ?? null
    while (p) {
      lvl++
      p = parentOf.get(p) ?? null
    }
    return lvl
  }

  return RAW.map(([code, name_ar, name_en, parent], index) => {
    const type = TYPE_BY_DIGIT[code[0]]
    const normal_balance = type === 'ASSET' || type === 'EXPENSE' ? 'DEBIT' : 'CREDIT'
    return {
      code,
      name_ar,
      name_en,
      type,
      normal_balance,
      parent_code: parent,
      level: levelOf(code),
      is_posting: hasChild.has(code) ? 0 : 1,
      sort_order: index, // notebook order; the tree sorts by this
    }
  })
}

/** Leaf (postable) accounts only, optionally filtered by type. */
export function postingAccounts(type?: AccountRow['type']): AccountRow[] {
  return buildAccounts().filter((a) => a.is_posting === 1 && (!type || a.type === type))
}
