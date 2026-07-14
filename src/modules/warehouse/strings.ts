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
  'warehouse.kpi.out_of_stock': { ar: 'أصناف نافدة', en: 'Out of Stock' },
  'warehouse.kpi.out_of_stock_hint': { ar: 'نفد من المخزون بالكامل', en: 'fully depleted' },

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
  'warehouse.col.spec': { ar: 'المواصفة', en: 'Spec' },
  'warehouse.col.sub_category': { ar: 'الفئة الفرعية', en: 'Sub-category' },
  'warehouse.col.size': { ar: 'القياس', en: 'Size' },

  // View toggle (cards vs. table)
  'warehouse.view.cards': { ar: 'بطاقات', en: 'Cards' },
  'warehouse.view.table': { ar: 'جدول', en: 'Table' },

  // Category explorer
  'warehouse.explorer.items_unit': { ar: 'صنف', en: 'items' },
  'warehouse.explorer.all_sizes': { ar: 'كل القياسات', en: 'All sizes' },
  'warehouse.explorer.results': { ar: 'نتيجة', en: 'results' },
  'warehouse.explorer.no_results': { ar: 'لا توجد نتائج مطابقة', en: 'No matching results' },
  'warehouse.explorer.item_detail': { ar: 'تفاصيل الصنف', en: 'Item Details' },
  'warehouse.explorer.size': { ar: 'القياس', en: 'Size' },
  'warehouse.explorer.distribution': { ar: 'التوزيع على المستودعات', en: 'Warehouse Distribution' },
  'warehouse.explorer.no_stock': { ar: 'لا يوجد رصيد لهذا الصنف', en: 'No stock for this item' },
  'warehouse.explorer.recent_moves': { ar: 'آخر الحركات', en: 'Recent Movements' },

  // Item form fields
  'warehouse.field.name_ar': { ar: 'الاسم (عربي)', en: 'Name (Arabic)' },
  'warehouse.field.name_en': { ar: 'الاسم (إنجليزي)', en: 'Name (English)' },
  'warehouse.field.code': { ar: 'الرمز', en: 'Code' },
  'warehouse.field.category': { ar: 'الفئة', en: 'Category' },
  'warehouse.field.sub_category': { ar: 'الفئة الفرعية', en: 'Sub-category' },
  'warehouse.field.uom': { ar: 'وحدة القياس', en: 'Unit of Measure' },
  'warehouse.field.min_stock': { ar: 'الحد الأدنى', en: 'Min Stock' },
  'warehouse.field.max_stock': { ar: 'الحد الأقصى', en: 'Max Stock' },
  'warehouse.field.unit_cost': { ar: 'سعر التكلفة', en: 'Unit Cost' },
  'warehouse.field.shelf_location': { ar: 'موقع الرف', en: 'Shelf Location' },
  'warehouse.field.spec': { ar: 'المواصفة / القياس', en: 'Spec / Dimension' },
  'warehouse.field.spec_hint': { ar: 'مثال: قطر 250 ملم، طول 6 متر', en: 'e.g. Ø250mm, 6m length' },

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
  'warehouse.reports.by_category_count': { ar: 'الأصناف حسب الفئة', en: 'Items by Category' },
  'warehouse.reports.item_count': { ar: 'عدد الأصناف', en: 'Item count' },
  'warehouse.reports.out_of_stock': { ar: 'أصناف نافدة', en: 'Out of Stock' },
  'warehouse.reports.min': { ar: 'الحد الأدنى', en: 'Min' },
  'warehouse.reports.current': { ar: 'المتوفر', en: 'Current' },
  'warehouse.reports.recent_transfers': { ar: 'أحدث التحويلات', en: 'Recent Transfers' },

  // Warehouse type (MAIN physical store vs. PROJECT site) — warehouse names
  // themselves come from each warehouse's own name_ar/name_en record, not a key here.
  'warehouse.wh_type.MAIN': { ar: 'رئيسي', en: 'Main' },
  'warehouse.wh_type.PROJECT': { ar: 'مشروع', en: 'Project' },

  // Simplified item form (storekeeper-friendly: one name, auto code, no min/max)
  'warehouse.field.name': { ar: 'اسم الصنف', en: 'Item Name' },
  'warehouse.field.name_hint': { ar: 'اكتبه بالعربية أو الإنجليزية — كما يناسبك', en: 'Write it in Arabic or English — whatever suits you' },
  'warehouse.field.uom_pick': { ar: 'اختر وحدة أو اكتب وحدتك', en: 'Pick a unit or type your own' },
  'warehouse.field.size': { ar: 'القياس', en: 'Size' },
  'warehouse.field.size_hint': { ar: 'اختر قطراً شائعاً أو اكتب أي قياس', en: 'Pick a common diameter or type any size' },
  'warehouse.field.code_auto': { ar: 'الرمز يُنشأ تلقائياً', en: 'Code is generated automatically' },
  'warehouse.field.optional': { ar: 'اختياري', en: 'optional' },

  // Movement dialog — cart-style lines, no prices
  'warehouse.txn.items': { ar: 'الأصناف', en: 'Items' },
  'warehouse.txn.add_item': { ar: 'أضف صنفاً...', en: 'Add an item...' },
  'warehouse.txn.available': { ar: 'المتوفر', en: 'Available' },
  'warehouse.txn.exceeds': { ar: 'الكمية أكبر من المتوفر في المستودع', en: 'Quantity exceeds available stock' },
  'warehouse.txn.more_options': { ar: 'خيارات إضافية', en: 'More options' },
  'warehouse.txn.to_warehouse': { ar: 'إلى المستودع', en: 'To Warehouse' },
  'warehouse.txn.no_items_yet': { ar: 'ابحث وأضف الأصناف من الحقل أعلاه', en: 'Search and add items from the field above' },

  // Movements flow map
  'warehouse.view.flow': { ar: 'المخطط', en: 'Flow' },
  'warehouse.flow.external_in': { ar: 'توريد خارجي', en: 'External supply' },
  'warehouse.flow.external_out': { ar: 'صرف / استهلاك', en: 'Issued / consumed' },
  'warehouse.flow.movements': { ar: 'حركة', en: 'movements' },
  'warehouse.flow.route_title': { ar: 'حركات المسار', en: 'Route movements' },
  'warehouse.flow.pick_route': { ar: 'اضغط على أي خط لعرض حركاته', en: 'Click any line to see its movements' },
  'warehouse.flow.qty_total': { ar: 'إجمالي الكمية', en: 'Total quantity' },
  'warehouse.flow.sent': { ar: 'صادر', en: 'sent' },
  'warehouse.flow.received': { ar: 'وارد', en: 'received' },

  // Track-item view — "where is this pipe and what happened to it?"
  'warehouse.view.track': { ar: 'تتبع صنف', en: 'Track Item' },
  'warehouse.track.prompt': { ar: 'أين هذا الصنف؟', en: 'Where is this item?' },
  'warehouse.track.hint': { ar: 'اكتب اسم الصنف أو رمزه أو قياسه لتعرف أين يوجد وما الذي جرى عليه', en: 'Type an item name, code or size to see where it is and what happened to it' },
  'warehouse.track.now_title': { ar: 'أين هو الآن؟', en: 'Where is it now?' },
  'warehouse.track.history_title': { ar: 'رحلة الصنف', en: 'Item journey' },
  'warehouse.track.no_stock': { ar: 'لا يوجد رصيد حالياً لهذا الصنف في أي مستودع', en: 'No stock anywhere for this item right now' },
  'warehouse.track.no_moves': { ar: 'لم يتحرك هذا الصنف منذ الجرد الأول', en: 'This item has not moved since the opening count' },
  'warehouse.track.last_move': { ar: 'آخر حركة', en: 'Last movement' },
  'warehouse.track.total_now': { ar: 'الإجمالي الحالي', en: 'Current total' },
  'warehouse.track.from': { ar: 'من', en: 'from' },
  'warehouse.track.to': { ar: 'إلى', en: 'to' },

  // Activity feed — "what happened in my warehouses lately?"
  'warehouse.view.activity': { ar: 'آخر النشاط', en: 'Activity' },
  'warehouse.activity.today': { ar: 'اليوم', en: 'Today' },
  'warehouse.activity.yesterday': { ar: 'أمس', en: 'Yesterday' },
  'warehouse.activity.more_items': { ar: 'أصناف أخرى', en: 'more items' },
  'warehouse.activity.empty': { ar: 'لا يوجد نشاط مسجل بعد', en: 'No recorded activity yet' },
  'warehouse.activity.item_count': { ar: 'صنف', en: 'items' },
  'warehouse.explorer.projects': { ar: 'المشاريع', en: 'Projects' },

  // Smart dialect search
  'warehouse.search.did_you_mean': { ar: 'هل تقصد؟', en: 'Did you mean?' },
  'warehouse.search.saved': { ar: 'حُفظت — سيفهمها البحث من الآن', en: 'Saved — search will understand it from now on' },

  // Reorder radar (alert thresholds)
  'warehouse.radar.title': { ar: 'رادار إعادة الطلب', en: 'Reorder Radar' },
  'warehouse.radar.set_min': { ar: 'حد التنبيه', en: 'Alert threshold' },
  'warehouse.radar.set_min_bulk': { ar: 'حد التنبيه للمعروض', en: 'Threshold for shown items' },
  'warehouse.radar.min_hint': { ar: 'نبّهني إذا قلّت الكمية عن هذا الرقم', en: 'Alert me when quantity drops below this' },
  'warehouse.radar.updated': { ar: 'تم تعيين حد التنبيه', en: 'Threshold saved' },
  'warehouse.radar.empty': { ar: 'لا توجد أصناف وصلت حد التنبيه', en: 'No items at their alert threshold' },
  'warehouse.radar.below': { ar: 'ناقص عن الحد', en: 'below threshold' },

  // Item photos (camera)
  'warehouse.photos.add': { ar: 'أضف صورة', en: 'Add photo' },
  'warehouse.photos.uploading': { ar: 'جارٍ الرفع...', en: 'Uploading...' },
  'warehouse.photos.uploaded': { ar: 'تمت إضافة الصورة', en: 'Photo added' },

  // Custody (عهدة)
  'warehouse.txn.received_by': { ar: 'المستلم', en: 'Received by' },
  'warehouse.txn.received_by_hint': { ar: 'اسم من استلم المواد', en: 'Who received the goods' },
  'warehouse.txn.is_loan': { ar: 'عهدة (تُرجع لاحقاً)', en: 'Loan (to be returned)' },
  'warehouse.view.custody': { ar: 'العهدة', en: 'Custody' },
  'warehouse.custody.open': { ar: 'عهد مفتوحة', en: 'Open loans' },
  'warehouse.custody.returned': { ar: 'عهد مرجعة', en: 'Returned' },
  'warehouse.custody.mark_returned': { ar: 'تم الإرجاع', en: 'Mark returned' },
  'warehouse.custody.returned_ok': { ar: 'أُرجعت العهدة وسُجلت حركة الإرجاع', en: 'Loan returned — return movement recorded' },
  'warehouse.custody.days': { ar: 'يوم', en: 'days' },
  'warehouse.custody.since': { ar: 'منذ', en: 'since' },
  'warehouse.custody.empty': { ar: 'لا توجد عهد مفتوحة', en: 'No open loans' },
  'warehouse.custody.by_person': { ar: 'حسب الشخص', en: 'By person' },

  // Delivery slip (سند التسليم)
  'warehouse.slip.print': { ar: 'طباعة السند', en: 'Print slip' },
  'warehouse.slip.whatsapp': { ar: 'مشاركة واتساب', en: 'Share to WhatsApp' },
  'warehouse.slip.title': { ar: 'سند تسليم مواد', en: 'Delivery Note' },
  'warehouse.slip.deliverer': { ar: 'المسلّم', en: 'Deliverer' },
  'warehouse.slip.receiver': { ar: 'المستلم', en: 'Receiver' },
  'warehouse.slip.driver': { ar: 'السائق', en: 'Driver' },
  'warehouse.slip.signature': { ar: 'التوقيع', en: 'Signature' },
  'warehouse.slip.sign_here': { ar: 'وقّع بإصبعك هنا', en: 'Sign here with your finger' },
  'warehouse.slip.sign_save': { ar: 'حفظ التوقيع', en: 'Save signature' },
  'warehouse.slip.sign_clear': { ar: 'مسح', en: 'Clear' },
  'warehouse.slip.signed': { ar: 'حُفظ توقيع الاستلام', en: 'Receiver signature saved' },
  'warehouse.slip.capture_sign': { ar: 'توقيع الاستلام', en: 'Receiver signature' },

  // Duplicate merge
  'warehouse.merge.button': { ar: 'دمج المكررات', en: 'Merge duplicates' },
  'warehouse.merge.title': { ar: 'الأصناف المكررة', en: 'Duplicate items' },
  'warehouse.merge.desc': { ar: 'مجموعات متطابقة الاسم والقياس — اختر الصنف الذي يبقى وسيُدمج الباقي فيه (الرصيد والحركات تُنقل إليه)', en: 'Groups with identical name & size — pick the survivor; stock and history move into it' },
  'warehouse.merge.keep': { ar: 'يبقى', en: 'Keep' },
  'warehouse.merge.do': { ar: 'دمج المجموعة', en: 'Merge group' },
  'warehouse.merge.done': { ar: 'تم الدمج', en: 'Merged' },
  'warehouse.merge.empty': { ar: 'لا توجد أصناف مكررة', en: 'No duplicates left' },
  'warehouse.merge.groups': { ar: 'مجموعة', en: 'groups' },

  // Item condition
  'warehouse.condition.label': { ar: 'الحالة', en: 'Condition' },
  'warehouse.condition.NEW': { ar: 'جديد', en: 'New' },
  'warehouse.condition.GOOD': { ar: 'شغال', en: 'Working' },
  'warehouse.condition.USED': { ar: 'مستعمل', en: 'Used' },
  'warehouse.condition.NEEDS_REPAIR': { ar: 'بحاجة صيانة', en: 'Needs repair' },
  'warehouse.condition.BROKEN': { ar: 'عاطل', en: 'Broken' },

  // In-warehouse location (rooms/containers)
  'warehouse.field.location': { ar: 'الموقع في المخزن', en: 'Location in warehouse' },
})
