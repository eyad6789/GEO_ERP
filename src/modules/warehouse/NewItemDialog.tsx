import { useMemo, useState, type ReactNode } from 'react'
import { Dialog, Button, Field, Input, Select, useToast, type SelectOption } from '../../components/ui'
import { useApi, useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { formatNumber } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { Item } from '../../types'
import {
  categoryLabel,
  subCategoryLabel,
  nextItemCode,
  parseSizeInput,
  COMMON_UOMS,
  COMMON_DN_SIZES,
  type CategoryDef,
  type StockSummaryRow,
} from './helpers'

export function NewItemDialog({
  open,
  onClose,
  onCreated,
  rows,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  rows: StockSummaryRow[]
}) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { create } = useResource<Item>('items')
  const { data: taxonomy } = useApi<CategoryDef[]>('/warehouse/categories')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [uom, setUom] = useState('')
  const [size, setSize] = useState('')
  const [shelf, setShelf] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const nextCode = useMemo(() => nextItemCode(rows), [rows])

  const categoryOptions: SelectOption[] = useMemo(
    () => (taxonomy ?? []).map((c) => ({ value: c.id, label: categoryLabel(taxonomy, c.id, lang) })),
    [taxonomy, lang],
  )

  const selectedCategory = useMemo(
    () => (taxonomy ?? []).find((c) => c.id === category) ?? null,
    [taxonomy, category],
  )
  const hasSubs = (selectedCategory?.subs.length ?? 0) > 0
  const subCategoryOptions: SelectOption[] = useMemo(
    () => (selectedCategory?.subs ?? []).map((s) => ({ value: s.id, label: subCategoryLabel(taxonomy, s.id, lang) })),
    [selectedCategory, taxonomy, lang],
  )

  const reset = () => {
    setName('')
    setCategory('')
    setSubCategory('')
    setUom('')
    setSize('')
    setShelf('')
    setTouched(false)
  }

  const close = () => {
    if (saving) return
    reset()
    onClose()
  }

  const submit = async () => {
    setTouched(true)
    if (!name.trim() || !category || !uom.trim()) return
    try {
      setSaving(true)
      const { size_label, size_mm } = parseSizeInput(size)
      await create({
        name_ar: name.trim(),
        name_en: '',
        code: nextCode,
        category,
        sub_category: subCategory || '',
        uom: uom.trim(),
        size_label,
        size_mm,
        spec: size.trim(),
        shelf_location: shelf.trim(),
        min_stock: 0,
        max_stock: 0,
        unit_cost: 0,
        currency: 'IQD',
      })
      reset()
      onCreated()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const nameError = touched && !name.trim() ? t('common.required') : undefined
  const categoryError = touched && !category ? t('common.required') : undefined
  const uomError = touched && !uom.trim() ? t('common.required') : undefined

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('warehouse.items.new')}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={t('warehouse.field.name')}
          required
          error={nameError}
          hint={!nameError ? t('warehouse.field.name_hint') : undefined}
          className="sm:col-span-2"
        >
          <Input dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field
          label={t('warehouse.field.category')}
          required
          error={categoryError}
          className={hasSubs ? undefined : 'sm:col-span-2'}
        >
          <Select
            value={category}
            placeholder={t('common.select')}
            options={categoryOptions}
            onChange={(e) => {
              setCategory(e.target.value)
              setSubCategory('')
            }}
          />
        </Field>

        {hasSubs && (
          <Field label={t('warehouse.field.sub_category')}>
            <Select
              value={subCategory}
              placeholder="—"
              options={subCategoryOptions}
              onChange={(e) => setSubCategory(e.target.value)}
            />
          </Field>
        )}

        <Field label={t('warehouse.field.uom')} required error={uomError} className="sm:col-span-2">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {COMMON_UOMS.map((u) => (
              <Chip key={u} active={u === uom.trim()} onClick={() => setUom(u)}>
                {u}
              </Chip>
            ))}
          </div>
          <Input value={uom} onChange={(e) => setUom(e.target.value)} placeholder={t('warehouse.field.uom_pick')} />
        </Field>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('warehouse.field.size')}{' '}
            <span className="text-xs font-normal text-slate-400 dark:text-slate-400">({t('warehouse.field.optional')})</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_DN_SIZES.map((n) => (
              <Chip key={n} active={String(n) === size.trim()} onClick={() => setSize(String(n))}>
                {formatNumber(n, lang)}
              </Chip>
            ))}
          </div>
          <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="DN 600" />
          <span className="text-xs text-slate-400 dark:text-slate-400">{t('warehouse.field.size_hint')}</span>
        </div>

        <Field label={t('warehouse.field.shelf_location')}>
          <Input value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="A-12" />
        </Field>
      </div>

      <p className="mt-5 text-xs text-slate-400 dark:text-slate-400">
        {t('warehouse.field.code_auto')} <span dir="ltr" className="font-mono font-semibold text-slate-500 dark:text-slate-400">{nextCode}</span>
      </p>
    </Dialog>
  )
}

// Pill chip with a clear (primary-tinted) active state — matches CategoryExplorer's chips.
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
        active
          ? 'bg-primary/10 text-primary ring-primary/30 font-semibold'
          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
      )}
    >
      {children}
    </button>
  )
}
