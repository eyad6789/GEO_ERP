// ============================================================================
// Fleet (الآليات) module i18n. This is the shared string CONTRACT for all four
// tabs — reuse these keys. A tab may register a few extra keys via its own
// registerStrings({...}) call if it needs them.
// ============================================================================
import { registerStrings } from '../../i18n/strings'

registerStrings({
  // ---- Page / header ----
  'fleet.title': { ar: 'إدارة الآليات', en: 'Fleet Management' },
  'fleet.subtitle': { ar: 'متابعة وصيانة وإدارة آليات المجموعة عبر كافة المشاريع', en: 'Track, maintain and oversee all company vehicles across every project' },
  'fleet.add': { ar: 'إضافة آلية', en: 'Add Vehicle' },
  'fleet.export': { ar: 'تصدير', en: 'Export' },

  // ---- Tabs ----
  'fleet.tab.vehicles': { ar: 'الآليات', en: 'Vehicles' },
  'fleet.tab.accounting': { ar: 'المالية', en: 'Accounting' },
  'fleet.tab.map': { ar: 'الخريطة والتتبع', en: 'Map & Tracking' },
  'fleet.tab.archive': { ar: 'الأرشيف', en: 'Archive' },

  // ---- KPIs (note 1: Total / Active / Inactive / In-Maintenance) ----
  'fleet.kpi.total': { ar: 'إجمالي الآليات', en: 'Total Fleet' },
  'fleet.kpi.total_hint': { ar: 'موزعة على المشاريع', en: 'Across all projects' },
  'fleet.kpi.active': { ar: 'الآليات العاملة', en: 'Active' },
  'fleet.kpi.active_hint': { ar: 'قيد التشغيل الآن', en: 'Operational now' },
  'fleet.kpi.inactive': { ar: 'الآليات المتوقفة', en: 'Inactive' },
  'fleet.kpi.inactive_hint': { ar: 'متوقفة عن العمل', en: 'Out of service' },
  'fleet.kpi.maintenance': { ar: 'في الصيانة', en: 'In Maintenance' },
  'fleet.kpi.maintenance_hint': { ar: 'في الورشة حالياً', en: 'Currently in workshop' },

  // ---- Charts ----
  'fleet.chart.status': { ar: 'توزيع حالة الآليات', en: 'Fleet Status Breakdown' },
  'fleet.chart.status_sub': { ar: 'الحالة التشغيلية لكل الآليات', en: 'Operational state of all vehicles' },
  'fleet.chart.by_project': { ar: 'الآليات حسب المشروع', en: 'Vehicles per Project' },
  'fleet.chart.by_project_sub': { ar: 'التوزيع على المواقع النشطة', en: 'Distribution across active sites' },
  'fleet.chart.by_type': { ar: 'الآليات حسب النوع', en: 'Vehicles by Type' },

  // ---- Inventory + toggle (note 5) ----
  'fleet.inventory.title': { ar: 'سجل الآليات', en: 'Vehicle Inventory' },
  'fleet.inventory.count': { ar: 'آلية', en: 'vehicles' },
  'fleet.toggle.by_type': { ar: 'حسب النوع', en: 'By Type' },
  'fleet.toggle.by_project': { ar: 'حسب المشروع', en: 'By Project' },
  'fleet.filter.all': { ar: 'الكل', en: 'All' },
  'fleet.card.details': { ar: 'عرض التفاصيل', en: 'View details' },
  'fleet.card.collapse': { ar: 'إخفاء', en: 'Collapse' },
  'fleet.card.no_project': { ar: 'في المقر / غير مخصصة', en: 'At HQ / unassigned' },
  'fleet.empty': { ar: 'لا توجد آليات', en: 'No vehicles' },
  'fleet.empty_hint': { ar: 'لم تتم إضافة أي آلية بعد', en: 'No vehicles added yet' },
  'fleet.show_all': { ar: 'عرض كل الآليات', en: 'Show all vehicles' },
  'fleet.search': { ar: 'بحث عن آلية...', en: 'Search vehicles...' },

  // ---- Vehicle fields (note 6) ----
  'fleet.field.type': { ar: 'نوع الآلية', en: 'Vehicle Type' },
  'fleet.field.name': { ar: 'الوصف', en: 'Description' },
  'fleet.field.plate': { ar: 'رقم اللوحة', en: 'Plate Number' },
  'fleet.field.model_year': { ar: 'الموديل', en: 'Model Year' },
  'fleet.field.owner': { ar: 'المالك', en: 'Owner' },
  'fleet.field.registration_expiry': { ar: 'انتهاء صلاحية الإجازة', en: 'Registration Expiry' },
  'fleet.field.oil_change': { ar: 'تاريخ تبديل الزيت', en: 'Oil Change Date' },
  'fleet.field.status': { ar: 'الحالة', en: 'Status' },
  'fleet.field.location': { ar: 'الموقع', en: 'Location' },
  'fleet.field.project': { ar: 'المشروع', en: 'Project' },
  'fleet.field.driver': { ar: 'السائق', en: 'Driver' },
  'fleet.field.odometer': { ar: 'آخر عداد', en: 'Last Odometer' },
  'fleet.field.company': { ar: 'الشركة المشغّلة', en: 'Operating Company' },

  // ---- Registration-expiry alarm chips (note 6.4) ----
  'fleet.reg.expired': { ar: 'منتهية', en: 'Expired' },
  'fleet.reg.soon': { ar: 'قرب الانتهاء', en: 'Expiring soon' },
  'fleet.reg.ok': { ar: 'سارية', en: 'Valid' },
  'fleet.reg.none': { ar: 'غير مسجلة', en: 'Unregistered' },

  // ---- Add-vehicle dialog (note 6) ----
  'fleet.dialog.add_title': { ar: 'إضافة آلية جديدة', en: 'Add New Vehicle' },
  'fleet.dialog.add_hint': { ar: 'البيانات المالية (السعر، الصيانة، الوقود) تُدخل من قسم المحاسبة فقط', en: 'Financial data (price, maintenance, fuel) is entered only from the Accounting section' },
  'fleet.dialog.project_hint': { ar: 'اختياري — يُحدد تلقائياً من الموقع أو يدوياً', en: 'Optional — set automatically by location or manually' },

  // ---- Map tab (note 2) ----
  'fleet.map.title': { ar: 'خريطة الآليات المباشرة — العراق', en: 'Live Fleet Map — Iraq' },
  'fleet.map.overview': { ar: 'نظرة عامة على الأسطول', en: 'Fleet Overview' },
  'fleet.map.full': { ar: 'الخريطة الكاملة', en: 'Full Map' },
  'fleet.map.legend.active': { ar: 'عاملة', en: 'Active' },
  'fleet.map.legend.maintenance': { ar: 'صيانة', en: 'Maintenance' },
  'fleet.map.legend.idle': { ar: 'متوقفة', en: 'Idle' },
  'fleet.map.legend.site': { ar: 'موقع مشروع', en: 'Project Site' },
  'fleet.map.legend.masterplan': { ar: 'مخطط رئيسي', en: 'Master Plan' },
  'fleet.map.onsite': { ar: 'آليات في المواقع', en: 'On-Site Vehicles' },
  'fleet.map.projects_active': { ar: 'مشاريع نشطة', en: 'Active Projects' },
  'fleet.map.masterplans': { ar: 'مخططات رئيسية', en: 'Master Plans' },
  'fleet.map.popup.heading': { ar: 'متجهة إلى', en: 'Heading to' },
  'fleet.map.popup.driver': { ar: 'السائق', en: 'Driver' },

  // ---- Accounting tab (note 4 — read-only) ----
  'fleet.acc.readonly': { ar: 'عرض فقط — تُحرَّر البيانات المالية من قسم المحاسبة', en: 'View only — financial data is edited in the Accounting section' },
  'fleet.acc.total_iqd': { ar: 'إجمالي التكاليف (دينار)', en: 'Total Cost (IQD)' },
  'fleet.acc.total_usd': { ar: 'إجمالي التكاليف (دولار)', en: 'Total Cost (USD)' },
  'fleet.acc.maintenance': { ar: 'مصاريف الصيانة', en: 'Maintenance Spend' },
  'fleet.acc.fuel': { ar: 'مصاريف الوقود', en: 'Fuel Spend' },
  'fleet.acc.by_type': { ar: 'التكلفة حسب نوع الآلية', en: 'Cost by Vehicle Type' },
  'fleet.acc.by_project': { ar: 'التكلفة حسب المشروع', en: 'Cost per Project' },
  'fleet.acc.monthly': { ar: 'التكاليف الشهرية', en: 'Monthly Cost Trend' },
  'fleet.acc.iqd': { ar: 'دينار', en: 'IQD' },
  'fleet.acc.usd': { ar: 'دولار', en: 'USD' },
  'fleet.acc.category': { ar: 'البند', en: 'Category' },
  'fleet.acc.cat.PURCHASE': { ar: 'الشراء', en: 'Purchase' },
  'fleet.acc.cat.MAINTENANCE': { ar: 'الصيانة', en: 'Maintenance' },
  'fleet.acc.cat.FUEL': { ar: 'الوقود', en: 'Fuel' },
  'fleet.acc.cat.PARTS': { ar: 'القطع', en: 'Parts' },

  // ---- Archive tab ----
  'fleet.arch.registration': { ar: 'إجازات السوق وأوراق الآليات', en: 'Vehicle Registration Papers' },
  'fleet.arch.drivers': { ar: 'مستندات السائقين', en: 'Driver Documents' },
  'fleet.arch.sold': { ar: 'الآليات المباعة والخارجة عن الخدمة', en: 'Sold & Retired Vehicles' },
  'fleet.arch.sold_cars': { ar: 'الآليات المباعة', en: 'Sold Vehicles' },
  'fleet.arch.retired_cars': { ar: 'الآليات الخارجة عن الخدمة', en: 'Retired / Out of Service' },
  'fleet.arch.documents': { ar: 'المستندات المؤرشفة', en: 'Archived Documents' },
  'fleet.arch.expiring': { ar: 'قرب الانتهاء', en: 'Expiring Soon' },
  'fleet.arch.valid': { ar: 'سارية', en: 'Valid' },
  'fleet.arch.expired': { ar: 'منتهية', en: 'Expired' },
  'fleet.arch.placeholder': { ar: 'سيتم رفع المستندات الفعلية لاحقاً', en: 'Actual documents will be uploaded later' },
  'fleet.arch.view_all': { ar: 'عرض الكل', en: 'View all' },
  'fleet.arch.docs_short': { ar: 'وثيقة', en: 'docs' },

  // ---- Vehicle type labels ----
  'fleet.type.CAR': { ar: 'سيارة', en: 'Light Vehicle' },
  'fleet.type.PICKUP': { ar: 'بيك أب', en: 'Pickup' },
  'fleet.type.MIXER': { ar: 'خباطة', en: 'Concrete Mixer' },
  'fleet.type.EXCAVATOR': { ar: 'حفارة', en: 'Excavator' },
  'fleet.type.LOADER': { ar: 'شفل', en: 'Wheel Loader' },
  'fleet.type.BULLDOZER': { ar: 'جرافة', en: 'Bulldozer / Grader' },
  'fleet.type.CRANE': { ar: 'كرين', en: 'Crane' },
  'fleet.type.DUMP_TRUCK': { ar: 'قلاب', en: 'Dump Truck' },
  'fleet.type.LIFT': { ar: 'رافعة', en: 'Lift / Forklift' },
  'fleet.type.ROLLER': { ar: 'حادلة', en: 'Road Roller' },
  'fleet.type.DUMPER': { ar: 'دنبر', en: 'Dumper' },
  'fleet.type.TANKER': { ar: 'تانكر', en: 'Tanker' },
  'fleet.type.PUMP': { ar: 'مضخة', en: 'Concrete Pump' },
  'fleet.type.MISC': { ar: 'أخرى', en: 'Other' },
})
