// ============================================================================
// Formatting helpers: currency, numbers, dates. Locale-aware via the lang arg.
// ============================================================================
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

/** Export an array of row objects to a CSV file download (opens in Excel). */
export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
  // BOM so Excel reads Arabic UTF-8 correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
