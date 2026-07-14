// Warehouse category taxonomy — the single source of truth for item categories.
// Two levels: category -> sub-category. Canonical IDs are stored in
// items.category / items.sub_category; display names live here (AR + EN) and are
// served to the frontend via GET /api/warehouse/categories. Ordering here is the
// display order in the UI (pipeline family first — it is the core business).
// Icons/colors are a frontend concern (src/modules/warehouse/categoryMeta.tsx).

export interface SubCategoryDef {
  id: string
  name_ar: string
  name_en: string
}

export interface CategoryDef {
  id: string
  name_ar: string
  name_en: string
  subs: SubCategoryDef[]
}

export const WAREHOUSE_TAXONOMY: CategoryDef[] = [
  {
    id: 'PIPES',
    name_ar: 'الأنابيب',
    name_en: 'Pipes',
    subs: [
      { id: 'DUCTILE', name_ar: 'أنابيب دكتايل', name_en: 'Ductile iron' },
      { id: 'STEEL_PIPES', name_ar: 'أنابيب حديد', name_en: 'Steel' },
      { id: 'PLASTIC_PIPES', name_ar: 'أنابيب بلاستيك', name_en: 'Plastic (PVC)' },
      { id: 'PIPE_CUTS', name_ar: 'كصات (قطع قصيرة)', name_en: 'Cut pieces' },
    ],
  },
  {
    id: 'FITTINGS',
    name_ar: 'ملحقات الأنابيب',
    name_en: 'Pipe Fittings',
    subs: [
      { id: 'FLANGES', name_ar: 'فلنجات', name_en: 'Flanges' },
      { id: 'BENDS', name_ar: 'عكوس وأكواع', name_en: 'Bends & elbows' },
      { id: 'REDUCERS', name_ar: 'مصغرات', name_en: 'Reducers' },
      { id: 'COUPLINGS', name_ar: 'كولرات وموصلات', name_en: 'Couplings & adaptors' },
      { id: 'GLANDS', name_ar: 'كلاندات', name_en: 'Glands' },
      { id: 'GASKETS', name_ar: 'واشرات', name_en: 'Gaskets & seals' },
      { id: 'FITTINGS_MISC', name_ar: 'ملحقات متنوعة', name_en: 'Other fittings' },
    ],
  },
  {
    id: 'VALVES',
    name_ar: 'الصمامات',
    name_en: 'Valves',
    subs: [
      { id: 'GATE_VALVES', name_ar: 'صمامات بوابة (أقفال)', name_en: 'Gate valves' },
      { id: 'BUTTERFLY_VALVES', name_ar: 'صمامات فراشة', name_en: 'Butterfly valves' },
      { id: 'VALVES_MISC', name_ar: 'صمامات أخرى', name_en: 'Other valves' },
    ],
  },
  {
    id: 'PUMPS',
    name_ar: 'المضخات والغطاسات',
    name_en: 'Pumps & Submersibles',
    subs: [
      { id: 'SUBMERSIBLES', name_ar: 'غطاسات', name_en: 'Submersible pumps' },
      { id: 'PUMPS_MOTORS', name_ar: 'مضخات وماطورات', name_en: 'Pumps & motors' },
      { id: 'HOSES', name_ar: 'صوندات وخراطيم', name_en: 'Hoses' },
      { id: 'PUMP_SPARES', name_ar: 'قطع غيار مضخات', name_en: 'Pump spares' },
    ],
  },
  {
    id: 'EQUIPMENT',
    name_ar: 'المعدات والمكائن',
    name_en: 'Equipment & Machinery',
    subs: [
      { id: 'DRILLING_EQ', name_ar: 'معدات الحفر', name_en: 'Drilling equipment' },
      { id: 'GENERATORS', name_ar: 'مولدات', name_en: 'Generators' },
      { id: 'CONSTRUCTION_EQ', name_ar: 'معدات إنشائية', name_en: 'Construction equipment' },
      { id: 'EQUIPMENT_SPARES', name_ar: 'قطع غيار وإطارات', name_en: 'Spares & tyres' },
      { id: 'APPLIANCES', name_ar: 'أجهزة مكتبية ومنزلية', name_en: 'Office & appliances' },
    ],
  },
  {
    id: 'ELECTRICAL',
    name_ar: 'الكهربائيات',
    name_en: 'Electrical',
    subs: [
      { id: 'CABLES', name_ar: 'كيبلات وأسلاك', name_en: 'Cables & wires' },
      { id: 'WIRING_FIXTURES', name_ar: 'تأسيسات ومفاتيح', name_en: 'Wiring & switchgear' },
      { id: 'ELECTRICAL_MISC', name_ar: 'كهربائيات أخرى', name_en: 'Other electrical' },
    ],
  },
  {
    id: 'CONSTRUCTION',
    name_ar: 'مواد البناء',
    name_en: 'Construction Materials',
    subs: [
      { id: 'STEEL_SECTIONS', name_ar: 'حديد ومقاطع وبليت', name_en: 'Steel sections & plate' },
      { id: 'CEMENT_AGGREGATES', name_ar: 'سمنت وركام', name_en: 'Cement & aggregates' },
      { id: 'TIMBER', name_ar: 'أخشاب', name_en: 'Timber' },
      { id: 'FORMWORK', name_ar: 'قوالب صب', name_en: 'Formwork' },
      { id: 'CONSTRUCTION_MISC', name_ar: 'مواد بناء أخرى', name_en: 'Other materials' },
    ],
  },
  {
    id: 'SCAFFOLDING',
    name_ar: 'السقالات',
    name_en: 'Scaffolding',
    subs: [
      { id: 'SCAFFOLD_CLAMPS', name_ar: 'قفايص', name_en: 'Clamps & couplers' },
      { id: 'SCAFFOLD_TUBES', name_ar: 'بواري وليجرات', name_en: 'Tubes & ledgers' },
      { id: 'SCAFFOLD_MISC', name_ar: 'ملحقات سقالات', name_en: 'Accessories' },
    ],
  },
  {
    id: 'FINISHING',
    name_ar: 'التشطيبات',
    name_en: 'Finishing',
    subs: [
      { id: 'TILES', name_ar: 'كاشي وسيراميك', name_en: 'Tiles & ceramics' },
      { id: 'PAINTS', name_ar: 'أصباغ ولواصق', name_en: 'Paints & adhesives' },
      { id: 'INSULATION', name_ar: 'عوازل', name_en: 'Insulation' },
      { id: 'FINISHING_MISC', name_ar: 'تشطيبات أخرى', name_en: 'Other finishing' },
    ],
  },
  { id: 'SANITARY', name_ar: 'الصحيات', name_en: 'Plumbing & Sanitary', subs: [] },
  {
    id: 'TOOLS',
    name_ar: 'العدد والأدوات',
    name_en: 'Tools & Hardware',
    subs: [
      { id: 'POWER_TOOLS', name_ar: 'عدد كهربائية', name_en: 'Power tools' },
      { id: 'HAND_TOOLS', name_ar: 'عدد يدوية', name_en: 'Hand tools' },
      { id: 'FASTENERS', name_ar: 'مسامير وبراغي', name_en: 'Fasteners' },
    ],
  },
  { id: 'SAFETY', name_ar: 'السلامة', name_en: 'Safety', subs: [] },
  {
    id: 'SITE',
    name_ar: 'تجهيزات الموقع',
    name_en: 'Site & Camp',
    subs: [
      { id: 'TANKS_BARRELS', name_ar: 'خزانات وبراميل', name_en: 'Tanks & barrels' },
      { id: 'CABINS', name_ar: 'كرفانات وحاويات', name_en: 'Cabins & containers' },
      { id: 'SITE_MISC', name_ar: 'تجهيزات متنوعة', name_en: 'Other site gear' },
    ],
  },
  { id: 'OTHER', name_ar: 'أخرى', name_en: 'Other', subs: [] },
]

/** Quick lookup: category id -> def. */
export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  WAREHOUSE_TAXONOMY.map((c) => [c.id, c]),
)
