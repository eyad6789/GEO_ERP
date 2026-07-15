import { registerStrings } from '../../i18n/strings'

// Module-local strings ('hr.*').
registerStrings({
  // Page / shell
  'hr.title': { ar: 'الموارد البشرية', en: 'Human Resources' },
  'hr.subtitle': { ar: 'إدارة الموظفين والحضور والإجازات — مكتب بغداد', en: 'Employees, attendance & leave management — Baghdad office' },

  // Tabs
  'hr.tab.employees': { ar: 'قائمة الموظفين', en: 'Employees' },
  'hr.tab.departments': { ar: 'الأقسام', en: 'Departments' },
  'hr.tab.attendance': { ar: 'الحضور', en: 'Attendance' },
  'hr.tab.leaves': { ar: 'الإجازات', en: 'Leaves' },

  // KPIs
  'hr.kpi.employees': { ar: 'إجمالي الموظفين', en: 'Total Employees' },
  'hr.kpi.present_today': { ar: 'الحاضرون اليوم', en: 'Present Today' },
  'hr.kpi.pending_requests': { ar: 'طلبات قيد الانتظار', en: 'Pending Requests' },
  'hr.kpi.worked_hours': { ar: 'ساعات العمل (الشهر)', en: 'Worked Hours (Month)' },
  'hr.kpi.of_total': { ar: 'من أصل {n} موظفاً', en: 'of {n} employees' },
  'hr.kpi.inquiries_hint': { ar: 'منها {n} استفسار', en: '{n} awaiting an answer' },

  // Filters (month + employee)
  'hr.filter.month': { ar: 'الشهر', en: 'Month' },
  'hr.filter.year': { ar: 'السنة', en: 'Year' },
  'hr.filter.prev_month': { ar: 'الشهر السابق', en: 'Previous month' },
  'hr.filter.next_month': { ar: 'الشهر التالي', en: 'Next month' },
  'hr.filter.employee': { ar: 'الموظف', en: 'Employee' },
  'hr.filter.all_employees': { ar: 'كل الموظفين', en: 'All employees' },
  'hr.filter.current_month': { ar: 'الشهر الحالي', en: 'Current month' },

  // Leave types (stored value stays Arabic — these are the display labels)
  'hr.ltype.سنوية': { ar: 'سنوية', en: 'Annual' },
  'hr.ltype.اضطرارية': { ar: 'اضطرارية', en: 'Emergency' },
  'hr.ltype.مرضية': { ar: 'مرضية', en: 'Sick' },
  'hr.ltype.أمومة': { ar: 'أمومة', en: 'Maternity' },
  'hr.ltype.بدون راتب': { ar: 'بدون راتب', en: 'Unpaid' },
  'hr.ltype.زمنية': { ar: 'زمنية', en: 'Hourly' },

  // Employee cards
  'hr.card.worked_hours': { ar: 'ساعات العمل هذا الشهر', en: 'Worked hours this month' },
  'hr.card.hours_left': { ar: 'الساعات المتبقية', en: 'Hours remaining' },
  'hr.card.leave_left': { ar: 'رصيد الإجازات المتبقي', en: 'Leave days remaining' },
  'hr.card.hourly_left': { ar: 'رصيد الزمنية المتبقي', en: 'Hourly leave remaining' },
  'hr.card.of_hours': { ar: '{x} من {y} ساعة', en: '{x} of {y} hours' },
  'hr.card.of_days': { ar: '{x} من {y} يوم', en: '{x} of {y} days' },

  // Leaderboards
  'hr.board.top_hours': { ar: 'الأكثر ساعات عمل', en: 'Most Worked Hours' },
  'hr.board.top_leaves': { ar: 'الأكثر إجازات', en: 'Most Leave Days' },
  'hr.board.empty': { ar: 'لا توجد بيانات لهذا الشهر', en: 'No data for this month' },
  'hr.board.hours_unit': { ar: 'ساعة', en: 'h' },
  'hr.board.days_unit': { ar: 'يوم', en: 'days' },

  // Employees table / form
  'hr.emp.new': { ar: 'موظف جديد', en: 'New Employee' },
  'hr.emp.employee': { ar: 'الموظف', en: 'Employee' },
  'hr.emp.number': { ar: 'الرقم الوظيفي', en: 'Employee No.' },
  'hr.emp.job_title': { ar: 'المسمى الوظيفي', en: 'Job Title' },
  'hr.emp.department': { ar: 'القسم', en: 'Department' },
  'hr.emp.basic_salary': { ar: 'الراتب الأساسي', en: 'Basic Salary' },
  'hr.emp.employment_type': { ar: 'نوع التوظيف', en: 'Employment Type' },
  'hr.emp.hire_date': { ar: 'تاريخ التعيين', en: 'Hire Date' },
  'hr.emp.full_name_ar': { ar: 'الاسم الكامل (عربي)', en: 'Full Name (AR)' },
  'hr.emp.full_name_en': { ar: 'الاسم الكامل (إنجليزي)', en: 'Full Name (EN)' },
  'hr.emp.search': { ar: 'بحث عن موظف بالاسم أو الرقم أو الهاتف...', en: 'Search by name, number or phone...' },
  'hr.emp.empty': { ar: 'لا يوجد موظفون', en: 'No employees' },
  'hr.emp.empty_hint': { ar: 'أضف أول موظف للبدء', en: 'Add your first employee to get started' },
  'hr.emp.empty_company': {
    ar: 'لا يوجد موظفون في هذه الشركة — جميع الموظفين مسجّلون في مكتب بغداد التابع للشركة الأم. اختر «كل الشركات» من الأعلى لعرضهم.',
    en: 'No employees in this company — everyone is registered under the Baghdad office of the parent company. Choose “All companies” in the switcher above.',
  },

  // Employment types
  'hr.etype.FULL': { ar: 'دوام كامل', en: 'Full-time' },
  'hr.etype.PART': { ar: 'دوام جزئي', en: 'Part-time' },
  'hr.etype.CONTRACT': { ar: 'عقد', en: 'Contract' },
  'hr.etype.TEMP': { ar: 'مؤقت', en: 'Temporary' },

  // Gender / marital
  'hr.gender.MALE': { ar: 'ذكر', en: 'Male' },
  'hr.gender.FEMALE': { ar: 'أنثى', en: 'Female' },

  // Departments
  'hr.dept.manager': { ar: 'المدير', en: 'Manager' },
  'hr.dept.employees': { ar: 'عدد الموظفين', en: 'Employees' },
  'hr.dept.empty': { ar: 'لا توجد أقسام', en: 'No departments' },
  'hr.dept.no_employees': { ar: 'لا يوجد موظفون في هذا القسم', en: 'No employees in this department' },

  // Attendance
  'hr.att.check_in': { ar: 'وقت الحضور', en: 'Check In' },
  'hr.att.check_out': { ar: 'وقت الانصراف', en: 'Check Out' },
  'hr.att.worked_hours': { ar: 'ساعات العمل', en: 'Worked Hours' },
  'hr.att.empty': { ar: 'لا توجد سجلات حضور', en: 'No attendance records' },
  'hr.att.empty_hint': { ar: 'استورد ملف جهاز البصمة لتعبئة الحضور', en: 'Import the fingerprint-machine file to fill attendance' },
  'hr.att.history_title': { ar: 'سجل الحضور', en: 'Attendance History' },
  'hr.att.days': { ar: 'يوم', en: 'days' },
  'hr.att.import_btn': { ar: 'استيراد من جهاز البصمة', en: 'Import from fingerprint device' },
  'hr.att.importing': { ar: 'جارٍ الاستيراد…', en: 'Importing…' },
  'hr.att.import_done': { ar: 'تم الاستيراد: {new} سجل جديد، {upd} محدّث', en: 'Imported: {new} new, {upd} updated' },
  'hr.att.import_unmatched': { ar: '{n} صفوف بدون موظف مطابق', en: '{n} rows had no matching employee' },

  // Leaves — board
  'hr.leave.board.pending': { ar: 'قيد الانتظار', en: 'Pending' },
  'hr.leave.board.inquiry': { ar: 'استفسار', en: 'Inquiry' },
  'hr.leave.board.approved': { ar: 'الموافَق عليها', en: 'Approved' },
  'hr.leave.board.rejected': { ar: 'المرفوضة', en: 'Rejected' },
  'hr.leave.board.month_hint': {
    ar: 'المعلّقة والاستفسارات تظهر دائماً — الموافَق عليها والمرفوضة حسب الشهر المحدد',
    en: 'Pending & inquiries always show — approved/rejected follow the selected month',
  },
  'hr.leave.no_requests': { ar: 'لا توجد طلبات', en: 'No requests' },

  // Leaves — request + fields
  'hr.leave.type': { ar: 'نوع الإجازة', en: 'Leave Type' },
  'hr.leave.start': { ar: 'من تاريخ', en: 'Start' },
  'hr.leave.end': { ar: 'إلى تاريخ', en: 'End' },
  'hr.leave.days': { ar: 'عدد الأيام', en: 'Days' },
  'hr.leave.date': { ar: 'التاريخ', en: 'Date' },
  'hr.leave.hours': { ar: 'عدد الساعات', en: 'Hours' },
  'hr.leave.kind': { ar: 'نوع المدة', en: 'Duration type' },
  'hr.leave.kind_daily': { ar: 'يومية (أيام)', en: 'Daily (days)' },
  'hr.leave.kind_hourly': { ar: 'زمنية (ساعات)', en: 'Hourly' },
  'hr.leave.hourly_badge': { ar: 'زمنية · {n} ساعة', en: 'Hourly · {n}h' },
  'hr.leave.hours_hint': { ar: 'الرصيد الشهري {n} ساعات', en: 'Monthly allowance: {n} hours' },
  'hr.leave.reason': { ar: 'السبب', en: 'Reason' },
  'hr.leave.request_btn': { ar: 'طلب إجازة', en: 'Request Leave' },
  'hr.leave.request_title': { ar: 'طلب إجازة جديد', en: 'New Leave Request' },
  'hr.leave.requested_toast': { ar: 'تم إرسال طلب الإجازة — بانتظار الموافقة', en: 'Leave request submitted — pending approval' },
  'hr.leave.empty': { ar: 'لا توجد طلبات إجازة', en: 'No leave requests' },

  // Leaves — decisions
  'hr.leave.approve': { ar: 'اعتماد', en: 'Approve' },
  'hr.leave.reject': { ar: 'رفض', en: 'Reject' },
  'hr.leave.approved_toast': { ar: 'تم اعتماد الإجازة', en: 'Leave approved' },
  'hr.leave.rejected_toast': { ar: 'تم رفض الإجازة', en: 'Leave rejected' },
  'hr.leave.decision': { ar: 'قرار الإدارة', en: 'Decision Note' },
  'hr.leave.decision_approve_title': { ar: 'اعتماد الإجازة', en: 'Approve Leave' },
  'hr.leave.decision_reject_title': { ar: 'رفض الإجازة', en: 'Reject Leave' },
  'hr.leave.decision_note': { ar: 'سبب القرار (يُحفظ مع الطلب)', en: 'Reason for the decision (saved with the request)' },
  'hr.leave.decision_note_ph': { ar: 'مثال: رصيده يسمح والعمل لا يتأثر', en: 'e.g. balance allows it and work is not affected' },
  'hr.leave.decided_by': { ar: 'اعتمدها', en: 'Decided by' },

  // Leaves — inquiry (manager asks why) + answer
  'hr.leave.ask_btn': { ar: 'استفسار', en: 'Ask why' },
  'hr.leave.ask_title': { ar: 'استفسار عن سبب الإجازة', en: 'Ask about this leave' },
  'hr.leave.ask_label': { ar: 'سؤال المدير (يُعرض للموظف)', en: 'Manager’s question (shown to the employee)' },
  'hr.leave.ask_ph': { ar: 'لماذا تريد الإجازة؟', en: 'Why do you need this leave?' },
  'hr.leave.ask_sent': { ar: 'تم إرسال الاستفسار للموظف', en: 'Question sent to the employee' },
  'hr.leave.answer_btn': { ar: 'الرد على السؤال', en: 'Answer' },
  'hr.leave.answer_title': { ar: 'الرد على استفسار المدير', en: 'Answer the manager’s question' },
  'hr.leave.answer_label': { ar: 'رد الموظف', en: 'Employee’s answer' },
  'hr.leave.answer_ph': { ar: 'اكتب سبب الإجازة بالتفصيل…', en: 'Explain the reason in detail…' },
  'hr.leave.answer_sent': { ar: 'تم إرسال الرد', en: 'Answer sent' },
  'hr.leave.waiting_answer': { ar: 'بانتظار رد الموظف…', en: 'Waiting for the employee’s answer…' },
  'hr.leave.question_label': { ar: 'سؤال المدير', en: 'Manager’s question' },

  // Leaves — balances (detail page tiles)
  'hr.leave.account_title': { ar: 'رصيد الإجازات', en: 'Leave Account' },
  'hr.leave.days_this_year': { ar: 'يوماً معتمداً في {year}', en: 'approved days in {year}' },
  'hr.leave.days_all_time': { ar: 'إجمالي الأيام المعتمدة', en: 'total approved days' },
  'hr.leave.days_pending': { ar: 'أيام قيد الموافقة', en: 'days pending approval' },

  // Employee detail
  'hr.detail.back': { ar: 'العودة للموارد البشرية', en: 'Back to HR' },
  'hr.detail.not_found': { ar: 'لم يتم العثور على الموظف', en: 'Employee not found' },
  'hr.detail.month_stats': { ar: 'إحصائيات الشهر', en: 'This Month' },
  'hr.detail.tab.info': { ar: 'المعلومات', en: 'Information' },
  'hr.detail.tab.documents': { ar: 'المستندات', en: 'Documents' },
  'hr.detail.tab.attendance': { ar: 'الحضور', en: 'Attendance' },
  'hr.detail.tab.leaves': { ar: 'الإجازات', en: 'Leaves' },

  // Edit employee
  'hr.edit.title': { ar: 'تعديل بيانات الموظف', en: 'Edit Employee' },

  // Profile photo
  'hr.photo.upload': { ar: 'تغيير الصورة الشخصية', en: 'Change profile photo' },
  'hr.photo.delete': { ar: 'إزالة الصورة', en: 'Remove photo' },
  'hr.photo.saved': { ar: 'تم حفظ الصورة الشخصية', en: 'Profile photo saved' },
  'hr.photo.deleted': { ar: 'تمت إزالة الصورة', en: 'Photo removed' },
  'hr.photo.confirm_delete': { ar: 'هل تريد إزالة الصورة الشخصية؟', en: 'Remove the profile photo?' },

  // Documents (ID / license / contract scans)
  'hr.doc.upload': { ar: 'رفع مستند', en: 'Upload document' },
  'hr.doc.uploading': { ar: 'جارٍ الرفع…', en: 'Uploading…' },
  'hr.doc.uploaded': { ar: 'تم رفع المستند', en: 'Document uploaded' },
  'hr.doc.delete': { ar: 'حذف المستند', en: 'Delete document' },
  'hr.doc.deleted': { ar: 'تم حذف المستند', en: 'Document deleted' },
  'hr.doc.confirm_delete': { ar: 'هل تريد حذف هذا المستند؟', en: 'Delete this document?' },
  'hr.doc.empty': { ar: 'لا توجد مستندات — ارفع الهوية أو الإجازة أو العقد.', en: 'No documents — upload an ID, license or contract.' },
  'hr.doc.PHOTO': { ar: 'الصورة الشخصية', en: 'Profile photo' },
  'hr.doc.NATIONAL_ID': { ar: 'هوية / بطاقة وطنية', en: 'National ID' },
  'hr.doc.DRIVER_LICENSE': { ar: 'إجازة سوق', en: 'Driver license' },
  'hr.doc.PASSPORT': { ar: 'جواز سفر', en: 'Passport' },
  'hr.doc.CONTRACT': { ar: 'عقد عمل', en: 'Contract' },
  'hr.doc.CERTIFICATE': { ar: 'شهادة', en: 'Certificate' },
  'hr.doc.OTHER': { ar: 'أخرى', en: 'Other' },

  // Info sections
  'hr.info.identity': { ar: 'المعلومات الشخصية', en: 'Identity' },
  'hr.info.contact': { ar: 'معلومات الاتصال', en: 'Contact' },
  'hr.info.employment': { ar: 'بيانات التوظيف', en: 'Employment' },
  'hr.info.financial': { ar: 'البيانات المالية', en: 'Financial' },

  // Identity fields
  'hr.f.national_id': { ar: 'الرقم الوطني', en: 'National ID' },
  'hr.f.dob': { ar: 'تاريخ الميلاد', en: 'Date of Birth' },
  'hr.f.place_of_birth': { ar: 'مكان الولادة', en: 'Place of Birth' },
  'hr.f.nationality': { ar: 'الجنسية', en: 'Nationality' },
  'hr.f.religion': { ar: 'الديانة', en: 'Religion' },
  'hr.f.gender': { ar: 'الجنس', en: 'Gender' },
  'hr.f.marital_status': { ar: 'الحالة الاجتماعية', en: 'Marital Status' },
  'hr.f.children_count': { ar: 'عدد الأطفال', en: 'Children' },

  // Contact fields
  'hr.f.phone_primary': { ar: 'الهاتف الأساسي', en: 'Primary Phone' },
  'hr.f.phone_secondary': { ar: 'الهاتف الثانوي', en: 'Secondary Phone' },
  'hr.f.email_work': { ar: 'البريد الوظيفي', en: 'Work Email' },
  'hr.f.email_personal': { ar: 'البريد الشخصي', en: 'Personal Email' },
  'hr.f.address': { ar: 'العنوان', en: 'Address' },
  'hr.f.emergency_name': { ar: 'جهة اتصال الطوارئ', en: 'Emergency Contact' },
  'hr.f.emergency_phone': { ar: 'هاتف الطوارئ', en: 'Emergency Phone' },

  // Employment fields
  'hr.f.company': { ar: 'الشركة', en: 'Company' },
  'hr.f.department': { ar: 'القسم', en: 'Department' },
  'hr.f.job_title': { ar: 'المسمى الوظيفي', en: 'Job Title' },
  'hr.f.employment_type': { ar: 'نوع التوظيف', en: 'Employment Type' },
  'hr.f.hire_date': { ar: 'تاريخ التعيين', en: 'Hire Date' },
  'hr.f.contract_end': { ar: 'نهاية العقد', en: 'Contract End' },
  'hr.f.manager': { ar: 'المدير المباشر', en: 'Reports To' },
  'hr.f.status': { ar: 'الحالة', en: 'Status' },

  // Financial fields
  'hr.f.basic_salary': { ar: 'الراتب الأساسي', en: 'Basic Salary' },
  'hr.f.salary_currency': { ar: 'عملة الراتب', en: 'Salary Currency' },
  'hr.f.bank_name': { ar: 'اسم البنك', en: 'Bank Name' },
  'hr.f.bank_account': { ar: 'رقم الحساب', en: 'Account No.' },
  'hr.f.iban': { ar: 'الآيبان', en: 'IBAN' },
})
