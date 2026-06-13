import { useMemo, useState } from 'react'
import { Plus, Receipt, Wallet } from 'lucide-react'
import { ArabicTable, type Column } from '../../../components/shared/ArabicTable'
import { FormDialog, type FormFieldConfig } from '../../../components/shared/FormDialog'
import { KpiCard } from '../../../components/shared/KpiCard'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { useResource } from '../../../hooks/useResource'
import { useT, useLang } from '../../../context/LangContext'
import { formatCurrency, formatDate } from '../../../lib/format'
import { CURRENCIES } from '../../../types'
import type { ProjectExpenditure } from '../../../types'

const PAYMENT_METHODS: { value: string; ar: string; en: string }[] = [
  { value: 'CASH', ar: 'نقدي', en: 'Cash' },
  { value: 'TRANSFER', ar: 'تحويل بنكي', en: 'Bank transfer' },
  { value: 'CHEQUE', ar: 'شيك', en: 'Cheque' },
  { value: 'CARD', ar: 'بطاقة', en: 'Card' },
]

export function ExpendituresTab({ projectId, currency }: { projectId: string; currency: string }) {
  const t = useT()
  const { lang } = useLang()
  const { data: expenditures, loading, create } = useResource<ProjectExpenditure>('project_expenditures', { project_id: projectId })
  const [open, setOpen] = useState(false)

  const total = useMemo(() => expenditures.reduce((s, e) => s + (e.amount || 0), 0), [expenditures])

  const methodLabel = (m: string) => {
    const found = PAYMENT_METHODS.find((p) => p.value === m)
    return found ? found[lang] : m || '—'
  }

  const columns: Column<ProjectExpenditure>[] = [
    { key: 'serial_number', header: t('projects.exp.serial'), sortable: true, width: '120px', render: (e) => <span className="font-mono text-xs text-slate-500">{e.serial_number}</span> },
    { key: 'doc_number', header: t('projects.exp.doc'), render: (e) => <span className="font-mono text-xs text-slate-500">{e.doc_number}</span> },
    { key: 'date', header: t('common.date'), accessor: (e) => e.date, sortable: true, render: (e) => formatDate(e.date, lang) },
    { key: 'category', header: t('projects.exp.category'), sortable: true, render: (e) => <Badge color="sky">{e.category}</Badge> },
    { key: 'description', header: t('common.description'), render: (e) => <span className="text-slate-700">{e.description}</span> },
    { key: 'amount', header: t('common.amount'), accessor: (e) => e.amount, sortable: true, align: 'end', render: (e) => <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(e.amount, e.currency, lang)}</span> },
    { key: 'paid_to', header: t('projects.exp.paid_to'), render: (e) => <span className="text-slate-700">{e.paid_to || '—'}</span> },
    { key: 'payment_method', header: t('projects.exp.method'), accessor: (e) => methodLabel(e.payment_method), render: (e) => methodLabel(e.payment_method) },
  ]

  const fields: FormFieldConfig[] = [
    { name: 'date', label: t('common.date'), type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
    { name: 'doc_number', label: t('projects.exp.doc'), type: 'text', placeholder: 'EXP-0001' },
    { name: 'category', label: t('projects.exp.category'), type: 'text', required: true },
    { name: 'amount', label: t('common.amount'), type: 'number', required: true },
    {
      name: 'currency',
      label: t('common.currency'),
      type: 'select',
      defaultValue: currency || 'IQD',
      options: CURRENCIES.map((c) => ({ value: c, label: c })),
    },
    {
      name: 'payment_method',
      label: t('projects.exp.method'),
      type: 'select',
      defaultValue: 'CASH',
      options: PAYMENT_METHODS.map((m) => ({ value: m.value, label: m[lang] })),
    },
    { name: 'paid_to', label: t('projects.exp.paid_to'), type: 'text', colSpan: 1 },
    { name: 'description', label: t('common.description'), type: 'textarea', colSpan: 2 },
  ]

  const handleSubmit = async (values: Record<string, unknown>) => {
    await create({
      project_id: projectId,
      date: String(values.date),
      doc_number: String(values.doc_number || ''),
      category: String(values.category || ''),
      amount: Number(values.amount) || 0,
      currency: (values.currency || currency || 'IQD') as ProjectExpenditure['currency'],
      payment_method: String(values.payment_method || 'CASH'),
      paid_to: String(values.paid_to || ''),
      description: String(values.description || ''),
    } as Partial<ProjectExpenditure>)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label={t('projects.exp.total')} value={formatCurrency(total, currency, lang)} icon={<Wallet className="h-5 w-5" />} accent="danger" />
        <KpiCard label={t('projects.exp.count')} value={expenditures.length} icon={<Receipt className="h-5 w-5" />} accent="primary" />
      </div>

      <Card>
        <CardHeader
          title={t('projects.exp.title')}
          icon={<Receipt className="h-4 w-4" />}
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('projects.exp.add')}
            </Button>
          }
        />
        <CardBody className="p-0">
          <ArabicTable
            columns={columns}
            data={expenditures}
            loading={loading}
            rowKey={(e) => e.id}
            searchPlaceholder={t('common.search')}
            exportName={`project-${projectId}-expenditures`}
            emptyTitle={t('projects.exp.empty')}
          />
        </CardBody>
      </Card>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('projects.exp.add')}
        fields={fields}
        onSubmit={handleSubmit}
        submitLabel={t('common.save')}
        size="lg"
      />
    </div>
  )
}
