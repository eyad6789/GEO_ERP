// Print a single journal entry as an A4 voucher in a popup window. The browser's
// print dialog lets the user "Save as PDF" — no extra dependency needed.
import type { Account } from '../../types'
import { formatCurrency, formatDate, pickName } from '../../lib/format'
import type { JournalEntryFull } from './shared'

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string))
}

export function printJournalEntry(
  entry: JournalEntryFull,
  accMap: Record<string, Account>,
  lang: 'ar' | 'en',
) {
  // Currency is per line (tasarif entries mix currencies). Each line prints in
  // its own currency; the total uses that currency if all lines match, else the
  // balanced dinar value (Σ amount × rate).
  const lineCur = (l: { currency?: string }) => l.currency || entry.currency || 'IQD'
  const curSet = new Set(entry.lines.map((l) => l.currency || entry.currency || 'IQD'))
  const singleCurrency = curSet.size === 1 ? [...curSet][0] : null
  let dinarDebit = 0
  let dinarCredit = 0
  for (const l of entry.lines) {
    const r = l.price && l.price > 0 ? l.price : 1
    dinarDebit += (l.debit || 0) * r
    dinarCredit += (l.credit || 0) * r
  }
  const totalDebitStr = singleCurrency ? formatCurrency(entry.total_debit, singleCurrency, lang) : formatCurrency(dinarDebit, 'IQD', lang)
  const totalCreditStr = singleCurrency ? formatCurrency(entry.total_credit, singleCurrency, lang) : formatCurrency(dinarCredit, 'IQD', lang)
  const ar = lang === 'ar'
  const L = ar
    ? { title: 'سند قيد', serial: 'الرقم التسلسلي', doc: 'رقم المستند', date: 'التاريخ', desc: 'البيان', account: 'الحساب', debit: 'مدين', credit: 'دائن', total: 'الإجمالي', system: 'Alkebis GEO_ERP System', prepared: 'المحاسب', approved: 'المدير المالي' }
    : { title: 'Journal Voucher', serial: 'Serial', doc: 'Doc #', date: 'Date', desc: 'Description', account: 'Account', debit: 'Debit', credit: 'Credit', total: 'Total', system: 'Alkebis GEO_ERP System', prepared: 'Accountant', approved: 'Finance Manager' }

  const rows = entry.lines
    .map(
      (l) => `<tr>
        <td>${escapeHtml(l.account_code)} — ${escapeHtml(accMap[l.account_code] ? pickName(accMap[l.account_code], lang) : '')}</td>
        <td>${escapeHtml(l.description || '')}</td>
        <td class="num">${l.debit ? escapeHtml(formatCurrency(l.debit, lineCur(l), lang)) : ''}</td>
        <td class="num">${l.credit ? escapeHtml(formatCurrency(l.credit, lineCur(l), lang)) : ''}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html dir="${ar ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(L.title)} ${escapeHtml(entry.serial_number || '')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap" rel="stylesheet" />
  <style>
    * { font-family: 'Cairo', Arial, sans-serif; box-sizing: border-box; }
    body { margin: 32px; color: #1e293b; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a5f7a; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 20px; font-weight: 800; color: #1a5f7a; }
    h1 { font-size: 18px; margin: 6px 0 0; }
    .meta { font-size: 13px; line-height: 1.9; }
    .meta b { color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${ar ? 'right' : 'left'}; }
    th { background: #f1f5f9; }
    td.num, th.num { text-align: ${ar ? 'left' : 'right'}; font-variant-numeric: tabular-nums; white-space: nowrap; }
    tfoot td { font-weight: 700; background: #f8fafc; }
    .sigs { display: flex; justify-content: space-around; margin-top: 56px; font-size: 13px; }
    .sig { text-align: center; }
    .sig .line { border-top: 1px solid #94a3b8; width: 170px; margin: 0 auto 6px; height: 40px; }
    @media print { body { margin: 0; padding: 22px; } }
  </style>
</head>
<body>
  <div class="head">
    <div><div class="brand">${escapeHtml(L.system)}</div><h1>${escapeHtml(L.title)}</h1></div>
    <div class="meta">
      <div><b>${escapeHtml(L.serial)}:</b> ${escapeHtml(entry.serial_number || '—')}</div>
      <div><b>${escapeHtml(L.doc)}:</b> ${escapeHtml(entry.doc_number || '—')}</div>
      <div><b>${escapeHtml(L.date)}:</b> ${escapeHtml(formatDate(entry.date, lang))}</div>
    </div>
  </div>
  <div class="meta"><b>${escapeHtml(L.desc)}:</b> ${escapeHtml(entry.description || '—')}</div>
  <table>
    <thead><tr><th>${escapeHtml(L.account)}</th><th>${escapeHtml(L.desc)}</th><th class="num">${escapeHtml(L.debit)}</th><th class="num">${escapeHtml(L.credit)}</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="2">${escapeHtml(L.total)}</td><td class="num">${escapeHtml(totalDebitStr)}</td><td class="num">${escapeHtml(totalCreditStr)}</td></tr></tfoot>
  </table>
  <div class="sigs">
    <div class="sig"><div class="line"></div>${escapeHtml(L.prepared)}</div>
    <div class="sig"><div class="line"></div>${escapeHtml(L.approved)}</div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 250) }</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=860,height=960')
  if (!w) return
  w.document.write(html)
  w.document.close()
}
