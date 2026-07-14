import { useMemo, useState, type ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useT } from '../../context/LangContext'
import { exportToExcel } from '../../lib/format'
import { Button } from '../ui/Button'
import { LoadingState } from '../ui/Spinner'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: ReactNode
  /** raw value used for sorting/search/export. Defaults to row[key]. */
  accessor?: (row: T) => string | number | null | undefined
  /** custom cell renderer. Defaults to the accessor/raw value. */
  render?: (row: T) => ReactNode
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  width?: string
  className?: string
}

export interface ArabicTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  rowKey?: (row: T, i: number) => string
  onRowClick?: (row: T) => void
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  toolbar?: ReactNode
  actions?: (row: T) => ReactNode
  /** when set, shows an export button writing <exportName>.csv */
  exportName?: string
  /** optional export-only column set (richer/resolved data); defaults to `columns` */
  exportColumns?: Column<T>[]
  emptyTitle?: string
  emptyHint?: string
  dense?: boolean
}

function rawValue<T>(row: T, col: Column<T>): string | number {
  const v = col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key]
  if (v === null || v === undefined) return ''
  return v as string | number
}

export function ArabicTable<T>({
  columns,
  data,
  loading,
  rowKey,
  onRowClick,
  searchable = true,
  searchPlaceholder,
  pageSize = 10,
  toolbar,
  actions,
  exportName,
  exportColumns,
  emptyTitle,
  emptyHint,
  dense,
}: ArabicTableProps<T>) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    if (!query.trim()) return data
    const q = query.trim().toLowerCase()
    return data.filter((row) =>
      columns.some((col) => String(rawValue(row, col)).toLowerCase().includes(q)),
    )
  }, [data, query, columns])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return filtered
    const arr = [...filtered]
    arr.sort((a, b) => {
      const va = rawValue(a, col)
      const vb = rawValue(b, col)
      if (typeof va === 'number' && typeof vb === 'number') return va - vb
      return String(va).localeCompare(String(vb), 'ar')
    })
    if (sortDir === 'desc') arr.reverse()
    return arr
  }, [filtered, sortKey, sortDir, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleExport = () => {
    // Drop purely-decorative columns (e.g. the chevron/go cell): no accessor and
    // a blank header. Use each kept column's visible (localized) header as the
    // Excel title where it is plain text.
    const cols = (exportColumns ?? columns).filter(
      (c) => c.accessor || (typeof c.header === 'string' && c.header.trim() !== ''),
    )
    const headers: Record<string, string> = {}
    for (const col of cols) {
      if (typeof col.header === 'string' && col.header.trim()) headers[col.key] = col.header
    }
    const rows = sorted.map((row) => {
      const obj: Record<string, unknown> = {}
      for (const col of cols) obj[String(col.key)] = rawValue(row, col)
      return obj
    })
    void exportToExcel(exportName ?? 'export', rows, { headers })
  }

  const alignCls = (a?: 'start' | 'center' | 'end') =>
    a === 'center' ? 'text-center' : a === 'end' ? 'text-end' : 'text-start'

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      {(searchable || toolbar || exportName) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
          {searchable && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder={searchPlaceholder ?? t('common.search')}
                className="input-base ps-9"
              />
            </div>
          )}
          {toolbar}
          {exportName && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              {t('common.export')}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : sorted.length === 0 ? (
        <EmptyState title={emptyTitle} hint={emptyHint} />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wide select-none',
                      alignCls(col.align),
                      col.sortable && 'cursor-pointer hover:text-slate-700',
                    )}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {col.sortable &&
                        (sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                ))}
                {actions && <th className="px-4 py-3 text-end text-xs font-semibold uppercase">{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row, i) : i}
                  className={cn('transition hover:bg-primary/5', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(dense ? 'px-4 py-2' : 'px-4 py-3', 'text-slate-700', alignCls(col.align), col.className)}
                    >
                      {col.render ? col.render(row) : String(rawValue(row, col) || '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-2 text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            {sorted.length} {t('common.results')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              {t('common.prev')}
            </Button>
            <span className="tabular-nums">
              {safePage + 1} {t('common.of')} {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
