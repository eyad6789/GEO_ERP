// Delivery slip (سند تسليم مواد) — printable, price-free voucher for a
// warehouse movement, plus a plain-text summary for WhatsApp sharing.
// Printing opens a blank popup and document.write()s a self-contained RTL
// HTML page (same trick as accounting/printEntry.ts) so the slip's styling
// never fights the SPA's own CSS, and window.print() is triggered on load.
import { translate, type Lang } from '../../i18n/strings'
import { formatDate, formatNumber } from '../../lib/format'

export interface DeliverySlipLine {
  name: string
  size: string
  quantity: number
  uom: string
}

export interface DeliverySlipData {
  lang: Lang
  serial_number: string
  doc_number?: string | null
  date: string
  /** Resolved display text — warehouse name, or «توريد خارجي» / «صرف ⁄ استهلاك». */
  fromText: string
  toText: string
  lines: DeliverySlipLine[]
  notes?: string | null
  receivedBy?: string | null
  /** URL of a stored receiver signature (e.g. /api/warehouse/item-photos/SIG-xxx.png). */
  signatureUrl?: string | null
}

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string))
}

/** Builds the bilingual label set for a given language, pulling every string
 * from the shared i18n registry (no new copy invented here). */
function labelsFor(lang: Lang) {
  const tr = (key: string) => translate(key, lang)
  return {
    brand: tr('app.subtitle'),
    title: tr('warehouse.slip.title'),
    serial: tr('warehouse.txn.serial'),
    doc: tr('warehouse.txn.doc'),
    date: tr('warehouse.txn.date'),
    from: tr('warehouse.track.from'),
    to: tr('warehouse.track.to'),
    item: tr('warehouse.txn.line_item'),
    size: tr('warehouse.col.size'),
    qty: tr('warehouse.txn.line_qty'),
    uom: tr('warehouse.col.uom'),
    notes: tr('warehouse.txn.notes'),
    receivedBy: tr('warehouse.txn.received_by'),
    deliverer: tr('warehouse.slip.deliverer'),
    receiver: tr('warehouse.slip.receiver'),
    driver: tr('warehouse.slip.driver'),
  }
}

/** Opens a popup window and prints a self-contained delivery slip. */
export function printDeliverySlip(data: DeliverySlipData): void {
  const ar = data.lang === 'ar'
  const L = labelsFor(data.lang)

  const rows = data.lines
    .map(
      (l) => `<tr>
        <td>${escapeHtml(l.name)}</td>
        <td>${escapeHtml(l.size || '—')}</td>
        <td class="num">${escapeHtml(formatNumber(l.quantity, data.lang))}</td>
        <td>${escapeHtml(l.uom || '—')}</td>
      </tr>`,
    )
    .join('')

  const receiverBox = data.signatureUrl
    ? `<img class="sigimg" src="${escapeHtml(data.signatureUrl)}" alt="${escapeHtml(L.receiver)}" />`
    : `<div class="line"></div>`

  const html = `<!doctype html>
<html dir="${ar ? 'rtl' : 'ltr'}" lang="${data.lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(L.title)} ${escapeHtml(data.serial_number || '')}</title>
  <style>
    * { font-family: Tahoma, 'Segoe UI', sans-serif; box-sizing: border-box; }
    body { margin: 28px; color: #1e293b; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a5f7a; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { font-size: 19px; font-weight: 800; color: #1a5f7a; }
    h1 { font-size: 16px; margin: 4px 0 0; }
    .meta { font-size: 13px; line-height: 1.9; }
    .meta b { color: #475569; }
    .route { display: flex; gap: 24px; flex-wrap: wrap; margin: 12px 0 16px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    .route b { color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: ${ar ? 'right' : 'left'}; }
    th { background: #f1f5f9; }
    td.num, th.num { text-align: ${ar ? 'left' : 'right'}; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .extra { margin-top: 14px; font-size: 13px; }
    .sigs { display: flex; justify-content: space-around; margin-top: 52px; font-size: 13px; text-align: center; }
    .sig { width: 30%; }
    .sig .line { border-top: 1px solid #94a3b8; margin: 0 auto 6px; height: 46px; }
    .sig .sigimg { display: block; max-height: 60px; max-width: 100%; margin: 0 auto 6px; object-fit: contain; }
    @media print { body { margin: 0; padding: 20px; } }
  </style>
</head>
<body>
  <div class="head">
    <div><div class="brand">${escapeHtml(L.brand)}</div><h1>${escapeHtml(L.title)}</h1></div>
    <div class="meta">
      <div><b>${escapeHtml(L.serial)}:</b> ${escapeHtml(data.serial_number || '—')}</div>
      ${data.doc_number ? `<div><b>${escapeHtml(L.doc)}:</b> ${escapeHtml(data.doc_number)}</div>` : ''}
      <div><b>${escapeHtml(L.date)}:</b> ${escapeHtml(formatDate(data.date, data.lang))}</div>
    </div>
  </div>
  <div class="route">
    <div><b>${escapeHtml(L.from)}:</b> ${escapeHtml(data.fromText)}</div>
    <div><b>${escapeHtml(L.to)}:</b> ${escapeHtml(data.toText)}</div>
  </div>
  <table>
    <thead><tr><th>${escapeHtml(L.item)}</th><th>${escapeHtml(L.size)}</th><th class="num">${escapeHtml(L.qty)}</th><th>${escapeHtml(L.uom)}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="extra">
    ${data.notes ? `<div class="meta"><b>${escapeHtml(L.notes)}:</b> ${escapeHtml(data.notes)}</div>` : ''}
    ${data.receivedBy ? `<div class="meta"><b>${escapeHtml(L.receivedBy)}:</b> ${escapeHtml(data.receivedBy)}</div>` : ''}
  </div>
  <div class="sigs">
    <div class="sig"><div class="line"></div>${escapeHtml(L.deliverer)}</div>
    <div class="sig">${receiverBox}${escapeHtml(L.receiver)}</div>
    <div class="sig"><div class="line"></div>${escapeHtml(L.driver)}</div>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 250) }</script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=820,height=1040')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

/** Plain-text Arabic/English summary for WhatsApp sharing (wa.me?text=). */
export function buildDeliveryWhatsAppText(data: Omit<DeliverySlipData, 'signatureUrl' | 'doc_number'>): string {
  const L = labelsFor(data.lang)
  const out: string[] = []
  out.push(`${L.brand} — ${L.title}`)
  out.push(`${L.serial}: ${data.serial_number || '—'}`)
  out.push(`${L.date}: ${formatDate(data.date, data.lang)}`)
  out.push(`${L.from}: ${data.fromText}`)
  out.push(`${L.to}: ${data.toText}`)
  out.push('')
  for (const l of data.lines) {
    const sizePart = l.size ? ` (${l.size})` : ''
    out.push(`- ${l.name}${sizePart} × ${formatNumber(l.quantity, data.lang)} ${l.uom || ''}`.trim())
  }
  if (data.notes) {
    out.push('')
    out.push(`${L.notes}: ${data.notes}`)
  }
  if (data.receivedBy) {
    out.push(`${L.receivedBy}: ${data.receivedBy}`)
  }
  return out.join('\n')
}
