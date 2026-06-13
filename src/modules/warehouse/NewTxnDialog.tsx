import { useMemo, useState } from 'react'
import { Plus, Trash2, PackagePlus } from 'lucide-react'
import { Dialog, Button, Field, Input, Select } from '../../components/ui'
import { useToast } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { useT, useLang } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiPost } from '../../lib/api'
import { formatCurrency, pickName } from '../../lib/format'
import { CURRENCIES, type Currency, type InventoryTxnType, type Item, type Company, type Project } from '../../types'
import { TXN_TYPES, WAREHOUSE_IDS } from './helpers'

interface LineDraft {
  key: string
  item_id: string
  quantity: number
  unit_price: number
}

let lineCounter = 0
function blankLine(): LineDraft {
  lineCounter += 1
  return { key: `ln-${lineCounter}`, item_id: '', quantity: 1, unit_price: 0 }
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

  const [type, setType] = useState<InventoryTxnType>('IN')
  const [warehouseId, setWarehouseId] = useState<string>(WAREHOUSE_IDS[0])
  const [fromWarehouseId, setFromWarehouseId] = useState<string>(WAREHOUSE_IDS[1])
  const [company, setCompany] = useState<string>(companyId ?? '')
  const [project, setProject] = useState<string>('')
  const [currency, setCurrency] = useState<Currency>('IQD')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState<string>('')
  const [lines, setLines] = useState<LineDraft[]>([blankLine()])
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const itemMap = useMemo(() => {
    const m = new Map<string, Item>()
    for (const it of items) m.set(it.id, it)
    return m
  }, [items])

  const itemOptions = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((it) => ({ value: it.id, label: `${it.code} — ${it.name_ar}` })),
    [items],
  )

  const reset = () => {
    setType('IN')
    setWarehouseId(WAREHOUSE_IDS[0])
    setFromWarehouseId(WAREHOUSE_IDS[1])
    setCompany(companyId ?? '')
    setProject('')
    setCurrency('IQD')
    setDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([blankLine()])
    setTouched(false)
  }

  const close = () => {
    if (saving) return
    reset()
    onClose()
  }

  const setLine = (key: string, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const addLine = () => setLines((ls) => [...ls, blankLine()])
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls))

  const grandTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
    [lines],
  )

  const validLines = lines.filter((l) => l.item_id && Number(l.quantity) > 0)

  const submit = async () => {
    setTouched(true)
    if (validLines.length === 0) {
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
        date,
        currency,
        notes: notes || undefined,
        lines: validLines.map((l) => {
          const it = itemMap.get(l.item_id)
          return {
            item_id: l.item_id,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price) || it?.unit_cost || 0,
            uom: it?.uom,
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

  const typeOptions = TXN_TYPES.map((ty) => ({ value: ty, label: t(`warehouse.type.${ty}`) }))
  const whOptions = WAREHOUSE_IDS.map((id) => ({ value: id, label: t(`warehouse.wh.${id}`) }))
  const companyOptions = companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))
  const projectOptions = projects.map((p) => ({ value: p.id, label: pickName(p, lang) }))
  const currencyOptions = CURRENCIES.map((c) => ({ value: c, label: c }))

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t('warehouse.txn.field_type')} required>
          <Select
            value={type}
            options={typeOptions}
            onChange={(e) => setType(e.target.value as InventoryTxnType)}
          />
        </Field>
        <Field label={t('warehouse.txn.field_warehouse')} required>
          <Select value={warehouseId} options={whOptions} onChange={(e) => setWarehouseId(e.target.value)} />
        </Field>
        {type === 'TRANSFER' ? (
          <Field label={t('warehouse.txn.field_from_warehouse')} required>
            <Select
              value={fromWarehouseId}
              options={whOptions}
              onChange={(e) => setFromWarehouseId(e.target.value)}
            />
          </Field>
        ) : (
          <Field label={t('warehouse.txn.field_date')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        {type === 'TRANSFER' && (
          <Field label={t('warehouse.txn.field_date')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        <Field label={t('warehouse.txn.field_currency')}>
          <Select value={currency} options={currencyOptions} onChange={(e) => setCurrency(e.target.value as Currency)} />
        </Field>
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
        <Field label={t('warehouse.txn.field_notes')} className="sm:col-span-3">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('warehouse.txn.field_notes')} />
        </Field>
      </div>

      {/* Lines editor */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">{t('warehouse.txn.lines')}</h4>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4" />
            {t('warehouse.txn.add_line')}
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 text-start">{t('warehouse.txn.line_item')}</th>
                <th className="w-28 px-3 py-2.5 text-start">{t('warehouse.txn.line_qty')}</th>
                <th className="w-36 px-3 py-2.5 text-start">{t('warehouse.txn.line_price')}</th>
                <th className="w-40 px-3 py-2.5 text-end">{t('warehouse.txn.line_total')}</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => {
                const total = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0)
                const missing = touched && !l.item_id
                return (
                  <tr key={l.key} className="align-middle">
                    <td className="px-3 py-2">
                      <Select
                        value={l.item_id}
                        placeholder={t('warehouse.txn.select_item')}
                        options={itemOptions}
                        className={missing ? 'ring-1 ring-danger' : ''}
                        onChange={(e) => {
                          const it = itemMap.get(e.target.value)
                          setLine(l.key, {
                            item_id: e.target.value,
                            unit_price: l.unit_price || it?.unit_cost || 0,
                          })
                        }}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={l.quantity}
                        onChange={(e) => setLine(l.key, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={l.unit_price}
                        onChange={(e) => setLine(l.key, { unit_price: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2 text-end font-medium tabular-nums text-slate-700">
                      {formatCurrency(total, currency, lang)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        disabled={lines.length === 1}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-danger disabled:opacity-30"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={3} className="px-3 py-3 text-end text-sm font-semibold text-slate-600">
                  {t('warehouse.txn.grand_total')}
                </td>
                <td className="px-3 py-3 text-end text-base font-bold tabular-nums text-primary">
                  {formatCurrency(grandTotal, currency, lang)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {touched && validLines.length === 0 && (
          <p className="mt-2 text-xs text-danger">{t('warehouse.txn.no_lines')}</p>
        )}
      </div>
    </Dialog>
  )
}
