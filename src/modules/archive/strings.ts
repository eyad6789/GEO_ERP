import { registerStrings } from '../../i18n/strings'

// Module-local strings ('archive.*').
registerStrings({
  // Page / header
  'archive.title': { ar: 'الأرشيف الإلكتروني', en: 'Electronic Archive' },
  'archive.subtitle': {
    ar: 'مركز إدارة وأرشفة الوثائق والمراسلات والمستندات المالية',
    en: 'Central hub for documents, correspondence and financial records',
  },
  'archive.new_document': { ar: 'مستند جديد', en: 'New Document' },
  'archive.search_placeholder': {
    ar: 'بحث في العنوان، الرقم المرجعي، الموضوع...',
    en: 'Search title, reference number, subject...',
  },

  // KPIs
  'archive.kpi.total': { ar: 'إجمالي المستندات', en: 'Total Documents' },
  'archive.kpi.in_type': { ar: 'ضمن التصنيف الحالي', en: 'In current category' },
  'archive.kpi.attachments': { ar: 'المرفقات', en: 'Attachments' },
  'archive.kpi.attachments_hint': { ar: 'ملف مرفق بالمستندات', en: 'files attached to documents' },
  'archive.kpi.financial_value': { ar: 'القيمة المالية', en: 'Financial Value' },
  'archive.kpi.financial_hint': { ar: 'مجموع المستندات المالية', en: 'sum of financial documents' },
  'archive.kpi.recent': { ar: 'مستندات حديثة', en: 'Recent Documents' },
  'archive.kpi.recent_hint': { ar: 'خلال آخر 30 يوماً', en: 'within the last 30 days' },

  // Tabs (doc types)
  'archive.type.CV': { ar: 'السير الذاتية', en: 'CVs' },
  'archive.type.MESSAGE': { ar: 'الرسائل', en: 'Messages' },
  'archive.type.EMAIL_EXT': { ar: 'البريد الخارجي', en: 'External Mail' },
  'archive.type.EMAIL_INT': { ar: 'البريد الداخلي', en: 'Internal Mail' },
  'archive.type.NEWS': { ar: 'الأخبار', en: 'News' },
  'archive.type.FINANCIAL': { ar: 'المالية', en: 'Financial' },

  // Columns / fields
  'archive.col.title': { ar: 'العنوان', en: 'Title' },
  'archive.col.category': { ar: 'التصنيف', en: 'Category' },
  'archive.col.author': { ar: 'المُعد', en: 'Author' },
  'archive.col.date': { ar: 'التاريخ', en: 'Date' },
  'archive.col.attachments': { ar: 'المرفقات', en: 'Attachments' },
  'archive.col.ref_number': { ar: 'الرقم المرجعي', en: 'Reference No.' },
  'archive.col.subject': { ar: 'الموضوع', en: 'Subject' },
  'archive.col.from': { ar: 'من', en: 'From' },
  'archive.col.to': { ar: 'إلى', en: 'To' },
  'archive.col.cc': { ar: 'نسخة إلى', en: 'CC' },
  'archive.col.amount': { ar: 'المبلغ', en: 'Amount' },
  'archive.col.doc_status': { ar: 'الحالة', en: 'Status' },
  'archive.col.tags': { ar: 'الوسوم', en: 'Tags' },
  'archive.col.body': { ar: 'المحتوى', en: 'Body' },
  'archive.col.company': { ar: 'الشركة', en: 'Company' },

  // Filters
  'archive.filter.company': { ar: 'كل الشركات', en: 'All Companies' },

  // Dialog
  'archive.dialog.document': { ar: 'تفاصيل المستند', en: 'Document Details' },
  'archive.dialog.no_subject': { ar: 'بدون موضوع', en: 'No subject' },
  'archive.dialog.no_body': { ar: 'لا يوجد محتوى نصي لهذا المستند.', en: 'No text content for this document.' },
  'archive.dialog.parties': { ar: 'أطراف المراسلة', en: 'Correspondence Parties' },
  'archive.dialog.meta': { ar: 'بيانات المستند', en: 'Document Metadata' },
  'archive.dialog.attachments_count': { ar: 'عدد المرفقات', en: 'Attachments count' },
  'archive.dialog.read_more': { ar: 'قراءة المزيد', en: 'Read more' },

  // News card grid
  'archive.news.empty': { ar: 'لا توجد أخبار', en: 'No news yet' },
  'archive.news.empty_hint': {
    ar: 'لم يتم نشر أي أخبار ضمن هذا التصنيف بعد',
    en: 'No news has been published in this category yet',
  },

  // Create form
  'archive.form.title': { ar: 'إضافة مستند جديد', en: 'Add New Document' },
  'archive.form.description': {
    ar: 'سجّل مستنداً جديداً في الأرشيف الإلكتروني',
    en: 'Register a new document in the electronic archive',
  },
  'archive.form.doc_type': { ar: 'نوع المستند', en: 'Document Type' },

  // Empty
  'archive.empty': { ar: 'لا توجد مستندات', en: 'No documents' },
  'archive.empty_hint': {
    ar: 'لم يتم العثور على مستندات مطابقة لهذا التصنيف',
    en: 'No documents found for this category',
  },
})
