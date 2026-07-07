import { registerStrings } from '../../i18n/strings'

// Module-local strings ('hr.*').
registerStrings({
  // Page / shell
  'hr.title': { ar: 'الموارد البشرية', en: 'Human Resources' },
  'hr.subtitle': { ar: 'إدارة الموظفين والرواتب والحضور والإجازات', en: 'Employees, payroll, attendance & leave management' },

  // Tabs
  'hr.tab.employees': { ar: 'قائمة الموظفين', en: 'Employees' },
  'hr.tab.org': { ar: 'الهيكل التنظيمي', en: 'Org Chart' },
  'hr.tab.departments': { ar: 'الأقسام', en: 'Departments' },
  'hr.tab.attendance': { ar: 'الحضور', en: 'Attendance' },
  'hr.tab.leaves': { ar: 'الإجازات', en: 'Leaves' },
  'hr.tab.gifts': { ar: 'الهدايا', en: 'Gifts' },
  'hr.tab.payroll': { ar: 'الرواتب', en: 'Payroll' },
  'hr.tab.advances': { ar: 'السلف', en: 'Advances' },
  'hr.tab.reviews': { ar: 'التقييم', en: 'Performance' },

  // KPIs
  'hr.kpi.employees': { ar: 'إجمالي الموظفين', en: 'Total Employees' },
  'hr.kpi.active': { ar: 'الموظفون النشطون', en: 'Active Employees' },
  'hr.kpi.departments': { ar: 'الأقسام', en: 'Departments' },
  'hr.kpi.pending_leaves': { ar: 'إجازات معلقة', en: 'Pending Leaves' },
  'hr.kpi.payroll_net': { ar: 'صافي الرواتب', en: 'Net Payroll' },
  'hr.kpi.advances_balance': { ar: 'رصيد السلف', en: 'Advances Balance' },

  // Employees table
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
  'hr.emp.search': { ar: 'بحث عن موظف بالاسم أو الرقم...', en: 'Search employees by name or number...' },
  'hr.emp.empty': { ar: 'لا يوجد موظفون', en: 'No employees' },
  'hr.emp.empty_hint': { ar: 'أضف أول موظف للبدء', en: 'Add your first employee to get started' },

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

  // Attendance
  'hr.att.check_in': { ar: 'وقت الحضور', en: 'Check In' },
  'hr.att.check_out': { ar: 'وقت الانصراف', en: 'Check Out' },
  'hr.att.empty': { ar: 'لا توجد سجلات حضور', en: 'No attendance records' },

  // Leaves
  'hr.leave.type': { ar: 'نوع الإجازة', en: 'Leave Type' },
  'hr.leave.start': { ar: 'من تاريخ', en: 'Start' },
  'hr.leave.end': { ar: 'إلى تاريخ', en: 'End' },
  'hr.leave.days': { ar: 'عدد الأيام', en: 'Days' },
  'hr.leave.reason': { ar: 'السبب', en: 'Reason' },
  'hr.leave.approve': { ar: 'اعتماد', en: 'Approve' },
  'hr.leave.reject': { ar: 'رفض', en: 'Reject' },
  'hr.leave.empty': { ar: 'لا توجد طلبات إجازة', en: 'No leave requests' },
  'hr.leave.approved_toast': { ar: 'تم اعتماد الإجازة', en: 'Leave approved' },
  'hr.leave.rejected_toast': { ar: 'تم رفض الإجازة', en: 'Leave rejected' },

  // Gifts
  'hr.gift.occasion': { ar: 'المناسبة', en: 'Occasion' },
  'hr.gift.type': { ar: 'النوع', en: 'Type' },
  'hr.gift.value': { ar: 'القيمة', en: 'Value' },
  'hr.gift.CASH': { ar: 'نقدي', en: 'Cash' },
  'hr.gift.IN_KIND': { ar: 'عيني', en: 'In Kind' },
  'hr.gift.VOUCHER': { ar: 'قسيمة', en: 'Voucher' },
  'hr.gift.empty': { ar: 'لا توجد هدايا', en: 'No gifts' },

  // Payroll
  'hr.pay.period': { ar: 'الفترة', en: 'Period' },
  'hr.pay.basic': { ar: 'الأساسي', en: 'Basic' },
  'hr.pay.allowances': { ar: 'البدلات', en: 'Allowances' },
  'hr.pay.deductions': { ar: 'الاستقطاعات', en: 'Deductions' },
  'hr.pay.net': { ar: 'صافي الراتب', en: 'Net Salary' },
  'hr.pay.total_net': { ar: 'إجمالي صافي الرواتب', en: 'Total Net Payroll' },
  'hr.pay.empty': { ar: 'لا توجد رواتب', en: 'No payroll records' },

  // Advances
  'hr.adv.amount': { ar: 'المبلغ', en: 'Amount' },
  'hr.adv.monthly': { ar: 'الخصم الشهري', en: 'Monthly Deduction' },
  'hr.adv.balance': { ar: 'الرصيد المتبقي', en: 'Remaining Balance' },
  'hr.adv.empty': { ar: 'لا توجد سلف', en: 'No advances' },

  // Reviews
  'hr.rev.period': { ar: 'الفترة', en: 'Period' },
  'hr.rev.rating': { ar: 'التقييم العام', en: 'Overall Rating' },
  'hr.rev.comments': { ar: 'ملاحظات المدير', en: 'Manager Comments' },
  'hr.rev.goals': { ar: 'الأهداف', en: 'Goals' },
  'hr.rev.empty': { ar: 'لا توجد تقييمات', en: 'No performance reviews' },

  // Employee detail
  'hr.detail.back': { ar: 'العودة للموارد البشرية', en: 'Back to HR' },
  'hr.detail.not_found': { ar: 'لم يتم العثور على الموظف', en: 'Employee not found' },
  'hr.detail.tab.info': { ar: 'المعلومات', en: 'Information' },
  'hr.detail.tab.documents': { ar: 'المستندات', en: 'Documents' },
  'hr.detail.tab.attendance': { ar: 'الحضور', en: 'Attendance' },
  'hr.detail.tab.leaves': { ar: 'الإجازات', en: 'Leaves' },
  'hr.detail.tab.payroll': { ar: 'الرواتب', en: 'Payroll' },
  'hr.detail.tab.advances': { ar: 'السلف', en: 'Advances' },
  'hr.detail.tab.reviews': { ar: 'التقييم', en: 'Performance' },

  // Edit employee
  'hr.edit.title': { ar: 'تعديل بيانات الموظف', en: 'Edit Employee' },

  // Documents (ID / license / contract scans)
  'hr.doc.upload': { ar: 'رفع مستند', en: 'Upload document' },
  'hr.doc.uploading': { ar: 'جارٍ الرفع…', en: 'Uploading…' },
  'hr.doc.uploaded': { ar: 'تم رفع المستند', en: 'Document uploaded' },
  'hr.doc.delete': { ar: 'حذف المستند', en: 'Delete document' },
  'hr.doc.deleted': { ar: 'تم حذف المستند', en: 'Document deleted' },
  'hr.doc.confirm_delete': { ar: 'هل تريد حذف هذا المستند؟', en: 'Delete this document?' },
  'hr.doc.empty': { ar: 'لا توجد مستندات — ارفع الهوية أو الإجازة أو العقد.', en: 'No documents — upload an ID, license or contract.' },
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
