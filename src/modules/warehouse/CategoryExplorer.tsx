import { useMemo, useState, type ReactNode } from 'react'
import {
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  PackageSearch,
  Warehouse as WarehouseIcon,
  MapPin,
  BellRing,
} from 'lucide-react'
import { Badge, Button, Card, Field, Input, LoadingState, Popover, useToast } from '../../components/ui'
import { EmptyState } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { apiPost } from '../../lib/api'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Warehouse } from '../../types'
import type { Lang } from '../../i18n/strings'
import {
  categoryLabel,
  subCategoryLabel,
  shortWarehouseName,
  sortWarehouses,
  statusFor,
  SEARCH_SYNONYM_GROUPS,
  STOCK_STATUS_COLOR,
  CONDITION_COLOR,
  type CategoryDef,
  type StockMatrixRow,
  type StockSummaryRow,
} from './helpers'
import { categoryMeta, type CategoryMeta } from './categoryMeta'

const SEARCH_CAP = 50
const DID_YOU_MEAN_CAP = 3

const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const tokenize = (s: string) => norm(s).split(/\s+/).filter(Boolean)

interface SearchSynonym {
  id: string
  term: string
  target: string
}

/** Classic edit-distance — small strings only (search words), so the O(n·m) table is fine. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

export function CategoryExplorer({
  rows,
  onOpenItem,
}: {
  rows: StockSummaryRow[]
  onOpenItem: (itemId: string) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()

  const { data: taxonomy } = useApi<CategoryDef[]>('/warehouse/categories')
  const { data: matrix } = useApi<StockMatrixRow[]>('/warehouse/stock-matrix')
  const { data: warehouses } = useResource<Warehouse>('warehouses')
  const { data: learnedSynonyms, create: createSynonym } = useResource<SearchSynonym>('search_synonyms')

  const [warehouseId, setWarehouseId] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeSub, setActiveSub] = useState<string | null>(null)
  const [activeSize, setActiveSize] = useState<string | null>(null)

  const warehouseMap = useMemo(
    () => new Map(warehouses.map((w) => [w.id, w])),
    [warehouses],
  )

  // Per-item distribution across warehouses (desc by quantity) for the row chips.
  const distByItem = useMemo(() => {
    const m = new Map<string, StockMatrixRow[]>()
    for (const cell of matrix ?? []) {
      const arr = m.get(cell.item_id)
      if (arr) arr.push(cell)
      else m.set(cell.item_id, [cell])
    }
    for (const arr of m.values()) arr.sort((a, b) => b.quantity - a.quantity)
    return m
  }, [matrix])

  // Quantities/statuses reflect ONLY the picked warehouse (from the matrix).
  const effectiveRows = useMemo(() => {
    if (!warehouseId) return rows
    const qty = new Map<string, number>()
    for (const cell of matrix ?? []) {
      if (cell.warehouse_id === warehouseId) qty.set(cell.item_id, cell.quantity)
    }
    const out: StockSummaryRow[] = []
    for (const r of rows) {
      const q = qty.get(r.item_id)
      if (!q) continue // hide items with no stock in this warehouse
      out.push({ ...r, quantity: q, stock_status: statusFor(q, r.min_stock) })
    }
    return out
  }, [rows, matrix, warehouseId])

  // Bucket effective rows by category id (empty category => OTHER).
  const catBuckets = useMemo(() => {
    const m = new Map<string, StockSummaryRow[]>()
    for (const r of effectiveRows) {
      const c = r.category || 'OTHER'
      const arr = m.get(c)
      if (arr) arr.push(r)
      else m.set(c, [r])
    }
    return m
  }, [effectiveRows])

  // Taxonomy order first, then any legacy/unknown ids, skipping empty categories.
  const orderedCategories = useMemo(() => {
    const inTax = new Set((taxonomy ?? []).map((c) => c.id))
    const ids: string[] = []
    for (const c of taxonomy ?? []) if (catBuckets.has(c.id)) ids.push(c.id)
    const extra = [...catBuckets.keys()].filter((id) => !inTax.has(id)).sort()
    return [...ids, ...extra]
  }, [taxonomy, catBuckets])

  // Largest category size — scales the share bar on each category card.
  const maxCount = useMemo(
    () => Math.max(1, ...orderedCategories.map((id) => catBuckets.get(id)?.length ?? 0)),
    [orderedCategories, catBuckets],
  )

  // Ordered non-empty sub-categories for a bucket (taxonomy order, then extras).
  const orderedSubs = (catId: string, bucket: StockSummaryRow[]) => {
    const counts = new Map<string, number>()
    for (const r of bucket) if (r.sub_category) counts.set(r.sub_category, (counts.get(r.sub_category) ?? 0) + 1)
    const cat = (taxonomy ?? []).find((c) => c.id === catId)
    const seen = new Set<string>()
    const out: Array<{ id: string; count: number }> = []
    if (cat) {
      for (const s of cat.subs)
        if (counts.has(s.id)) {
          out.push({ id: s.id, count: counts.get(s.id)! })
          seen.add(s.id)
        }
    }
    for (const [id, count] of counts) if (!seen.has(id)) out.push({ id, count })
    return out
  }

  // ---- Search (dialect-aware) ------------------------------------------------
  // word -> full set of interchangeable words (itself + built-in group + learned pairs).
  const synonymMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    const link = (a: string, b: string) => {
      if (!a || !b || a === b) return
      if (!m.has(a)) m.set(a, new Set([a]))
      if (!m.has(b)) m.set(b, new Set([b]))
      m.get(a)!.add(b)
      m.get(b)!.add(a)
    }
    for (const group of SEARCH_SYNONYM_GROUPS) {
      const words = group.map(norm)
      for (let i = 0; i < words.length; i++)
        for (let j = i + 1; j < words.length; j++) link(words[i], words[j])
    }
    for (const s of learnedSynonyms) link(norm(s.term), norm(s.target))
    return m
  }, [learnedSynonyms])

  // Searchable text per item (name/code/spec/size), keyed by item id — stable
  // across warehouse switches since these fields never depend on quantity.
  const rowTextByItem = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows)
      m.set(r.item_id, norm([r.name_ar, r.name_en, r.code, r.spec, r.size_label, r.shelf_location].join(' ')))
    return m
  }, [rows])

  const searchResults = useMemo(() => {
    const tokens = tokenize(search)
    if (tokens.length === 0) return []
    return effectiveRows.filter((r) => {
      const text = rowTextByItem.get(r.item_id) ?? ''
      return tokens.every((tok) => {
        const syns = synonymMap.get(tok)
        if (!syns) return text.includes(tok)
        for (const s of syns) if (text.includes(s)) return true
        return false
      })
    })
  }, [search, effectiveRows, rowTextByItem, synonymMap])

  // Vocabulary of item-name words (>=3 chars) — built once, feeds "هل تقصد؟".
  const nameVocabulary = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      for (const w of tokenize(r.name_ar)) if (w.length >= 3) set.add(w)
      for (const w of tokenize(r.name_en)) if (w.length >= 3) set.add(w)
    }
    return [...set]
  }, [rows])

  // "هل تقصد؟" candidates — only when the search is non-empty and matched nothing.
  const didYouMean = useMemo(() => {
    const q = norm(search)
    if (!q || searchResults.length > 0) return []
    const scored: Array<{ word: string; score: number }> = []
    for (const w of nameVocabulary) {
      if (w === q) continue
      const overlap = w.includes(q) || q.includes(w)
      const dist = levenshtein(q, w)
      if (dist <= 2 || overlap) scored.push({ word: w, score: overlap ? Math.min(dist, 1.5) : dist })
    }
    scored.sort((a, b) => a.score - b.score || a.word.localeCompare(b.word))
    const out: string[] = []
    for (const s of scored) {
      if (!out.includes(s.word)) out.push(s.word)
      if (out.length >= DID_YOU_MEAN_CAP) break
    }
    return out
  }, [search, searchResults, nameVocabulary])

  // Clicking a "هل تقصد؟" chip: search that word instead, and teach the system
  // the typed term forever (unless it's already learned or already matched).
  const pickDidYouMean = async (word: string) => {
    const typed = norm(search)
    setSearch(word)
    const alreadyLearned = learnedSynonyms.some((s) => norm(s.term) === typed || norm(s.target) === typed)
    if (typed && typed !== norm(word) && searchResults.length === 0 && !alreadyLearned) {
      try {
        await createSynonym({ term: typed, target: word })
        toast.success(t('warehouse.search.saved'))
      } catch {
        /* best-effort learning; search still works via the typed replacement */
      }
    }
  }

  // ---- Level 2 selection ----------------------------------------------------
  const categoryRows = activeCategory ? catBuckets.get(activeCategory) ?? [] : []
  const subFiltered = activeSub ? categoryRows.filter((r) => r.sub_category === activeSub) : categoryRows

  const sizes = useMemo(() => {
    const m = new Map<string, { label: string; mm: number | null; count: number }>()
    for (const r of subFiltered) {
      if (!r.size_label) continue
      const e = m.get(r.size_label)
      if (e) e.count++
      else m.set(r.size_label, { label: r.size_label, mm: r.size_mm, count: 1 })
    }
    return [...m.values()].sort((a, b) => {
      const am = a.mm ?? Number.POSITIVE_INFINITY
      const bm = b.mm ?? Number.POSITIVE_INFINITY
      if (am !== bm) return am - bm
      return a.label.localeCompare(b.label)
    })
  }, [subFiltered])

  const sizeActive = activeSize && sizes.some((s) => s.label === activeSize) ? activeSize : null
  const listRows = useMemo(() => {
    const base = sizeActive ? subFiltered.filter((r) => r.size_label === sizeActive) : subFiltered
    return [...base].sort(
      (a, b) =>
        (a.size_mm ?? Number.POSITIVE_INFINITY) - (b.size_mm ?? Number.POSITIVE_INFINITY) ||
        a.code.localeCompare(b.code),
    )
  }, [subFiltered, sizeActive])

  // ---- Handlers -------------------------------------------------------------
  const openCategory = (id: string) => {
    setActiveCategory(id)
    setActiveSub(null)
    setActiveSize(null)
  }
  const goBack = () => {
    setActiveCategory(null)
    setActiveSub(null)
    setActiveSize(null)
  }
  const onSearchChange = (v: string) => {
    setSearch(v)
    if (v) goBack() // searching returns focus to the top level; clearing shows the grid
  }
  const pickSub = (id: string | null) => {
    setActiveSub(id)
    setActiveSize(null)
  }

  const ready = !!taxonomy && !!matrix
  const showSearch = norm(search).length > 0

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <WarehousePill active={!warehouseId} onClick={() => setWarehouseId('')}>
            {t('warehouse.reports.all')}
          </WarehousePill>
          {sortWarehouses(warehouses)
            .filter((w) => w.type === 'MAIN')
            .map((w) => (
              <WarehousePill key={w.id} active={warehouseId === w.id} onClick={() => setWarehouseId(w.id)}>
                <WarehouseIcon className="h-3.5 w-3.5" />
                {shortWarehouseName(pickName(w, lang))}
              </WarehousePill>
            ))}
          {(() => {
            const projects = sortWarehouses(warehouses).filter((w) => w.type === 'PROJECT')
            if (projects.length === 0) return null
            const activeProject = projects.find((w) => w.id === warehouseId)
            return (
              <Popover
                width="w-52"
                trigger={({ toggle }) => (
                  <WarehousePill active={!!activeProject} onClick={toggle}>
                    <MapPin className="h-3.5 w-3.5" />
                    {activeProject ? shortWarehouseName(pickName(activeProject, lang)) : t('warehouse.explorer.projects')}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </WarehousePill>
                )}
              >
                {(close) => (
                  <div className="p-1.5">
                    {projects.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setWarehouseId(warehouseId === w.id ? '' : w.id)
                          close()
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50',
                          warehouseId === w.id ? 'font-semibold text-primary' : 'text-slate-600',
                        )}
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        {shortWarehouseName(pickName(w, lang))}
                      </button>
                    ))}
                  </div>
                )}
              </Popover>
            )
          })()}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('warehouse.items.search')}
            className="input-base ps-9"
          />
        </div>
      </div>

      {!ready ? (
        <LoadingState label={t('common.loading')} />
      ) : showSearch ? (
        <SearchResults
          total={searchResults.length}
          rows={searchResults.slice(0, SEARCH_CAP)}
          didYouMean={didYouMean}
          onPickDidYouMean={pickDidYouMean}
          taxonomy={taxonomy}
          distByItem={distByItem}
          warehouseId={warehouseId}
          warehouseMap={warehouseMap}
          onOpenItem={onOpenItem}
        />
      ) : activeCategory ? (
        <CategoryDetail
          catId={activeCategory}
          rows={categoryRows}
          listRows={listRows}
          subs={orderedSubs(activeCategory, categoryRows)}
          activeSub={activeSub}
          sizes={sizes}
          activeSize={sizeActive}
          taxonomy={taxonomy}
          distByItem={distByItem}
          warehouseId={warehouseId}
          warehouseMap={warehouseMap}
          onBack={goBack}
          onPickSub={pickSub}
          onPickSize={setActiveSize}
          onOpenItem={onOpenItem}
        />
      ) : orderedCategories.length === 0 ? (
        <EmptyState title={t('warehouse.items.empty')} hint={t('warehouse.items.empty_hint')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {orderedCategories.map((id) => {
            const bucket = catBuckets.get(id)!
            const meta = categoryMeta(id)
            const Icon = meta.icon
            const outCount = bucket.filter((r) => r.stock_status === 'OUT').length
            const chips = orderedSubs(id, bucket).slice(0, 3)
            return (
              <button
                key={id}
                onClick={() => openCategory(id)}
                className="card group flex h-full flex-col p-5 text-start transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {/* Icon + full name (never truncated) + forward affordance on hover */}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                      meta.tile,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="min-w-0 flex-1 font-bold leading-snug text-slate-800">
                    {categoryLabel(taxonomy, id, lang)}
                  </p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 rtl:rotate-180" />
                </div>

                {/* Count row — the نفد badge lives here, never crowding the title */}
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold leading-none tabular-nums text-slate-800">
                    {formatNumber(bucket.length, lang)}
                  </span>
                  <span className="text-xs text-slate-400">{t('warehouse.explorer.items_unit')}</span>
                  {outCount > 0 && (
                    <span className="ms-auto inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 ring-1 ring-inset ring-red-100">
                      {t('warehouse.stock.OUT')} {formatNumber(outCount, lang)}
                    </span>
                  )}
                </div>

                {/* Share of the whole inventory — size at a glance */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn('h-full rounded-full', meta.bar)}
                    style={{ width: `${Math.max(6, Math.round((bucket.length / maxCount) * 100))}%` }}
                  />
                </div>

                {/* Sub-categories as calm text, pinned to the card bottom */}
                {chips.length > 0 && (
                  <p className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-3.5 text-xs leading-relaxed text-slate-400">
                    {chips.map((s, i) => (
                      <span key={s.id} className="inline-flex items-center gap-1">
                        {i > 0 && <span className="text-slate-200">·</span>}
                        {subCategoryLabel(taxonomy, s.id, lang)}
                        <span className="font-semibold tabular-nums text-slate-600">{formatNumber(s.count, lang)}</span>
                      </span>
                    ))}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Level 2 — inside a category.
// ---------------------------------------------------------------------------
function CategoryDetail({
  catId,
  rows,
  listRows,
  subs,
  activeSub,
  sizes,
  activeSize,
  taxonomy,
  distByItem,
  warehouseId,
  warehouseMap,
  onBack,
  onPickSub,
  onPickSize,
  onOpenItem,
}: {
  catId: string
  rows: StockSummaryRow[]
  listRows: StockSummaryRow[]
  subs: Array<{ id: string; count: number }>
  activeSub: string | null
  sizes: Array<{ label: string; mm: number | null; count: number }>
  activeSize: string | null
  taxonomy: CategoryDef[] | null
  distByItem: Map<string, StockMatrixRow[]>
  warehouseId: string
  warehouseMap: Map<string, Warehouse>
  onBack: () => void
  onPickSub: (id: string | null) => void
  onPickSize: (label: string | null) => void
  onOpenItem: (id: string) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const meta = categoryMeta(catId)
  const Icon = meta.icon

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('common.back')}
        </button>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.tile)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-slate-800">{categoryLabel(taxonomy, catId, lang)}</h3>
          <p className="text-xs text-slate-400">
            <span className="tabular-nums">{formatNumber(rows.length, lang)}</span> {t('warehouse.explorer.items_unit')}
          </p>
        </div>
        <BulkMinStockButton listRows={listRows} />
      </div>

      {/* Sub-category tiles — count is the hero, name is a caption */}
      {subs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <SubTile active={!activeSub} meta={meta} count={formatNumber(rows.length, lang)} label={t('common.all')} onClick={() => onPickSub(null)} />
          {subs.map((s) => (
            <SubTile
              key={s.id}
              active={activeSub === s.id}
              meta={meta}
              count={formatNumber(s.count, lang)}
              label={subCategoryLabel(taxonomy, s.id, lang)}
              onClick={() => onPickSub(s.id)}
            />
          ))}
        </div>
      )}

      {/* Size circles — diameter scales with the real pipe size, first-class for pipeline storekeepers */}
      {sizes.length > 0 && (
        <div className="flex items-end gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 self-center">
            <Chip active={!activeSize} meta={meta} onClick={() => onPickSize(null)}>
              {t('warehouse.explorer.all_sizes')}
            </Chip>
          </span>
          {sizes.map((sz) => (
            <SizeCircle
              key={sz.label}
              active={activeSize === sz.label}
              meta={meta}
              activeBorder={categoryBorder(catId)}
              size={sz}
              lang={lang}
              onClick={() => onPickSize(sz.label)}
            />
          ))}
        </div>
      )}

      {/* Item list */}
      {listRows.length === 0 ? (
        <Card>
          <EmptyState title={t('warehouse.items.empty')} />
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {listRows.map((r) => (
            <ItemRow
              key={r.item_id}
              row={r}
              taxonomy={taxonomy}
              distByItem={distByItem}
              warehouseId={warehouseId}
              warehouseMap={warehouseMap}
              onClick={() => onOpenItem(r.item_id)}
            />
          ))}
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulk alert-threshold — sets min_stock for every item currently shown
// (i.e. after the sub/size chip filters are applied).
// ---------------------------------------------------------------------------
function BulkMinStockButton({ listRows }: { listRows: StockSummaryRow[] }) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (close: () => void) => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || listRows.length === 0) return
    setSaving(true)
    try {
      await apiPost('/warehouse/set-min-stock', {
        item_ids: listRows.map((r) => r.item_id),
        min_stock: n,
      })
      toast.success(t('warehouse.radar.updated'))
      setValue('')
      close()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ms-auto shrink-0">
      <Popover
        align="end"
        width="w-64"
        trigger={({ toggle }) => (
          <button
            onClick={toggle}
            disabled={listRows.length === 0}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BellRing className="h-3.5 w-3.5" />
            {t('warehouse.radar.set_min_bulk')} ({formatNumber(listRows.length, lang)})
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-3">
            <Field label={t('warehouse.radar.set_min')} hint={t('warehouse.radar.min_hint')}>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-end"
                autoFocus
              />
            </Field>
            <Button
              size="sm"
              className="w-full"
              disabled={saving || value === '' || Number(value) < 0}
              onClick={() => submit(close)}
            >
              {t('common.confirm')}
            </Button>
          </div>
        )}
      </Popover>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search results — flat item list capped at SEARCH_CAP.
// ---------------------------------------------------------------------------
function SearchResults({
  total,
  rows,
  didYouMean,
  onPickDidYouMean,
  taxonomy,
  distByItem,
  warehouseId,
  warehouseMap,
  onOpenItem,
}: {
  total: number
  rows: StockSummaryRow[]
  didYouMean: string[]
  onPickDidYouMean: (word: string) => void
  taxonomy: CategoryDef[] | null
  distByItem: Map<string, StockMatrixRow[]>
  warehouseId: string
  warehouseMap: Map<string, Warehouse>
  onOpenItem: (id: string) => void
}) {
  const t = useT()
  const { lang } = useLang()

  if (total === 0) {
    return (
      <div className="space-y-4">
        <EmptyState title={t('warehouse.explorer.no_results')} icon={<PackageSearch className="h-7 w-7" />} />
        {didYouMean.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm font-medium text-slate-500">{t('warehouse.search.did_you_mean')}</span>
            {didYouMean.map((word) => (
              <button
                key={word}
                onClick={() => onPickDidYouMean(word)}
                dir="auto"
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20 transition hover:bg-primary/15"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        <span className="font-semibold text-slate-700 tabular-nums">{formatNumber(total, lang)}</span>{' '}
        {t('warehouse.explorer.results')}
      </p>
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {rows.map((r) => (
          <ItemRow
            key={r.item_id}
            row={r}
            taxonomy={taxonomy}
            distByItem={distByItem}
            warehouseId={warehouseId}
            warehouseMap={warehouseMap}
            showCategoryChip
            onClick={() => onOpenItem(r.item_id)}
          />
        ))}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared item row.
// ---------------------------------------------------------------------------
function ItemRow({
  row,
  taxonomy,
  distByItem,
  warehouseId,
  warehouseMap,
  showCategoryChip,
  onClick,
}: {
  row: StockSummaryRow
  taxonomy: CategoryDef[] | null
  distByItem: Map<string, StockMatrixRow[]>
  warehouseId: string
  warehouseMap: Map<string, Warehouse>
  showCategoryChip?: boolean
  onClick: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const dist = (distByItem.get(row.item_id) ?? []).filter((d) => !warehouseId || d.warehouse_id === warehouseId)
  const shownDist = dist.slice(0, 3)
  const moreDist = dist.length - shownDist.length
  const meta = categoryMeta(row.category || 'OTHER')
  const CatIcon = meta.icon

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition hover:bg-primary/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-800">{pickName(row, lang)}</span>
          {showCategoryChip && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                meta.chip,
              )}
            >
              <CatIcon className="h-3 w-3" />
              {categoryLabel(taxonomy, row.category || 'OTHER', lang)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          <span className="font-mono">{row.code}</span>
          {row.size_label ? <span dir="ltr"> · {row.size_label}</span> : null}
          {row.spec ? <> · {row.spec}</> : null}
          {row.shelf_location ? (
            <>
              {' · '}
              <MapPin className="inline h-3 w-3 -mt-0.5" /> {row.shelf_location}
            </>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="text-end tabular-nums">
          <span className="font-semibold text-slate-800">{formatNumber(row.quantity, lang)}</span>
          <span className="ms-1 text-xs font-normal text-slate-400">{row.uom}</span>
        </div>
        {(row.condition === 'BROKEN' || row.condition === 'NEEDS_REPAIR') && (
          <Badge color={CONDITION_COLOR[row.condition]}>{t(`warehouse.condition.${row.condition}`)}</Badge>
        )}
        <Badge color={STOCK_STATUS_COLOR[row.stock_status]} dot>
          {t(`warehouse.stock.${row.stock_status}`)}
        </Badge>
        {shownDist.length > 0 && (
          <div className="hidden items-center gap-1 lg:flex">
            {shownDist.map((d) => {
              const w = warehouseMap.get(d.warehouse_id)
              const nm = w ? shortWarehouseName(pickName(w, lang)) : d.warehouse_id
              return (
                <span
                  key={d.warehouse_id}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-500"
                >
                  {nm} {formatNumber(d.quantity, lang)}
                </span>
              )
            })}
            {moreDist > 0 && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-400">
                +{formatNumber(moreDist, lang)}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Pill chip with a clear active (tinted) state.
// ---------------------------------------------------------------------------
function Chip({
  active,
  meta,
  onClick,
  children,
}: {
  active: boolean
  meta: CategoryMeta
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
        active ? cn(meta.chip, 'font-semibold') : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Warehouse filter pill — filled primary when active, white/slate when not.
// ---------------------------------------------------------------------------
function WarehousePill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition',
        active ? 'bg-primary text-white ring-primary' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Sub-category tile — the count is the hero, the name is a small caption.
// ---------------------------------------------------------------------------
function SubTile({
  active,
  meta,
  count,
  label,
  onClick,
}: {
  active: boolean
  meta: CategoryMeta
  count: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-w-[72px] flex-col items-center gap-0.5 rounded-xl px-4 py-2 ring-1 ring-inset transition hover:ring-primary/40',
        active ? meta.chip : 'bg-white text-slate-600 ring-slate-200',
      )}
    >
      <span className={cn('text-lg font-bold tabular-nums', active ? meta.text : 'text-slate-800')}>{count}</span>
      <span className="max-w-[7.5rem] truncate text-[11px] text-slate-500">{label}</span>
    </button>
  )
}

// Border color matching each category's accent family — kept as a literal map
// (rather than built from meta.chip's ring class at runtime) so Tailwind's JIT
// scanner can see every class name and generate the CSS for it.
const CATEGORY_BORDER: Record<string, string> = {
  PIPES: 'border-sky-300',
  FITTINGS: 'border-indigo-300',
  VALVES: 'border-violet-300',
  PUMPS: 'border-cyan-300',
  EQUIPMENT: 'border-amber-300',
  ELECTRICAL: 'border-yellow-300',
  CONSTRUCTION: 'border-orange-300',
  SCAFFOLDING: 'border-lime-300',
  FINISHING: 'border-pink-300',
  SANITARY: 'border-teal-300',
  TOOLS: 'border-slate-300',
  SAFETY: 'border-red-300',
  SITE: 'border-emerald-300',
  OTHER: 'border-gray-300',
}
function categoryBorder(id: string): string {
  return CATEGORY_BORDER[id] ?? 'border-slate-300'
}

// ---------------------------------------------------------------------------
// Size circle — diameter scales with the real pipe size (mm), so a storekeeper
// reads the row at a glance instead of parsing text labels.
// ---------------------------------------------------------------------------
function SizeCircle({
  active,
  meta,
  activeBorder,
  size,
  lang,
  onClick,
}: {
  active: boolean
  meta: CategoryMeta
  activeBorder: string
  size: { label: string; mm: number | null; count: number }
  lang: Lang
  onClick: () => void
}) {
  const mm = size.mm ?? 34
  const d = Math.max(30, Math.min(64, Math.round(26 + Math.sqrt(mm) * 1.15)))
  const dn = /^DN\s*(\d+)$/i.exec(size.label)
  const innerLabel = dn ? formatNumber(Number(dn[1]), lang) : size.label
  const innerSize = dn ? (d >= 44 ? 'text-xs' : 'text-[10px]') : 'text-[8px] leading-tight'

  return (
    <button
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-0.5 transition hover:scale-105"
    >
      <span
        style={{ width: d, height: d }}
        dir="ltr"
        className={cn(
          'flex items-center justify-center rounded-full border-2 px-0.5 text-center font-semibold tabular-nums transition',
          innerSize,
          active ? cn(meta.tile, activeBorder) : 'border-slate-300 bg-white text-slate-600',
        )}
      >
        {innerLabel}
      </span>
      <span className="text-[10px] tabular-nums text-slate-400">{formatNumber(size.count, lang)}</span>
    </button>
  )
}
