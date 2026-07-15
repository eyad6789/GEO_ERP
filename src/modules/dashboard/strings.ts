import { registerStrings } from '../../i18n/strings'

// Module-local strings — namespaced 'dashboard.*'.
registerStrings({
  // Hero
  'dashboard.greeting': { ar: 'مرحباً، أحمد', en: 'Welcome, Ahmed' },
  'dashboard.hero_subtitle': {
    ar: 'إليك نظرة عامة على أداء المجموعة اليوم',
    en: "Here's an overview of the group's performance today",
  },
  'dashboard.title': { ar: 'لوحة التحكم التنفيذية', en: 'Executive Dashboard' },

  // KPIs
  'dashboard.kpi.companies': { ar: 'عدد الشركات', en: 'Companies' },
  'dashboard.kpi.companies_hint': { ar: 'شركات المجموعة', en: 'Group entities' },
  'dashboard.kpi.active_projects': { ar: 'المشاريع النشطة', en: 'Active Projects' },
  'dashboard.kpi.active_projects_hint': { ar: 'من إجمالي', en: 'out of' },
  'dashboard.kpi.employees': { ar: 'الموظفون', en: 'Employees' },
  'dashboard.kpi.employees_hint': { ar: 'القوى العاملة', en: 'Total workforce' },
  'dashboard.kpi.contracts': { ar: 'قيمة العقود', en: 'Contracts Value' },
  'dashboard.kpi.contracts_hint': { ar: 'إجمالي قيمة العقود', en: 'Total contract value' },
  'dashboard.kpi.fleet_spend': { ar: 'مصاريف الآليات', en: 'Fleet Spend' },
  'dashboard.kpi.fleet_spend_hint': { ar: 'إجمالي ما صُرف على الآليات', en: 'Total spent on vehicles' },

  // Alerts
  'dashboard.alerts.title': { ar: 'تنبيهات تحتاج إجراء', en: 'Alerts Needing Action' },
  'dashboard.alerts.low_stock': { ar: 'مخزون منخفض', en: 'Low Stock' },
  'dashboard.alerts.low_stock_hint': { ar: 'أصناف تحت الحد الأدنى', en: 'items below minimum' },
  'dashboard.alerts.pending_leaves': { ar: 'إجازات معلقة', en: 'Pending Leaves' },
  'dashboard.alerts.pending_leaves_hint': { ar: 'طلبات بانتظار الموافقة', en: 'requests awaiting approval' },
  'dashboard.alerts.draft_entries': { ar: 'قيود مسودة', en: 'Draft Entries' },
  'dashboard.alerts.draft_entries_hint': { ar: 'قيود لم تُعتمد بعد', en: 'entries not yet posted' },
  'dashboard.alerts.review': { ar: 'مراجعة', en: 'Review' },

  // Charts
  'dashboard.chart.revenue_expense': { ar: 'الإيرادات مقابل المصروفات', en: 'Revenue vs Expense' },
  'dashboard.chart.revenue_expense_sub': { ar: 'آخر 12 شهراً', en: 'Last 12 months' },
  'dashboard.chart.revenue': { ar: 'الإيرادات', en: 'Revenue' },
  'dashboard.chart.expense': { ar: 'المصروفات', en: 'Expense' },
  'dashboard.chart.projects_by_status': { ar: 'المشاريع حسب الحالة', en: 'Projects by Status' },
  'dashboard.chart.projects_by_status_sub': { ar: 'توزيع محفظة المشاريع', en: 'Portfolio distribution' },
  'dashboard.chart.employees_by_company': { ar: 'الموظفون حسب الشركة', en: 'Employees by Company' },
  'dashboard.chart.employees_by_company_sub': { ar: 'توزيع القوى العاملة', en: 'Workforce distribution' },
  'dashboard.chart.projects': { ar: 'مشروع', en: 'projects' },

  // State
  'dashboard.loading': { ar: 'جارٍ تحميل لوحة التحكم...', en: 'Loading dashboard...' },
  'dashboard.error': { ar: 'تعذّر تحميل بيانات لوحة التحكم', en: 'Could not load dashboard data' },
})
