import { registerStrings } from '../../i18n/strings'

// Module-local strings ('projects.*') for the Projects module.
registerStrings({
  // Page / headers
  'projects.title': { ar: 'المشاريع', en: 'Projects' },
  'projects.subtitle': { ar: 'إدارة مشاريع المجموعة الإنشائية ومتابعة تنفيذها', en: 'Manage the construction group projects and track their execution' },
  'projects.detail.subtitle': { ar: 'تفاصيل المشروع والأقسام الفرعية', en: 'Project details and sub-sections' },
  'projects.not_found': { ar: 'المشروع غير موجود', en: 'Project not found' },
  'projects.not_found_hint': { ar: 'تعذّر العثور على المشروع المطلوب', en: 'The requested project could not be found' },
  'projects.back_to_list': { ar: 'عودة إلى المشاريع', en: 'Back to projects' },

  // KPIs (list)
  'projects.kpi.total': { ar: 'إجمالي المشاريع', en: 'Total projects' },
  'projects.kpi.active': { ar: 'المشاريع النشطة', en: 'Active projects' },
  'projects.kpi.contract_total': { ar: 'إجمالي قيمة العقود', en: 'Total contract value' },
  'projects.kpi.avg_progress': { ar: 'متوسط الإنجاز', en: 'Average progress' },

  // Filters / toolbar
  'projects.filter.status': { ar: 'تصفية حسب الحالة', en: 'Filter by status' },
  'projects.filter.all_statuses': { ar: 'كل الحالات', en: 'All statuses' },
  'projects.search': { ar: 'بحث في المشاريع...', en: 'Search projects...' },
  'projects.empty': { ar: 'لا توجد مشاريع', en: 'No projects' },
  'projects.empty_hint': { ar: 'لم يتم العثور على مشاريع مطابقة للمرشحات', en: 'No projects matched the current filters' },

  // Card / detail fields
  'projects.field.client': { ar: 'العميل', en: 'Client' },
  'projects.field.company': { ar: 'الشركة', en: 'Company' },
  'projects.field.manager': { ar: 'مدير المشروع', en: 'Project manager' },
  'projects.field.location': { ar: 'الموقع', en: 'Location' },
  'projects.field.contract_value': { ar: 'قيمة العقد', en: 'Contract value' },
  'projects.field.contract_number': { ar: 'رقم العقد', en: 'Contract number' },
  'projects.field.progress': { ar: 'نسبة الإنجاز', en: 'Progress' },
  'projects.field.start_date': { ar: 'تاريخ البدء', en: 'Start date' },
  'projects.field.end_date': { ar: 'تاريخ الانتهاء', en: 'End date' },
  'projects.field.duration': { ar: 'المدة', en: 'Duration' },
  'projects.field.description': { ar: 'وصف المشروع', en: 'Project description' },
  'projects.field.unassigned': { ar: 'غير مُعيّن', en: 'Unassigned' },

  // Detail KPIs
  'projects.kpi.contract': { ar: 'قيمة العقد', en: 'Contract value' },
  'projects.kpi.spent': { ar: 'إجمالي الصرفيات', en: 'Total spent' },
  'projects.kpi.revenue': { ar: 'الإيرادات', en: 'Revenue' },
  'projects.kpi.expense': { ar: 'المصروفات', en: 'Expenses' },
  'projects.kpi.net': { ar: 'صافي الربح', en: 'Net profit' },
  'projects.kpi.remaining': { ar: 'المتبقي من العقد', en: 'Remaining of contract' },

  // Tabs
  'projects.tab.accounting': { ar: 'المحاسبة', en: 'Accounting' },
  'projects.tab.timeline': { ar: 'الجدول الزمني', en: 'Timeline' },
  'projects.tab.schedules': { ar: 'الجداول', en: 'Schedules' },
  'projects.tab.machinery': { ar: 'الآليات', en: 'Machinery' },
  'projects.tab.warehouse': { ar: 'مستودع المشروع', en: 'Project warehouse' },
  'projects.tab.staff': { ar: 'طاقم العمل', en: 'Staff' },
  'projects.tab.expenditures': { ar: 'الصرفيات', en: 'Expenditures' },
  'projects.tab.diagrams': { ar: 'المخططات', en: 'Diagrams' },

  // Accounting tab
  'projects.acc.title': { ar: 'القيود المحاسبية للمشروع', en: 'Project journal entries' },
  'projects.acc.serial': { ar: 'التسلسل', en: 'Serial' },
  'projects.acc.doc': { ar: 'رقم المستند', en: 'Doc no.' },
  'projects.acc.debit': { ar: 'مدين', en: 'Debit' },
  'projects.acc.credit': { ar: 'دائن', en: 'Credit' },
  'projects.acc.empty': { ar: 'لا توجد قيود لهذا المشروع', en: 'No journal entries for this project' },

  // Timeline tab
  'projects.timeline.title': { ar: 'المعالم والجدول الزمني', en: 'Milestones & timeline' },
  'projects.timeline.subtitle': { ar: 'مخطط جانت لمراحل تنفيذ المشروع', en: 'Gantt chart of project execution phases' },
  'projects.timeline.empty': { ar: 'لا توجد معالم مُعرّفة', en: 'No milestones defined' },

  // Schedules tab
  'projects.sched.title': { ar: 'جدول المعالم', en: 'Milestones schedule' },
  'projects.sched.milestone': { ar: 'المعلم', en: 'Milestone' },
  'projects.sched.percent': { ar: 'نسبة الإنجاز', en: 'Completion %' },
  'projects.sched.depends': { ar: 'يعتمد على', en: 'Depends on' },
  'projects.sched.duration_days': { ar: 'المدة (يوم)', en: 'Duration (days)' },

  // Machinery tab
  'projects.mach.title': { ar: 'آليات المشروع', en: 'Project machinery' },
  'projects.mach.name': { ar: 'الآلية', en: 'Machine' },
  'projects.mach.type': { ar: 'النوع', en: 'Type' },
  'projects.mach.operator': { ar: 'المُشغّل', en: 'Operator' },
  'projects.mach.assigned': { ar: 'تاريخ التخصيص', en: 'Assigned date' },
  'projects.mach.hours': { ar: 'ساعات العمل', en: 'Hours worked' },
  'projects.mach.fuel': { ar: 'الوقود المستهلك (لتر)', en: 'Fuel used (L)' },

  // Warehouse tab
  'projects.wh.title': { ar: 'حركات مستودع المشروع', en: 'Project warehouse transactions' },
  'projects.wh.type': { ar: 'نوع الحركة', en: 'Type' },
  'projects.wh.warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'projects.wh.value': { ar: 'القيمة', en: 'Value' },
  'projects.wh.empty': { ar: 'لا توجد حركات مخزنية لهذا المشروع', en: 'No inventory transactions for this project' },

  // Staff tab
  'projects.staff.title': { ar: 'طاقم عمل المشروع', en: 'Project staff' },
  'projects.staff.employee': { ar: 'الموظف', en: 'Employee' },
  'projects.staff.role': { ar: 'الدور في المشروع', en: 'Project role' },
  'projects.staff.empty': { ar: 'لا يوجد طاقم معيّن لهذا المشروع', en: 'No staff assigned to this project' },

  // Expenditures tab
  'projects.exp.title': { ar: 'صرفيات المشروع', en: 'Project expenditures' },
  'projects.exp.add': { ar: 'صرفية جديدة', en: 'New expenditure' },
  'projects.exp.total': { ar: 'إجمالي الصرفيات', en: 'Total expenditures' },
  'projects.exp.category': { ar: 'الفئة', en: 'Category' },
  'projects.exp.paid_to': { ar: 'المدفوع إلى', en: 'Paid to' },
  'projects.exp.method': { ar: 'طريقة الدفع', en: 'Payment method' },
  'projects.exp.serial': { ar: 'التسلسل', en: 'Serial' },
  'projects.exp.doc': { ar: 'رقم المستند', en: 'Doc no.' },
  'projects.exp.empty': { ar: 'لا توجد صرفيات لهذا المشروع', en: 'No expenditures for this project' },
  'projects.exp.count': { ar: 'عدد الصرفيات', en: 'Entries' },

  // Diagrams tab
  'projects.diag.title': { ar: 'مخططات المشروع', en: 'Project diagrams' },
  'projects.diag.version': { ar: 'الإصدار', en: 'Version' },
  'projects.diag.comments': { ar: 'تعليق', en: 'comments' },
  'projects.diag.uploaded': { ar: 'رُفع في', en: 'Uploaded' },
  'projects.diag.empty': { ar: 'لا توجد مخططات مرفوعة لهذا المشروع', en: 'No diagrams uploaded for this project' },
})
