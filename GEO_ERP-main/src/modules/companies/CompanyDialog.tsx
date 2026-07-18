import { useEffect, useState } from 'react'
import { Building2, Pencil } from 'lucide-react'
import { Dialog, Button, Field, Input, SearchSelect } from '../../components/ui'
import { useT } from '../../context/LangContext'
import type { Company } from '../../types'

interface FormState {
  name_ar: string
  name_en: string
  code: string
  city: string
  phone: string
  email: string
  status: string
}

const blank: FormState = { name_ar: '', name_en: '', code: '', city: '', phone: '', email: '', status: 'ACTIVE' }

/** Create/edit dialog for a company — used from the الشركات list (accountant only). */
export function CompanyDialog({
  open,
  company,
  onClose,
  onSubmit,
}: {
  open: boolean
  company: Company | null // null = create
  onClose: () => void
  onSubmit: (data: Partial<Company>) => Promise<void>
}) {
  const t = useT()
  const isEdit = !!company
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  useEffect(() => {
    if (!open) return
    setForm(
      company
        ? {
            name_ar: company.name_ar ?? '',
            name_en: company.name_en ?? '',
            code: company.code ?? '',
            city: company.city ?? '',
            phone: company.phone ?? '',
            email: company.email ?? '',
            status: company.status ?? 'ACTIVE',
          }
        : blank,
    )
  }, [open, company])

  const canSave = form.name_ar.trim().length > 0

  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await onSubmit({
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim(),
        code: form.code.trim(),
        city: form.city.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status as Company['status'],
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
          {isEdit ? t('companies.edit_title') : t('companies.add_title')}
        </span>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? t('companies.saving') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('companies.f_name_ar')} required>
          <Input value={form.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
        </Field>
        <Field label={t('companies.f_name_en')}>
          <Input dir="ltr" value={form.name_en} onChange={(e) => set({ name_en: e.target.value })} />
        </Field>
        <Field label={t('companies.f_code')}>
          <Input dir="ltr" className="font-mono" value={form.code} onChange={(e) => set({ code: e.target.value })} />
        </Field>
        <Field label={t('companies.f_city')}>
          <Input value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </Field>
        <Field label={t('companies.f_phone')}>
          <Input dir="ltr" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label={t('companies.f_email')}>
          <Input dir="ltr" value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label={t('companies.f_status')}>
          <SearchSelect
            value={form.status}
            onChange={(v) => set({ status: v || 'ACTIVE' })}
            options={[
              { value: 'ACTIVE', label: t('companies.filter_active') },
              { value: 'INACTIVE', label: t('companies.filter_inactive') },
            ]}
          />
        </Field>
      </div>
    </Dialog>
  )
}
