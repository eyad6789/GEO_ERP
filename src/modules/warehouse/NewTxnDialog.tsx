import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RotateCcw,
  SlidersHorizontal,
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  PackagePlus,
  Check,
} from 'lucide-react'
import { Dialog, Button, Field, Input, Select, SearchSelect } from '../../components/ui'
import { useToast } from '../../components/ui'
import { useResource, useApi } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiPost } from '../../lib/api'
import { formatNumber, pickName } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { InventoryTxnType, Item, Company, Project, Warehouse } from '../../types'
import { TXN_TYPES, sortWarehouses, type StockMatrixRow } from './helpers'

interface LineDraft {
  key: string
  item_id: string
  quantity: number
}

let lineCounter = 0
function makeLine(itemId: string): LineDraft {
  lineCounter += 1
  return { key: `ln-${lineCounter}`, item_id: itemId, quantity: 1 }
}

// Segmented-control styling for the movement type — icon + soft tint per type.
const TYPE_ICON = {
  IN: ArrowDownToLine,
  OUT: ArrowUpFromLine,
  TRANSFER: ArrowLeftRight,
  RETURN: RotateCcw,
  ADJUST: SlidersHorizontal,
} as const

const TYPE_TINT: Record<InventoryTxnType, string> = {
  IN: 'bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 ring-green-200 dark:ring-green-500/30',
  OUT: 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/30',
  TRANSFER: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/30',
  RETURN: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30',
  ADJUST: 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-500/30',
}

export function NewTxnDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { companyId } = useCompany()

  const { data: items } = useResource<Item>('items')
  const { data: companies } = useResource<Company>('companies')
  const { data: projects } = useResource<Project>('projects')
  const { data: warehouses } = useResource<Warehouse>('warehouses')
  const sortedWarehouses = useMemo(() => sortWarehouses(warehouses), [warehouses])
  const { data: stockMatrix } = useApi<StockMatrixRow[]>('/warehouse/stock-matrix')

  const [type, setType] = useState<InventoryTxnType>('IN')
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('')
  const [company, setCompany] = useState<string>(companyId ?? '')
  const [project, setProject] = useState<string>('')
  const [docNumber, setDocNumber] = useState<string>('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState<string>('')
  const [lines, setLines] = useState<LineDraft[]>([])
  const [moreOpen, setMoreOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [receivedBy, setReceivedBy] = useState<string>('')
  const [isLoan, setIsLoan] = useState<boolean>(false)

  const itemMap = useMemo(() => {
    const m = new Map<string, Item>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  const addedIds = useMemo(() => new Set(lines.map((l) => l.item_id)), [lines])
  const itemOptions = useMemo(
    () =>
      [...items]
        .filter((it) => !addedIds.has(it.id))
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((it) => ({ value: it.id, label: `${it.code} — ${it.name_ar}${it.spec ? ` (${it.spec})` : ''}` })),
    [items, addedIds],
  )

  // Warehouse whose stock should be shown as "available" for the current context:
  // TRANSFER cares about the source; every other type cares about the (single) warehouse field.
  const contextWarehouseId = type === 'TRANSFER' ? fromWarehouseId : warehouseId
  const availabilityMap = useMemo(() => {
    const m = new Map<string, number>()
    if (!stockMatrix || !contextWarehouseId) return m
    for (const row of stockMatrix) {
      if (row.warehouse_id !== contextWarehouseId) continue
      m.set(row.item_id, (m.get(row.item_id) ?? 0) + row.quantity)
    }
    return m
  }, [stockMatrix, contextWarehouseId])

  // Warehouses load asynchronously, so the default pick backfills once the list is ready
  // (only if the field is still empty — never overrides a user's own selection).
  useEffect(() => {
    if (!sortedWarehouses.length) return
    setWarehouseId((cur) => cur || sortedWarehouses[0].id)
    setFromWarehouseId((cur) => cur || sortedWarehouses[1]?.id || sortedWarehouses[0].id)
  }, [sortedWarehouses])

  const reset = () => {
    setType('IN')
    setWarehouseId(sortedWarehouses[0]?.id ?? '')
    setFromWarehouseId(sortedWarehouses[1]?.id ?? sortedWarehouses[0]?.id ?? '')
    setCompany(companyId ?? '')
    setProject('')
    setDocNumber('')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([])
    setMoreOpen(false)
    setTouched(false)
    setReceivedBy('')
    setIsLoan(false)
  }

  const close = () => {
    if (saving) return
    reset()
    onClose()
  }

  const addItem = (itemId: string) => {
    if (!itemId || addedIds.has(itemId)) return
    setLines((ls) => [...ls, makeLine(itemId)])
  }
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key))
  const stepQty = (key: string, delta: number) =>
    setLines((ls) =>
      ls.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, (Number(l.quantity) || 0) + delta) } : l)),
    )
  const setQty = (key: string, qty: number) =>
    setLines((ls) =>
      ls.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Number.isFinite(qty) ? qty : 1) } : l)),
    )

  const needsReceivedBy = type === 'OUT' || type === 'TRANSFER'

  const submit = async () => {
    setTouched(true)
    if (needsReceivedBy && !receivedBy.trim()) {
      toast.error(t('common.required'))
      return
    }
    if (lines.length === 0) {
      toast.error(t('warehouse.txn.no_lines'))
      return
    }
    try {
      setSaving(true)
      await apiPost('/inventory_transactions', {
        type,
        warehouse_id: warehouseId,
        from_warehouse_id: type === 'TRANSFER' ? fromWarehouseId : undefined,
        company_id: company || undefined,
        project_id: project || undefined,
        doc_number: docNumber || undefined,
        date,
        currency: 'IQD',
        notes: notes || undefined,
        total_value: 0,
        received_by: receivedBy.trim() || undefined,
        is_loan: type === 'OUT' ? isLoan : false,
        lines: lines.map((l) => {
          const it = itemMap.get(l.item_id)
          return {
            item_id: l.item_id,
            quantity: Number(l.quantity) || 1,
            uom: it?.uom,
            unit_price: 0,
            total: 0,
          }
        }),
      })
      toast.success(t('warehouse.txn.created'))
      reset()
      onCreated()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const whOptions = sortedWarehouses.map((w) => ({
    value: w.id,
    label: pickName(w, lang),
    group: t(`warehouse.wh_type.${w.type}`),
  }))
  const companyOptions = companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))
  const projectOptions = projects.map((p) => ({ value: p.id, label: pickName(p, lang) }))

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('warehouse.txn.dialog_title')}
      description={t('warehouse.txn.dialog_desc')}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            <PackagePlus className="h-4 w-4" />
            {t('warehouse.txn.submit')}
          </Button>
        </>
      }
    >
      {/* Movement type — segmented control */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {t('warehouse.txn.field_type')}
        </label>
        <div className="grid grid-cols-5 gap-2">
          {TXN_TYPES.map((ty) => {
            const Icon = TYPE_ICON[ty]
            const active = type === ty
            return (
              <button
                key={ty}
                type="button"
                onClick={() => setType(ty)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium ring-1 ring-inset transition',
                  active ? TYPE_TINT[ty] : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                <Icon className="h-5 w-5" />
                {t(`warehouse.type.${ty}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Warehouse(s) + date */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {type === 'TRANSFER' ? (
          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Field label={t('warehouse.txn.field_from_warehouse')} required>
              <Select value={fromWarehouseId} options={whOptions} onChange={(e) => setFromWarehouseId(e.target.value)} />
            </Field>
            <div className="hidden justify-center pb-2.5 sm:flex">
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400 rtl:rotate-180" />
            </div>
            <Field label={t('warehouse.txn.to_warehouse')} required>
              <Select value={warehouseId} options={whOptions} onChange={(e) => setWarehouseId(e.target.value)} />
            </Field>
          </div>
        ) : (
          <Field label={t('warehouse.txn.field_warehouse')} required>
            <Select value={warehouseId} options={whOptions} onChange={(e) => setWarehouseId(e.target.value)} />
          </Field>
        )}
        <Field label={t('warehouse.txn.field_date')} className={type === 'TRANSFER' ? 'sm:col-span-2' : ''}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {/* Receiver / custody — required for OUT & TRANSFER, loan toggle for OUT only */}
      {needsReceivedBy && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t('warehouse.txn.received_by')}
            required
            error={touched && !receivedBy.trim() ? t('common.required') : undefined}
            hint={t('warehouse.txn.received_by_hint')}
          >
            <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder={t('warehouse.txn.received_by_hint')} />
          </Field>
          {type === 'OUT' && (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setIsLoan((v) => !v)}
                className={cn(
                  'flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition sm:w-auto',
                  isLoan
                    ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-300'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded ring-1 ring-inset transition',
                    isLoan ? 'bg-amber-500 text-white ring-amber-500' : 'ring-slate-300',
                  )}
                >
                  {isLoan && <Check className="h-3 w-3" />}
                </span>
                {t('warehouse.txn.is_loan')}
              </button>
            </div>
          )}
        </div>
      )}

      <Field label={t('warehouse.txn.field_notes')} className="mt-4">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('warehouse.txn.field_notes')} />
      </Field>

      {/* More options — company / project / doc number, collapsed by default */}
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        className="mt-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:text-slate-700"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', moreOpen && 'rotate-180')} />
        {t('warehouse.txn.more_options')}
      </button>
      {moreOpen && (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t('warehouse.txn.field_company')}>
            <Select
              value={company}
              placeholder={t('common.all')}
              options={companyOptions}
              onChange={(e) => setCompany(e.target.value)}
            />
          </Field>
          <Field label={t('warehouse.txn.field_project')}>
            <Select
              value={project}
              placeholder={t('common.select')}
              options={projectOptions}
              onChange={(e) => setProject(e.target.value)}
            />
          </Field>
          <Field label={t('warehouse.txn.doc')}>
            <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
          </Field>
        </div>
      )}

      {/* Items cart — no prices, no totals */}
      <div className="mt-6">
        <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('warehouse.txn.items')}</h4>
        <SearchSelect
          value=""
          placeholder={t('warehouse.txn.add_item')}
          options={itemOptions}
          onChange={(val) => addItem(val)}
        />

        <div className="mt-3 space-y-2">
          {lines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-400">
              {t('warehouse.txn.no_items_yet')}
            </div>
          ) : (
            lines.map((l) => {
              const it = itemMap.get(l.item_id)
              const available = availabilityMap.get(l.item_id) ?? 0
              const exceeds = (type === 'OUT' || type === 'TRANSFER') && Number(l.quantity) > available
              return (
                <div key={l.key} className="rounded-xl px-4 py-3 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-700 dark:text-slate-200">{it ? pickName(it, lang) : l.item_id}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-400">
                        <span className="font-mono">{it?.code}</span>
                        <span className="mx-1.5">·</span>
                        {t('warehouse.txn.available')}: {formatNumber(available, lang)} {it?.uom}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepQty(l.key, -1)}
                        disabled={l.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="-"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <Input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => setQty(l.key, Number(e.target.value))}
                        className="w-16 text-center tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => stepQty(l.key, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="+"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <span className="ms-1 text-xs text-slate-400 dark:text-slate-400">{it?.uom}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 dark:text-slate-400 transition hover:bg-red-50 hover:text-danger"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {exceeds && <p className="mt-1.5 text-xs text-danger">{t('warehouse.txn.exceeds')}</p>}
                </div>
              )
            })
          )}
        </div>
        {touched && lines.length === 0 && <p className="mt-2 text-xs text-danger">{t('warehouse.txn.no_lines')}</p>}
      </div>
    </Dialog>
  )
}
