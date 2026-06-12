import { registerStrings } from '../../i18n/strings'

// Module-local strings ('warehouse.*').
registerStrings({
  // Page
  'warehouse.title': { ar: 'إدارة المستودعات', en: 'Warehouse Management' },
  'warehouse.subtitle': {
    ar: 'الأصناف والمخزون وحركات الإدخال والإخراج',
    en: 'Items, stock and inventory movements',
  },

  // KPIs
  'warehouse.kpi.items': { ar: 'إجمالي الأصناف', en: 'Total Items' },
  'warehouse.kpi.items_hint': { ar: 'صنف مسجل', en: 'registered items' },
  'warehouse.kpi.low_stock': { ar: 'أصناف منخفضة', en: 'Low Stock' },
  'warehouse.kpi.low_stock_hint': { ar: 'تحت الحد الأدنى', en: 'below minimum' },
  'warehouse.kpi.warehouses': { ar: 'عدد المستودعات', en: 'Warehouses' },
  'warehouse.kpi.warehouses_hint': { ar: 'مستودع نشط', en: 'active warehouses' },
  'warehouse.kpi.value': { ar: 'قيمة المخزون', en: 'Stock Value' },
  'warehouse.kpi.value_hint': { ar: 'بسعر التكلفة', en: 'at cost' },

  // Tabs
  'warehouse.tab.items': { ar: 'الأصناف', en: 'Items' },
  'warehouse.tab.transactions': { ar: 'الحركات', en: 'Movements' },
  'warehouse.tab.reports': { ar: 'التقارير', en: 'Reports' },

  // Items table
  'warehouse.items.new': { ar: 'صنف جديد', en: 'New Item' },
  'warehouse.items.search': { ar: 'بحث في الأصناف...', en: 'Search items...' },
  'warehouse.items.empty': { ar: 'لا توجد أصناف', en: 'No items' },
  'warehouse.items.empty_hint': {
    ar: 'أضف أول صنف عبر زر "صنف جديد"',
    en: 'Add your first item using the "New Item" button',
  },
  'warehouse.col.code': { ar: 'الرمز', en: 'Code' },
  'warehouse.col.name': { ar: 'الصنف', en: 'Item' },
  'warehouse.col.category': { ar: 'الفئة', en: 'Category' },
  'warehouse.col.uom': { ar: 'الوحدة', en: 'UoM' },
  'warehouse.col.unit_cost': { ar: 'سعر التكلفة', en: 'Unit Cost' },
  'warehouse.col.quantity': { ar: 'الكمية', en: 'Quantity' },
  'warehouse.col.stock_status': { ar: 'حالة المخزون', en: 'Stock Status' },
  'warehouse.col.value': { ar: 'القيمة', en: 'Value' },

  // Item form fields
  'warehouse.field.name_ar': { ar: 'الاسم (عربي)', en: 'Name (Arabic)' },
  'warehouse.field.name_en': { ar: 'الاسم (إنجليزي)', en: 'Name (English)' },
  'warehouse.field.code': { ar: 'الرمز', en: 'Code' },
  'warehouse.field.category': { ar: 'الفئة', en: 'Category' },
  'warehouse.field.uom': { ar: 'وحدة القياس', en: 'Unit of Measure' },
  'warehouse.field.min_stock': { ar: 'الحد الأدنى', en: 'Min Stock' },
  'warehouse.field.max_stock': { ar: 'الحد الأقصى', en: 'Max Stock' },
  'warehouse.field.unit_cost': { ar: 'سعر التكلفة', en: 'Unit Cost' },
  'warehouse.field.shelf_location': { ar: 'موقع الرف', en: 'Shelf Location' },

  // Stock status labels
  'warehouse.stock.IN_STOCK': { ar: 'متوفر', en: 'In Stock' },
  'warehouse.stock.LOW': { ar: 'منخفض', en: 'Low' },
  'warehouse.stock.OUT': { ar: 'نفد', en: 'Out' },

  // Transactions
  'warehouse.txn.new': { ar: 'حركة جديدة', en: 'New Movement' },
  'warehouse.txn.search': { ar: 'بحث في الحركات...', en: 'Search movements...' },
  'warehouse.txn.empty': { ar: 'لا توجد حركات', en: 'No movements' },
  'warehouse.txn.empty_hint': {
    ar: 'سجّل أول حركة مخزنية عبر زر "حركة جديدة"',
    en: 'Record your first movement using "New Movement"',
  },
  'warehouse.txn.serial': { ar: 'التسلسل', en: 'Serial' },
  'warehouse.txn.doc': { ar: 'رقم المستند', en: 'Doc No.' },
  'warehouse.txn.date': { ar: 'التاريخ', en: 'Date' },
  'warehouse.txn.type': { ar: 'النوع', en: 'Type' },
  'warehouse.txn.warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'warehouse.txn.total_value': { ar: 'إجمالي القيمة', en: 'Total Value' },
  'warehouse.txn.notes': { ar: 'ملاحظات', en: 'Notes' },

  // Txn types
  'warehouse.type.IN': { ar: 'إدخال', en: 'Inbound' },
  'warehouse.type.OUT': { ar: 'إخراج', en: 'Outbound' },
  'warehouse.type.TRANSFER': { ar: 'تحويل', en: 'Transfer' },
  'warehouse.type.RETURN': { ar: 'إرجاع', en: 'Return' },
  'warehouse.type.ADJUST': { ar: 'تسوية', en: 'Adjustment' },

  // New txn dialog
  'warehouse.txn.dialog_title': { ar: 'حركة مخزنية جديدة', en: 'New Inventory Movement' },
  'warehouse.txn.dialog_desc': {
    ar: 'سجّل عملية إدخال أو إخراج أو تحويل للأصناف',
    en: 'Record an inbound, outbound or transfer operation',
  },
  'warehouse.txn.field_type': { ar: 'نوع الحركة', en: 'Movement Type' },
  'warehouse.txn.field_warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'warehouse.txn.field_from_warehouse': { ar: 'المستودع المصدر', en: 'Source Warehouse' },
  'warehouse.txn.field_company': { ar: 'الشركة (اختياري)', en: 'Company (optional)' },
  'warehouse.txn.field_project': { ar: 'المشروع (اختياري)', en: 'Project (optional)' },
  'warehouse.txn.field_currency': { ar: 'العملة', en: 'Currency' },
  'warehouse.txn.field_date': { ar: 'التاريخ', en: 'Date' },
  'warehouse.txn.field_notes': { ar: 'ملاحظات', en: 'Notes' },
  'warehouse.txn.lines': { ar: 'بنود الحركة', en: 'Movement Lines' },
  'warehouse.txn.add_line': { ar: 'إضافة بند', en: 'Add Line' },
  'warehouse.txn.line_item': { ar: 'الصنف', en: 'Item' },
  'warehouse.txn.line_qty': { ar: 'الكمية', en: 'Quantity' },
  'warehouse.txn.line_price': { ar: 'سعر الوحدة', en: 'Unit Price' },
  'warehouse.txn.line_total': { ar: 'الإجمالي', en: 'Total' },
  'warehouse.txn.grand_total': { ar: 'القيمة الإجمالية', en: 'Grand Total' },
  'warehouse.txn.no_lines': { ar: 'أضف بنداً واحداً على الأقل', en: 'Add at least one line' },
  'warehouse.txn.select_item': { ar: 'اختر صنفاً', en: 'Select item' },
  'warehouse.txn.submit': { ar: 'تسجيل الحركة', en: 'Record Movement' },
  'warehouse.txn.created': { ar: 'تم تسجيل الحركة بنجاح', en: 'Movement recorded successfully' },

  // Txn detail
  'warehouse.txn.detail_title': { ar: 'تفاصيل الحركة', en: 'Movement Details' },
  'warehouse.txn.detail_lines': { ar: 'البنود', en: 'Lines' },

  // Reports
  'warehouse.reports.warehouse': { ar: 'المستودع', en: 'Warehouse' },
  'warehouse.reports.all': { ar: 'كل المستودعات', en: 'All Warehouses' },
  'warehouse.reports.low_stock_title': { ar: 'تنبيهات نقص المخزون', en: 'Low Stock Alerts' },
  'warehouse.reports.low_stock_empty': {
    ar: 'لا توجد أصناف تحت الحد الأدنى',
    en: 'No items below minimum',
  },
  'warehouse.reports.valuation_title': { ar: 'ملخص التقييم', en: 'Valuation Summary' },
  'warehouse.reports.total_items': { ar: 'عدد الأصناف', en: 'Items Count' },
  'warehouse.reports.total_qty': { ar: 'إجمالي الكميات', en: 'Total Quantity' },
  'warehouse.reports.total_value': { ar: 'إجمالي القيمة', en: 'Total Value' },
  'warehouse.reports.by_category': { ar: 'قيمة المخزون حسب الفئة', en: 'Stock Value by Category' },
  'warehouse.reports.min': { ar: 'الحد الأدنى', en: 'Min' },
  'warehouse.reports.current': { ar: 'المتوفر', en: 'Current' },

  // Warehouse names
  'warehouse.wh.WH-01': { ar: 'مستودع أبو غريب', en: 'Abu Ghraib Warehouse' },
  'warehouse.wh.WH-02': { ar: 'مستودع الدورة', en: 'Al-Dora Warehouse' },
})
