// AUTO-GENERATED from مخزن ابي غريب.xlsx (column "الاخراج المخزني") and
// مخزن الدورة1-6-26.xlsx (column "ملاحظات 2", sheet "مواد داخلة للمخزن وتخرج",
// sheet "مواد مستلمة من اليرموك"). Real dated/free-text movement events between
// the two main warehouses and the projects that received transferred material.
// Do not hand-edit; regenerate from the Excel if it changes.

export type TransferDirection = 'IN' | 'OUT'
export type TransferDestination = 'JALAWLA' | 'KHAN_DHARI' | 'YARMOUK' | 'ABU_GHRAIB_WAREHOUSE' | null

export interface WarehouseTransferRow {
  item_code: string
  direction: TransferDirection
  quantity: number | null
  uom: string | null
  date: string | null
  destination: TransferDestination
  destination_text: string | null
  notes: string
}

export const WAREHOUSE_TRANSFERS: WarehouseTransferRow[] = [
  { item_code: "ITM-AG-004", direction: "OUT", quantity: 1, uom: "كونية", date: "2025-03-03", destination: "KHAN_DHARI", destination_text: null, notes: "خروج 1 كونية الى خان ضاري 2025/3/3" },
  { item_code: "ITM-AG-022", direction: "OUT", quantity: null, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري" },
  { item_code: "ITM-AG-024", direction: "OUT", quantity: null, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري" },
  { item_code: "ITM-AG-030", direction: "OUT", quantity: null, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري" },
  { item_code: "ITM-AG-045", direction: "OUT", quantity: null, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري" },
  { item_code: "ITM-AG-049", direction: "OUT", quantity: 2, uom: "قطعة", date: "2025-01-07", destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري عدد 2 تاريخ 25/1/7" },
  { item_code: "ITM-AG-054", direction: "OUT", quantity: 58, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "نقل 58 / خان ضاري" },
  { item_code: "ITM-AG-059", direction: "OUT", quantity: 60, uom: "قطعة", date: "2026-01-01", destination: "JALAWLA", destination_text: null, notes: "نقل قياس 600 عدد 60 الى جلولا ء شهر 26/1" },
  { item_code: "ITM-AG-083", direction: "OUT", quantity: 3, uom: "قطعة", date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج 3 / خان ضاري" },
  { item_code: "ITM-AG-088", direction: "OUT", quantity: 1, uom: "قطعة", date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج 1 / خان ضاري" },
  { item_code: "ITM-AG-105", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-01-09", destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري 9/1/2025" },
  { item_code: "ITM-AG-126", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-03-04", destination: null, destination_text: "المنصورية", notes: "خروج عدد 1 الى المنصورية 2025/3/4" },
  { item_code: "ITM-AG-149", direction: "OUT", quantity: null, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "الى خان ظاري" },
  { item_code: "ITM-AG-181", direction: "OUT", quantity: 1, uom: "قطعة", date: null, destination: null, destination_text: "ديالى", notes: "خروج 1/ديالى" },
  { item_code: "ITM-AG-187", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-02-09", destination: null, destination_text: "المنصورية", notes: "خروج عدد 1 الى المنصورية 2025/2/9" },
  { item_code: "ITM-AG-259", direction: "OUT", quantity: null, uom: null, date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري" },
  { item_code: "ITM-AG-353", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-02-03", destination: null, destination_text: "المنصورية", notes: "خروج الى المنصورية عدد 1 تاريخ 2025/2/3" },
  { item_code: "ITM-AG-355", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-01-09", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 1الى خان ضاري تاريخ 25/1/09" },
  { item_code: "ITM-AG-357", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-01-09", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 1الى خان ضاري تاريخ 25/1/09" },
  { item_code: "ITM-AD-005", direction: "OUT", quantity: 3, uom: "قطعة", date: null, destination: "KHAN_DHARI", destination_text: null, notes: "سحب مولد 200kv + 25kv+150kv   /خان ضاري" },
  { item_code: "ITM-AD-014", direction: "OUT", quantity: 2, uom: "قطعة", date: null, destination: "KHAN_DHARI", destination_text: null, notes: "سحب بوليمة (2) الى خان ضاري" },
  { item_code: "ITM-AD-016", direction: "OUT", quantity: 4, uom: "قطعة", date: "2026-01-08", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد4 الى خان ضاري 8/1/2026" },
  { item_code: "ITM-AD-018", direction: "OUT", quantity: null, uom: null, date: null, destination: null, destination_text: null, notes: "خروج من المخزن" },
  { item_code: "ITM-AD-020", direction: "OUT", quantity: 1, uom: "قطعة", date: "2018-01-25", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 1 الى خان ضاري تاريخ 25/1/18" },
  { item_code: "ITM-AD-022", direction: "OUT", quantity: 50, uom: "متر", date: "2025-02-25", destination: "KHAN_DHARI", destination_text: null, notes: "خروج طول 50 م الى خان ضاري 2025/2/25" },
  { item_code: "ITM-AD-031", direction: "OUT", quantity: null, uom: null, date: null, destination: null, destination_text: null, notes: "خروج المكسر + بورد التشغيل (تم البيع)" },
  { item_code: "ITM-AD-037", direction: "OUT", quantity: null, uom: null, date: null, destination: null, destination_text: null, notes: "خروج من المخزن" },
  { item_code: "ITM-AD-042", direction: "OUT", quantity: null, uom: null, date: null, destination: null, destination_text: null, notes: "خروج من المخزن" },
  { item_code: "ITM-AD-047", direction: "OUT", quantity: null, uom: null, date: null, destination: "JALAWLA", destination_text: null, notes: "خروج 30 واشر الى جلولاء" },
  { item_code: "ITM-AD-049", direction: "OUT", quantity: 4, uom: "قطعة", date: "2025-04-29", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 4 الى خان ضاري 2025/4/29" },
  { item_code: "ITM-AD-054", direction: "OUT", quantity: null, uom: null, date: "2024-10-29", destination: "ABU_GHRAIB_WAREHOUSE", destination_text: null, notes: "خروج 1 الى أبو غريب 29/10/2024" },
  { item_code: "ITM-AD-062", direction: "OUT", quantity: 3, uom: "قطعة", date: "2024-10-20", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد3 /خان ضاري 20/10/2024" },
  { item_code: "ITM-AD-063", direction: "OUT", quantity: 3, uom: "قطعة", date: "2025-10-20", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد3 /خان ضاري 20/10/2025" },
  { item_code: "ITM-AD-066", direction: "OUT", quantity: null, uom: null, date: null, destination: null, destination_text: null, notes: "خروج / جديد غير مستعمل" },
  { item_code: "ITM-AD-068", direction: "OUT", quantity: null, uom: null, date: null, destination: null, destination_text: "المنصورية", notes: "خروج المواد الى المنصورية" },
  { item_code: "ITM-AD-172", direction: "OUT", quantity: 4, uom: "قطعة", date: "2025-03-04", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 4 الى خان ضاري 2025/3/4" },
  { item_code: "ITM-AD-176", direction: "OUT", quantity: 47, uom: "متر", date: "2025-03-04", destination: "KHAN_DHARI", destination_text: null, notes: "خروج الى خان ضاري طول 47 م 2025/3/4" },
  { item_code: "ITM-AD-296", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-03-20", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 1 الى خان ضاري 2025/3/20" },
  { item_code: "ITM-AD-331", direction: "OUT", quantity: 2, uom: "قطعة", date: null, destination: null, destination_text: null, notes: "خروج سرير ذو نفرين عدد 2 + سرسر لنفر4" },
  { item_code: "ITM-AD-335", direction: "OUT", quantity: 6, uom: "قطعة", date: "2025-02-25", destination: null, destination_text: "المنصورية", notes: "خروج عدد 6 الى المنصورية  2025/2/25" },
  { item_code: "ITM-AD-422", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-03-25", destination: null, destination_text: "المنصورية", notes: "خروج عدد 1 الى المنصورية 2025/3/25" },
  { item_code: "ITM-AD-442", direction: "OUT", quantity: 8, uom: "قطعة", date: "2025-01-25", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 8 الى خان ضاري 2025/1/25" },
  { item_code: "ITM-AD-540", direction: "OUT", quantity: 2, uom: "قطعة", date: "2025-02-05", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 2 الى خان ضاري 2025/2/5" },
  { item_code: "ITM-AD-541", direction: "OUT", quantity: 15, uom: "قطعة", date: null, destination: "KHAN_DHARI", destination_text: null, notes: "خروج طول (3م+4م+5م)عدد 15 /خان ضاري 27/2" },
  { item_code: "ITM-AD-549", direction: "OUT", quantity: 12, uom: "قطعة", date: "2024-10-22", destination: null, destination_text: null, notes: "خروج عدد  12 22/10/2024" },
  { item_code: "ITM-AD-550", direction: "OUT", quantity: 1, uom: "قطعة", date: "2024-10-22", destination: null, destination_text: null, notes: "خروج عدد1 22/10/2024" },
  { item_code: "ITM-AD-609", direction: "OUT", quantity: 4, uom: "قطعة", date: "2025-01-25", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 4 الى خان ضاري 2025/1/25" },
  { item_code: "ITM-AD-610", direction: "OUT", quantity: 5, uom: "قطعة", date: "2025-01-25", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 5 الى خان ضاري 2025/1/25" },
  { item_code: "ITM-AD-611", direction: "OUT", quantity: 2, uom: "قطعة", date: "2025-01-25", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 2 الى خان ضاري 2025/1/25" },
  { item_code: "ITM-AD-663", direction: "OUT", quantity: 1, uom: "قطعة", date: "2025-01-21", destination: "KHAN_DHARI", destination_text: null, notes: "خروج عدد 1 دبل فلنج الى خان ضاري 2025/1/21" },
  { item_code: "ITM-AD-X01", direction: "IN", quantity: 22, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "متضرره" },
  { item_code: "ITM-AD-X02", direction: "IN", quantity: 2, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X03", direction: "IN", quantity: 1, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X04", direction: "IN", quantity: 6, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X05", direction: "IN", quantity: 1, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X06", direction: "IN", quantity: 1, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "عاطل" },
  { item_code: "ITM-AD-X07", direction: "IN", quantity: 1, uom: null, date: "2024-06-26", destination: "YARMOUK", destination_text: null, notes: "عاطل" },
  { item_code: "ITM-AD-X08", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X09", direction: "IN", quantity: 2, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X10", direction: "IN", quantity: 2, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X11", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "خروج لاحقاً الى مقر الشركة 16/5/2025" },
  { item_code: "ITM-AD-X12", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "مع مقعد شرقي و دوش و مغسلة" },
  { item_code: "ITM-AD-X13", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X14", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X15", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X16", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X17", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X18", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X19", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X20", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X21", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X22", direction: "IN", quantity: 1, uom: null, date: "2024-08-31", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X23", direction: "IN", quantity: 1, uom: null, date: "2024-02-09", destination: "YARMOUK", destination_text: null, notes: "وارد" },
  { item_code: "ITM-AD-X26", direction: "OUT", quantity: 1, uom: "زوج", date: "2024-10-14", destination: null, destination_text: "المنصورية", notes: "الى المنصورية" },
  { item_code: "ITM-AD-X27", direction: "OUT", quantity: 6, uom: "قوطية", date: "2024-10-16", destination: null, destination_text: "المنصوية مع أبو عدنان", notes: "الى المنصوية مع أبو عدنان" },
  { item_code: "ITM-AD-X28", direction: "OUT", quantity: 1, uom: "سطل", date: "2024-10-20", destination: "ABU_GHRAIB_WAREHOUSE", destination_text: null, notes: "الى أبو غريب" },
]
