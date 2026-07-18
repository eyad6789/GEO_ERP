# 🏭 Module 02 — Warehouse (المستودع)

---

## Overview
Manages inventory across two physical warehouse locations.

---

## 📍 Warehouse Locations

| ID | Name | Location |
|----|------|----------|
| WH-01 | مستودع أبو غريب | أبو غريب |
| WH-02 | مستودع الدورة | الدورة |

---

## 📦 Core Features

### Item Management
- Item Code (auto-generated)
- Item Name (Arabic + English)
- Category / Sub-category
- Unit of Measure (قطعة / متر / كيلو / لتر / طن...)
- Minimum Stock Level (حد أدنى)
- Maximum Stock Level (حد أقصى)
- Current Stock (per warehouse)
- Location in Warehouse (shelf/row/bin)
- Description + Image + Notes

### Transactions (الحركات)

| Type | Arabic | Description |
|------|--------|-------------|
| IN | وارد | Receiving items into warehouse |
| OUT | صادر | Issuing items from warehouse |
| TRANSFER | تحويل | Move between WH-01 ↔ WH-02 |
| RETURN | مرتجع | Return from project/site |
| ADJUST | تسوية | Inventory correction |

### Transaction Record Fields
```
{
  serial_number: auto          // رقم التسلسلي
  doc_number: string           // رقم الوثيقة
  date: DateTime
  type: IN|OUT|TRANSFER|RETURN|ADJUST
  warehouse: WH-01|WH-02
  from_warehouse?: WH          // for transfers
  items: [
    { item, quantity, unit, unit_price, total }
  ]
  project?: Project            // linked project
  company: Company
  currency: string
  total_value: number
  approved_by: User
  notes: string (private)
}
```

### Inventory Reports
- Current Stock Report (per warehouse / total)
- Low Stock Alerts
- Movement History (per item / per period)
- Valuation Report (FIFO / Average Cost)
- Transfer History between warehouses

---

## UI Layout
```
┌─────────────────────────────────────────────────┐
│  المستودع          [أبو غريب] [الدورة]  [الكل]  │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Dashboard Cards                     │
│ • Items  │  [إجمالي الأصناف] [وارد اليوم]       │
│ • IN     │  [صادر اليوم] [تحت الحد الأدنى]      │
│ • OUT    ├──────────────────────────────────────┤
│ • Trans  │  Items Table / Transaction Table      │
│ • Return │  + Search + Filter by warehouse       │
│ • Adjust │  + New Transaction Button             │
│ • Reports│  + Note Widget on each record         │
└──────────┴──────────────────────────────────────┘
```

---

## Claude Code Prompt (Warehouse Module)

```
Build the Warehouse module for an Arabic RTL ERP system using React + TypeScript + Tailwind CSS.

Requirements:
- RTL layout, Arabic labels
- Two warehouses: "مستودع أبو غريب" and "مستودع الدورة"
- Top tab switcher: أبو غريب | الدورة | الكل
- Dashboard showing 4 KPI cards: total items, today's IN, today's OUT, below minimum
- Items section: table with columns: كود الصنف, اسم الصنف, الفئة, وحدة القياس, المخزون الحالي, الحد الأدنى, الحالة (badge: كافي/منخفض/نفد)
- Transactions section: table with columns: رقم التسلسلي, رقم الوثيقة, التاريخ, النوع, المستودع, عدد الأصناف, القيمة الإجمالية, العملة
- New Transaction form (Dialog/Modal):
  * رقم الوثيقة, التاريخ, النوع (وارد/صادر/تحويل/مرتجع/تسوية)
  * المستودع, الشركة, المشروع
  * Dynamic items table: add/remove rows with الصنف, الكمية, الوحدة, سعر الوحدة, الإجمالي
  * Total auto-calculated
  * Note widget (private)
- Private note on every record
- Mock data for 10 items and 8 transactions
- Use shadcn/ui components
```
