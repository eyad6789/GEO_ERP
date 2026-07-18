import { registerStrings } from '../../i18n/strings'

// Module-local strings ('logs.*') — Event Logs module.
registerStrings({
  // Page
  'logs.title': { ar: 'سجل الأحداث', en: 'Event Logs' },
  'logs.subtitle': {
    ar: 'سجل تدقيق كامل لكل العمليات في النظام',
    en: 'Complete audit trail of every operation in the system',
  },

  // Immutable banner
  'logs.immutable': {
    ar: '⚠️ السجل غير قابل للتعديل أو الحذف',
    en: '⚠️ Logs are immutable',
  },
  'logs.immutable_hint': {
    ar: 'تُحفظ جميع الأحداث تلقائياً لأغراض التدقيق ولا يمكن تغييرها.',
    en: 'All events are recorded automatically for auditing and cannot be altered.',
  },

  // KPIs
  'logs.kpi.total': { ar: 'إجمالي الأحداث', en: 'Total Events' },
  'logs.kpi.success': { ar: 'ناجحة', en: 'Successful' },
  'logs.kpi.failed': { ar: 'فاشلة', en: 'Failed' },
  'logs.kpi.warning': { ar: 'تحذيرات', en: 'Warnings' },
  'logs.kpi.success_rate': { ar: 'نسبة النجاح', en: 'Success rate' },
  'logs.kpi.needs_review': { ar: 'تتطلب مراجعة', en: 'Needs review' },
  'logs.kpi.of_total': { ar: 'من الإجمالي', en: 'of total' },

  // Filters
  'logs.filters.module': { ar: 'الوحدة', en: 'Module' },
  'logs.filters.action': { ar: 'الإجراء', en: 'Action' },
  'logs.filters.status': { ar: 'الحالة', en: 'Status' },
  'logs.filters.all_modules': { ar: 'كل الوحدات', en: 'All modules' },
  'logs.filters.all_actions': { ar: 'كل الإجراءات', en: 'All actions' },
  'logs.filters.all_statuses': { ar: 'كل الحالات', en: 'All statuses' },
  'logs.filters.clear': { ar: 'مسح التصفية', en: 'Clear filters' },
  'logs.search_placeholder': {
    ar: 'ابحث في المستخدم أو الوصف أو عنوان IP...',
    en: 'Search user, description or IP...',
  },

  // Table columns
  'logs.col.timestamp': { ar: 'التوقيت', en: 'Timestamp' },
  'logs.col.user': { ar: 'المستخدم', en: 'User' },
  'logs.col.module': { ar: 'الوحدة', en: 'Module' },
  'logs.col.action': { ar: 'الإجراء', en: 'Action' },
  'logs.col.description': { ar: 'الوصف', en: 'Description' },
  'logs.col.status': { ar: 'الحالة', en: 'Status' },
  'logs.col.ip': { ar: 'عنوان IP', en: 'IP Address' },

  'logs.empty.title': { ar: 'لا توجد أحداث', en: 'No events' },
  'logs.empty.hint': {
    ar: 'لا توجد سجلات مطابقة للمرشحات الحالية',
    en: 'No logs match the current filters',
  },

  // Detail dialog
  'logs.detail.title': { ar: 'تفاصيل الحدث', en: 'Event Details' },
  'logs.detail.event_info': { ar: 'معلومات الحدث', en: 'Event Information' },
  'logs.detail.actor': { ar: 'المنفّذ', en: 'Actor' },
  'logs.detail.context': { ar: 'سياق الجلسة', en: 'Session Context' },
  'logs.detail.user': { ar: 'المستخدم', en: 'User' },
  'logs.detail.role': { ar: 'الدور', en: 'Role' },
  'logs.detail.module': { ar: 'الوحدة', en: 'Module' },
  'logs.detail.action': { ar: 'الإجراء', en: 'Action' },
  'logs.detail.record_type': { ar: 'نوع السجل', en: 'Record Type' },
  'logs.detail.record_id': { ar: 'معرّف السجل', en: 'Record ID' },
  'logs.detail.record_desc': { ar: 'وصف السجل', en: 'Record Description' },
  'logs.detail.timestamp': { ar: 'التوقيت', en: 'Timestamp' },
  'logs.detail.ip': { ar: 'عنوان IP', en: 'IP Address' },
  'logs.detail.device': { ar: 'الجهاز', en: 'Device' },
  'logs.detail.browser': { ar: 'المتصفح', en: 'Browser' },
  'logs.detail.status': { ar: 'النتيجة', en: 'Result' },
  'logs.detail.error': { ar: 'رسالة الخطأ', en: 'Error Message' },

  // Diff
  'logs.diff.title': { ar: 'التغييرات على البيانات', en: 'Data Changes' },
  'logs.diff.field': { ar: 'الحقل', en: 'Field' },
  'logs.diff.before': { ar: 'قبل', en: 'Before' },
  'logs.diff.after': { ar: 'بعد', en: 'After' },
  'logs.diff.none': { ar: 'لا توجد تغييرات بيانات مسجّلة', en: 'No recorded data changes' },
  'logs.diff.empty': { ar: '—', en: '—' },

  // Module names
  'logs.module.ACCOUNTING': { ar: 'المحاسبة', en: 'Accounting' },
  'logs.module.HR': { ar: 'الموارد البشرية', en: 'HR' },
  'logs.module.WAREHOUSE': { ar: 'المستودع', en: 'Warehouse' },
  'logs.module.PROJECTS': { ar: 'المشاريع', en: 'Projects' },
  'logs.module.COMPANIES': { ar: 'الشركات', en: 'Companies' },
  'logs.module.ARCHIVE': { ar: 'الأرشيف', en: 'Archive' },
  'logs.module.LOGS': { ar: 'السجلات', en: 'Logs' },
  'logs.module.GENERAL': { ar: 'عام', en: 'General' },

  // Action names
  'logs.action.CREATE': { ar: 'إنشاء', en: 'Create' },
  'logs.action.UPDATE': { ar: 'تعديل', en: 'Update' },
  'logs.action.DELETE': { ar: 'حذف', en: 'Delete' },
  'logs.action.APPROVE': { ar: 'اعتماد', en: 'Approve' },
  'logs.action.REJECT': { ar: 'رفض', en: 'Reject' },
  'logs.action.EXPORT': { ar: 'تصدير', en: 'Export' },
  'logs.action.PRINT': { ar: 'طباعة', en: 'Print' },
  'logs.action.LOGIN': { ar: 'تسجيل دخول', en: 'Login' },
  'logs.action.LOGOUT': { ar: 'تسجيل خروج', en: 'Logout' },
})
