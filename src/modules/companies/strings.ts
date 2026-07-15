import { registerStrings } from '../../i18n/strings'

// Module-local strings ('companies.*').
registerStrings({
  // Page-level
  'companies.title': { ar: 'الشركات', en: 'Companies' },
  'companies.subtitle': {
    ar: 'الهيكل المؤسسي لمجموعة GEO وشركاتها التابعة',
    en: 'GEO Group corporate structure and its subsidiaries',
  },
  'companies.search': { ar: 'ابحث عن شركة بالاسم أو المدينة أو الرمز...', en: 'Search by name, city or code...' },
  'companies.detail.title': { ar: 'تفاصيل الشركة', en: 'Company Details' },

  // Hero / parent
  'companies.parent': { ar: 'الشركة الأم', en: 'Parent Company' },
  'companies.subsidiary': { ar: 'شركة تابعة', en: 'Subsidiary' },
  'companies.consolidated': { ar: 'إحصاءات موحدة', en: 'Consolidated Stats' },
  'companies.subsidiaries_count': { ar: 'الشركات التابعة', en: 'Subsidiaries' },
  'companies.total_employees': { ar: 'إجمالي الموظفين', en: 'Total Employees' },
  'companies.total_projects': { ar: 'إجمالي المشاريع', en: 'Total Projects' },
  'companies.total_contract_value': { ar: 'إجمالي قيمة العقود', en: 'Total Contract Value' },
  'companies.group_companies': { ar: 'شركات المجموعة', en: 'Group Companies' },
  'companies.companies_count': { ar: 'شركة', en: 'companies' },

  // Cards
  'companies.employees': { ar: 'موظف', en: 'employees' },
  'companies.projects': { ar: 'مشروع', en: 'projects' },
  'companies.view_company': { ar: 'عرض الشركة', en: 'View Company' },
  'companies.no_companies': { ar: 'لا توجد شركات', en: 'No companies' },
  'companies.no_companies_hint': {
    ar: 'لم يتم العثور على شركات مطابقة لبحثك',
    en: 'No companies matched your search',
  },

  // Filters
  'companies.filter_all': { ar: 'كل الشركات', en: 'All' },
  'companies.filter_active': { ar: 'نشطة', en: 'Active' },
  'companies.filter_inactive': { ar: 'غير نشطة', en: 'Inactive' },

  // Tabs
  'companies.tab.info': { ar: 'المعلومات الأساسية', en: 'Overview' },
  'companies.tab.employees': { ar: 'الموظفون', en: 'Employees' },
  'companies.tab.projects': { ar: 'المشاريع', en: 'Projects' },
  'companies.tab.accounting': { ar: 'المحاسبة', en: 'Accounting' },
  'companies.tab.warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'companies.tab.archive': { ar: 'الأرشيف', en: 'Archive' },

  // Info section
  'companies.info.identity': { ar: 'الهوية القانونية', en: 'Legal Identity' },
  'companies.info.contact': { ar: 'بيانات الاتصال', en: 'Contact Details' },
  'companies.info.financial': { ar: 'الإعدادات المالية', en: 'Financial Settings' },
  'companies.info.registration': { ar: 'رقم التسجيل', en: 'Registration No.' },
  'companies.info.tax': { ar: 'الرقم الضريبي', en: 'Tax Number' },
  'companies.info.address': { ar: 'العنوان', en: 'Address' },
  'companies.info.city': { ar: 'المدينة', en: 'City' },
  'companies.info.country': { ar: 'الدولة', en: 'Country' },
  'companies.info.phone': { ar: 'الهاتف', en: 'Phone' },
  'companies.info.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'companies.info.website': { ar: 'الموقع الإلكتروني', en: 'Website' },
  'companies.info.established': { ar: 'تاريخ التأسيس', en: 'Established' },
  'companies.info.currency_primary': { ar: 'العملة الأساسية', en: 'Primary Currency' },
  'companies.info.currency_secondary': { ar: 'العملة الثانوية', en: 'Secondary Currency' },
  'companies.info.parent': { ar: 'الشركة الأم', en: 'Parent Company' },
  'companies.info.type': { ar: 'نوع الشركة', en: 'Company Type' },

  // Employees tab
  'companies.emp.number': { ar: 'الرقم الوظيفي', en: 'Emp. No.' },
  'companies.emp.name': { ar: 'الاسم', en: 'Name' },
  'companies.emp.job_title': { ar: 'المسمى الوظيفي', en: 'Job Title' },
  'companies.emp.type': { ar: 'نوع التعاقد', en: 'Employment' },
  'companies.emp.hire_date': { ar: 'تاريخ التعيين', en: 'Hire Date' },
  'companies.emp.empty': { ar: 'لا يوجد موظفون', en: 'No employees' },
  'companies.emp.empty_hint': { ar: 'لم يتم تعيين موظفين لهذه الشركة بعد', en: 'No employees assigned yet' },

  // Projects tab
  'companies.proj.code': { ar: 'الرمز', en: 'Code' },
  'companies.proj.name': { ar: 'المشروع', en: 'Project' },
  'companies.proj.client': { ar: 'العميل', en: 'Client' },
  'companies.proj.contract_value': { ar: 'قيمة العقد', en: 'Contract Value' },
  'companies.proj.progress': { ar: 'الإنجاز', en: 'Progress' },
  'companies.proj.empty': { ar: 'لا توجد مشاريع', en: 'No projects' },
  'companies.proj.empty_hint': { ar: 'لا توجد مشاريع مسجلة لهذه الشركة', en: 'No projects registered for this company' },

  // Accounting tab
  'companies.acc.revenue': { ar: 'الإيرادات', en: 'Revenue' },
  'companies.acc.expense': { ar: 'المصروفات', en: 'Expenses' },
  'companies.acc.net': { ar: 'صافي الربح', en: 'Net Profit' },
  'companies.acc.assets': { ar: 'إجمالي الأصول', en: 'Total Assets' },
  'companies.acc.liabilities': { ar: 'إجمالي الخصوم', en: 'Total Liabilities' },
  'companies.acc.equity': { ar: 'حقوق الملكية', en: 'Equity' },
  'companies.acc.overview': { ar: 'نظرة عامة مالية', en: 'Financial Overview' },
  'companies.acc.composition': { ar: 'تكوين الميزانية', en: 'Balance Composition' },
  'companies.acc.balanced': { ar: 'الميزانية متوازنة', en: 'Balance Sheet is balanced' },
  'companies.acc.unbalanced': { ar: 'الميزانية غير متوازنة', en: 'Balance Sheet is not balanced' },

  // Warehouse tab
  'companies.wh.serial': { ar: 'التسلسل', en: 'Serial' },
  'companies.wh.doc': { ar: 'رقم المستند', en: 'Doc No.' },
  'companies.wh.type': { ar: 'نوع الحركة', en: 'Type' },
  'companies.wh.warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'companies.wh.value': { ar: 'القيمة', en: 'Value' },
  'companies.wh.empty': { ar: 'لا توجد حركات مخزنية', en: 'No inventory transactions' },
  'companies.wh.empty_hint': { ar: 'لم تسجَّل أي حركات مخزنية لهذه الشركة', en: 'No inventory movements recorded' },

  // Archive tab
  'companies.arc.ref': { ar: 'رقم المرجع', en: 'Ref. No.' },
  'companies.arc.title': { ar: 'العنوان', en: 'Title' },
  'companies.arc.doc_type': { ar: 'نوع المستند', en: 'Doc Type' },
  'companies.arc.from': { ar: 'من', en: 'From' },
  'companies.arc.attachments': { ar: 'المرفقات', en: 'Attachments' },
  'companies.arc.empty': { ar: 'لا توجد مستندات', en: 'No documents' },
  'companies.arc.empty_hint': { ar: 'لم تُؤرشف أي مستندات لهذه الشركة', en: 'No documents archived for this company' },

  // Inventory txn types
  'companies.txn.IN': { ar: 'إدخال', en: 'Inbound' },
  'companies.txn.OUT': { ar: 'إخراج', en: 'Outbound' },
  'companies.txn.TRANSFER': { ar: 'تحويل', en: 'Transfer' },
  'companies.txn.RETURN': { ar: 'إرجاع', en: 'Return' },
  'companies.txn.ADJUST': { ar: 'تسوية', en: 'Adjust' },

  // Doc types
  'companies.dtype.CV': { ar: 'سيرة ذاتية', en: 'CV' },
  'companies.dtype.MESSAGE': { ar: 'رسالة', en: 'Message' },
  'companies.dtype.EMAIL_EXT': { ar: 'بريد خارجي', en: 'External Email' },
  'companies.dtype.EMAIL_INT': { ar: 'بريد داخلي', en: 'Internal Email' },
  'companies.dtype.NEWS': { ar: 'خبر', en: 'News' },
  'companies.dtype.FINANCIAL': { ar: 'مستند مالي', en: 'Financial' },

  // Employment types
  'companies.etype.FULL': { ar: 'دوام كامل', en: 'Full-time' },
  'companies.etype.PART': { ar: 'دوام جزئي', en: 'Part-time' },
  'companies.etype.CONTRACT': { ar: 'عقد', en: 'Contract' },
  'companies.etype.TEMP': { ar: 'مؤقت', en: 'Temporary' },

  // Misc
  'companies.not_found': { ar: 'لم يتم العثور على الشركة', en: 'Company not found' },
  'companies.not_found_hint': {
    ar: 'الشركة المطلوبة غير موجودة أو تم حذفها',
    en: 'The requested company does not exist or was removed',
  },
  'companies.back_to_list': { ar: 'العودة إلى الشركات', en: 'Back to Companies' },

  // Company management (accountant only)
  'companies.add_btn': { ar: 'إضافة شركة', en: 'Add Company' },
  'companies.add_title': { ar: 'إضافة شركة جديدة', en: 'New Company' },
  'companies.edit_title': { ar: 'تعديل الشركة', en: 'Edit Company' },
  'companies.edit_btn': { ar: 'تعديل الشركة', en: 'Edit company' },
  'companies.delete_btn': { ar: 'حذف الشركة', en: 'Delete company' },
  'companies.saving': { ar: 'جارٍ الحفظ...', en: 'Saving...' },
  'companies.saved': { ar: 'تم حفظ الشركة', en: 'Company saved' },
  'companies.deleted': { ar: 'تم حذف الشركة', en: 'Company deleted' },
  'companies.confirm_delete': {
    ar: 'هل أنت متأكد من حذف «{name}»؟ سجلات الشركة (موظفون، آليات، قيود...) ستبقى لكن دون شركة. لا يمكن التراجع.',
    en: 'Delete “{name}”? Its records (employees, vehicles, entries...) remain but without a company. This cannot be undone.',
  },
  'companies.f_name_ar': { ar: 'اسم الشركة (عربي)', en: 'Name (Arabic)' },
  'companies.f_name_en': { ar: 'اسم الشركة (إنجليزي)', en: 'Name (English)' },
  'companies.f_code': { ar: 'الرمز', en: 'Code' },
  'companies.f_city': { ar: 'المدينة', en: 'City' },
  'companies.f_phone': { ar: 'الهاتف', en: 'Phone' },
  'companies.f_email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'companies.f_status': { ar: 'الحالة', en: 'Status' },
})
