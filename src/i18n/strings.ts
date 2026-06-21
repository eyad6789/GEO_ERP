// ============================================================================
// Lightweight i18n registry. Common strings live here. Each module registers its
// own strings via registerStrings({...}) from src/modules/<name>/strings.ts.
// Usage in components:  const t = useT();  t('common.save')
// ============================================================================

export type Lang = 'ar' | 'en'
export interface StringEntry {
  ar: string
  en: string
}

const registry: Record<string, StringEntry> = {}

export function registerStrings(dict: Record<string, StringEntry>): void {
  Object.assign(registry, dict)
}

export function translate(key: string, lang: Lang): string {
  const entry = registry[key]
  if (!entry) return key
  return entry[lang] ?? entry.ar ?? key
}

// ---- Common / shared strings ----------------------------------------------
registerStrings({
  'app.title': { ar: 'al-qabas E.G. ERP', en: 'al-qabas E.G. ERP' },
  'app.subtitle': { ar: 'مجموعة القبس الهندسية', en: 'Al-Qabas Engineering Group' },

  // Navigation
  'nav.dashboard': { ar: 'لوحة التحكم', en: 'Dashboard' },
  'nav.companies': { ar: 'الشركات', en: 'Companies' },
  'nav.projects': { ar: 'المشاريع', en: 'Projects' },
  'nav.hr': { ar: 'الموارد البشرية', en: 'Human Resources' },
  'nav.accounting': { ar: 'المحاسبة', en: 'Accounting' },
  'nav.warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'nav.archive': { ar: 'الأرشيف', en: 'Archive' },
  'nav.logs': { ar: 'سجل الأحداث', en: 'Event Logs' },
  'nav.debug': { ar: 'نافذة التصحيح', en: 'Debug Window' },

  // Common actions
  'common.add': { ar: 'إضافة', en: 'Add' },
  'common.new': { ar: 'جديد', en: 'New' },
  'common.edit': { ar: 'تعديل', en: 'Edit' },
  'common.delete': { ar: 'حذف', en: 'Delete' },
  'common.save': { ar: 'حفظ', en: 'Save' },
  'common.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'common.view': { ar: 'عرض', en: 'View' },
  'common.search': { ar: 'بحث...', en: 'Search...' },
  'common.filter': { ar: 'تصفية', en: 'Filter' },
  'common.export': { ar: 'تصدير', en: 'Export' },
  'common.print': { ar: 'طباعة', en: 'Print' },
  'common.all': { ar: 'الكل', en: 'All' },
  'common.actions': { ar: 'إجراءات', en: 'Actions' },
  'common.details': { ar: 'التفاصيل', en: 'Details' },
  'common.back': { ar: 'رجوع', en: 'Back' },
  'common.next': { ar: 'التالي', en: 'Next' },
  'common.prev': { ar: 'السابق', en: 'Previous' },
  'common.close': { ar: 'إغلاق', en: 'Close' },
  'common.confirm': { ar: 'تأكيد', en: 'Confirm' },
  'common.confirm_delete': { ar: 'هل أنت متأكد من الحذف؟', en: 'Are you sure you want to delete?' },
  'common.loading': { ar: 'جارٍ التحميل...', en: 'Loading...' },
  'common.empty': { ar: 'لا توجد بيانات', en: 'No data' },
  'common.empty_hint': { ar: 'لم يتم العثور على سجلات مطابقة', en: 'No matching records found' },
  'common.error': { ar: 'حدث خطأ', en: 'An error occurred' },
  'common.saved': { ar: 'تم الحفظ بنجاح', en: 'Saved successfully' },
  'common.deleted': { ar: 'تم الحذف', en: 'Deleted' },
  'common.required': { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
  'common.total': { ar: 'الإجمالي', en: 'Total' },
  'common.count': { ar: 'العدد', en: 'Count' },
  'common.date': { ar: 'التاريخ', en: 'Date' },
  'common.day': { ar: 'اليوم', en: 'Day' },
  'common.month': { ar: 'الشهر', en: 'Month' },
  'common.year': { ar: 'السنة', en: 'Year' },
  'common.status': { ar: 'الحالة', en: 'Status' },
  'common.notes': { ar: 'ملاحظات', en: 'Notes' },
  'common.description': { ar: 'البيان', en: 'Description' },
  'common.amount': { ar: 'المبلغ', en: 'Amount' },
  'common.currency': { ar: 'العملة', en: 'Currency' },
  'common.company': { ar: 'الشركة', en: 'Company' },
  'common.project': { ar: 'المشروع', en: 'Project' },
  'common.name': { ar: 'الاسم', en: 'Name' },
  'common.code': { ar: 'الرمز', en: 'Code' },
  'common.type': { ar: 'النوع', en: 'Type' },
  'common.value': { ar: 'القيمة', en: 'Value' },
  'common.results': { ar: 'النتائج', en: 'results' },
  'common.page': { ar: 'صفحة', en: 'Page' },
  'common.of': { ar: 'من', en: 'of' },
  'common.select': { ar: 'اختر...', en: 'Select...' },
  'common.yes': { ar: 'نعم', en: 'Yes' },
  'common.no': { ar: 'لا', en: 'No' },

  // Locked pages (demo gating) — shown as "coming soon"
  'locked.title': { ar: 'قريباً', en: 'Coming soon' },
  'locked.hint': {
    ar: 'هذه الصفحة قيد التطوير وستكون متاحة قريباً.',
    en: 'This page is under development and will be available soon.',
  },
  'locked.cta': { ar: 'الذهاب إلى لوحة التحكم', en: 'Go to Dashboard' },
  'locked.badge': { ar: 'قريباً', en: 'Soon' },

  // Header
  'header.company_all': { ar: 'كل الشركات', en: 'All Companies' },
  'header.role': { ar: 'الدور', en: 'Role' },
  'header.search_global': { ar: 'بحث في النظام...', en: 'Search the system...' },
  'header.toggle_sidebar': { ar: 'إظهار/إخفاء القائمة', en: 'Toggle menu' },

  // Notes widget
  'notes.title': { ar: 'ملاحظة خاصة', en: 'Private Note' },
  'notes.add': { ar: 'إضافة ملاحظة', en: 'Add note' },
  'notes.placeholder': { ar: 'اكتب ملاحظتك هنا...', en: 'Write your note here...' },
  'notes.visibility': { ar: 'مستوى الظهور', en: 'Visibility' },
  'notes.public': { ar: 'عام', en: 'Public' },
  'notes.restricted': { ar: 'محدد', en: 'Restricted' },
  'notes.private': { ar: 'خاص', en: 'Private (Manager only)' },
  'notes.warning': {
    ar: '⚠️ الملاحظات الخاصة لا تظهر لجميع المستخدمين',
    en: '⚠️ Private notes are not visible to all users',
  },
  'notes.empty': { ar: 'لا توجد ملاحظات بعد', en: 'No notes yet' },

  // Statuses (generic — StatusBadge maps these)
  'status.ACTIVE': { ar: 'نشط', en: 'Active' },
  'status.INACTIVE': { ar: 'غير نشط', en: 'Inactive' },
  'status.PLANNING': { ar: 'تخطيط', en: 'Planning' },
  'status.ON_HOLD': { ar: 'متوقف', en: 'On Hold' },
  'status.COMPLETED': { ar: 'مكتمل', en: 'Completed' },
  'status.CANCELLED': { ar: 'ملغي', en: 'Cancelled' },
  'status.PENDING': { ar: 'قيد الانتظار', en: 'Pending' },
  'status.APPROVED': { ar: 'معتمد', en: 'Approved' },
  'status.REJECTED': { ar: 'مرفوض', en: 'Rejected' },
  'status.REPAYING': { ar: 'قيد السداد', en: 'Repaying' },
  'status.SETTLED': { ar: 'مسدد', en: 'Settled' },
  'status.DRAFT': { ar: 'غير معتمد', en: 'Unapproved' },
  'status.ON_LEAVE': { ar: 'في إجازة', en: 'On Leave' },
  'status.SUSPENDED': { ar: 'موقوف', en: 'Suspended' },
  'status.TERMINATED': { ar: 'منتهي', en: 'Terminated' },
  'status.SUCCESS': { ar: 'نجاح', en: 'Success' },
  'status.FAILED': { ar: 'فشل', en: 'Failed' },
  'status.WARNING': { ar: 'تحذير', en: 'Warning' },
  'status.PRESENT': { ar: 'حاضر', en: 'Present' },
  'status.ABSENT': { ar: 'غائب', en: 'Absent' },
  'status.LEAVE': { ar: 'إجازة', en: 'Leave' },
  'status.MISSION': { ar: 'مأمورية', en: 'Mission' },
  'status.HOLIDAY': { ar: 'عطلة', en: 'Holiday' },
})
