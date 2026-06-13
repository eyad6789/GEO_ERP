# 📁 Module 01 — Archive (الأرشيف)

---

## Overview
The Archive is the company's central document and communication hub. It stores all incoming/outgoing communications, internal documents, financial records, and news.

---

## 📂 Sub-Sections

### 1. CVs (السير الذاتية)
- Company CVs (for vendors, partners, clients)
- Internal staff CVs (linked to HR module)
- Fields: Name, Type, Company, Date Added, File Attachment, Tags, Notes
- Search: by name, date, company, tags

### 2. Messages (الرسائل)
- Internal messages between system users
- Threaded conversations
- Attachments support
- Read/Unread status
- Priority: Normal / Urgent / Confidential
- Fields: From, To, CC, Subject, Body, Date, Attachments, Notes

### 3. Emails — Outside (البريد الخارجي)
- Emails received from / sent to external parties
- Link to company or project
- Fields: From/To (external), Subject, Date, Company, Project, Body, Attachments, Status (Pending/Replied/Archived), Notes

### 4. Emails — Inside (البريد الداخلي)
- Official internal memos / circulars
- Fields: Reference Number, Date, From Department, To Department, Subject, Body, Attachments, Notes

### 5. News (الأخبار)
- Company news, announcements, bulletins
- Fields: Title, Date, Category, Author, Body, Images, Visibility (All / Specific Roles), Notes

### 6. Money / Financial Documents (المالية)
- Scanned or uploaded financial documents
- Linked to accounting module
- Fields: Document Number, Date, Type (Invoice/Receipt/Contract), Amount, Currency, Company, Project, File, Notes

---

## 🔎 Archive Search (Global Search)
- Full-text search across all sub-sections
- Filter by: date range, type, company, project, tags
- Export results to Excel / PDF

---

## 📝 Note Field (per record)
```
NoteWidget {
  content: string         // Free text
  visibility: Role[]      // Who can see
  author: User
  timestamp: DateTime
  attachments: File[]
  pinned: boolean
}
```

---

## UI Layout
```
┌─────────────────────────────────────────────┐
│  Archive                          🔍 Search  │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Content Area                    │
│ • CVs    │  ┌──────────────────────────┐   │
│ • Msgs   │  │ List / Table View         │   │
│ • Ext.   │  │ + Filters + Sort          │   │
│   Email  │  └──────────────────────────┘   │
│ • Int.   │  ┌──────────────────────────┐   │
│   Email  │  │ Record Detail View        │   │
│ • News   │  │ + Note Widget (private)   │   │
│ • Money  │  └──────────────────────────┘   │
└──────────┴──────────────────────────────────┘
```

---

## Claude Code Prompt (Archive Module)

```
Build the Archive module for an Arabic RTL ERP system using React + TypeScript + Tailwind CSS.

Requirements:
- RTL layout (dir="rtl", Arabic labels)
- Sidebar with 6 sections: CVs, Messages, External Emails, Internal Emails, News, Money
- Each section has a data table with search, filter, sort, and pagination
- Each record opens a detail panel with all fields + a private Note widget
- Note widget: text area, visibility selector (role-based), timestamp auto-filled
- The table columns per section:
  * CVs: الاسم, النوع, الشركة, التاريخ, المرفقات
  * Messages: من, إلى, الموضوع, التاريخ, الحالة
  * External Email: من/إلى, الموضوع, الشركة, المشروع, التاريخ, الحالة
  * Internal Email: رقم المرجع, التاريخ, من قسم, إلى قسم, الموضوع
  * News: العنوان, التاريخ, الفئة, الكاتب
  * Money: رقم الوثيقة, التاريخ, النوع, المبلغ, العملة
- Use shadcn/ui Table, Dialog, Input, Select, Badge components
- Mock data for 5 records per section
- Global search bar at top that filters across all sections
```
