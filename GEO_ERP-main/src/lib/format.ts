// ============================================================================
// Formatting helpers: currency, numbers, dates. Locale-aware via the lang arg.
// ============================================================================
import ExcelJS from 'exceljs'
import type { Currency } from '../types'
import type { Lang } from '../i18n/strings'

const CURRENCY_SYMBOL: Record<string, { ar: string; en: string }> = {
  IQD: { ar: 'د.ع', en: 'IQD' },
  USD: { ar: '$', en: '$' },
  EUR: { ar: '€', en: '€' },
  SAR: { ar: 'ر.س', en: 'SAR' },
  TRY: { ar: '₺', en: '₺' },
}

export const CURRENCY_LABEL: Record<Currency, { ar: string; en: string }> = {
  IQD: { ar: 'دينار عراقي', en: 'Iraqi Dinar' },
  USD: { ar: 'دولار أمريكي', en: 'US Dollar' },
  EUR: { ar: 'يورو', en: 'Euro' },
  SAR: { ar: 'ريال سعودي', en: 'Saudi Riyal' },
  TRY: { ar: 'ليرة تركية', en: 'Turkish Lira' },
}

/** Group-separated number, no currency. */
export function formatNumber(value: number | null | undefined, lang: Lang = 'ar', decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const locale = lang === 'ar' ? 'ar-IQ' : 'en-US'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Number + currency symbol, positioned for the language. */
export function formatCurrency(
  value: number | null | undefined,
  currency: Currency | string = 'IQD',
  lang: Lang = 'ar',
  decimals = 0,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const sym = CURRENCY_SYMBOL[currency as string]?.[lang] ?? currency
  const num = formatNumber(value, lang, decimals)
  return lang === 'ar' ? `${num} ${sym}` : `${sym === '$' || sym === '€' || sym === '₺' ? sym + num : num + ' ' + sym}`
}

/** Compact form for KPI cards: 1.2M, 350K. */
export function formatCompact(value: number | null | undefined, lang: Lang = 'ar'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const locale = lang === 'ar' ? 'ar-IQ' : 'en-US'
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatDate(value: string | null | undefined, lang: Lang = 'ar'): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const locale = lang === 'ar' ? 'ar-IQ' : 'en-GB'
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function formatDateTime(value: string | null | undefined, lang: Lang = 'ar'): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const locale = lang === 'ar' ? 'ar-IQ' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Pick the right bilingual field off a record. */
export function pickName(
  obj: { name_ar?: string; name_en?: string; full_name_ar?: string; full_name_en?: string } | null | undefined,
  lang: Lang = 'ar',
): string {
  if (!obj) return '—'
  if (lang === 'en') return obj.name_en || obj.full_name_en || obj.name_ar || obj.full_name_ar || '—'
  return obj.name_ar || obj.full_name_ar || obj.name_en || obj.full_name_en || '—'
}

// ---- Excel export -----------------------------------------------------------
const EXCEL_NAVY = 'FF1F3864' // title-row fill (navy)
const EXCEL_WHITE = 'FFFFFFFF'

/** Humanize a snake/camel key into a Title-Cased header (fallback only). */
function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/**
 * Export rows to a styled .xlsx download. The header row is navy with bold white
 * text; data rows are plain. Numeric cells get thousands separators, columns
 * auto-fit, and the sheet is right-to-left for the Arabic-first UI.
 *
 * `opts.headers` maps a row key to the column title to show (e.g. localized
 * labels); any key without an entry falls back to a humanized form of the key.
 */
export async function exportToExcel(
  filename: string,
  rows: Record<string, unknown>[],
  opts?: { sheetName?: string; headers?: Record<string, string> },
): Promise<void> {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(opts?.sheetName?.slice(0, 31) || 'Sheet1', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  })

  ws.columns = keys.map((k) => ({ key: k, header: opts?.headers?.[k] ?? humanizeKey(k) }))

  // Header: navy fill + bold white text, centered.
  const headerRow = ws.getRow(1)
  headerRow.height = 22
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_NAVY } }
    cell.font = { color: { argb: EXCEL_WHITE }, bold: true, size: 12 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // Data rows — plain, numbers get thousands separators.
  for (const r of rows) {
    const row = ws.addRow(keys.map((k) => (r[k] ?? '') as ExcelJS.CellValue))
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' }
      if (typeof cell.value === 'number') cell.numFmt = '#,##0.##'
    })
  }

  // Auto-fit column widths from header + content length.
  ws.columns.forEach((col) => {
    let max = String(col.header ?? '').length
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value == null ? 0 : String(cell.value).length
      if (len > max) max = len
    })
    col.width = Math.min(Math.max(max + 4, 12), 50)
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
