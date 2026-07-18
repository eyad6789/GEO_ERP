import { useEffect, useState } from 'react'
import { Landmark, Pencil } from 'lucide-react'
import { Dialog, Button, Field, Input, Select, useToast } from '../../components/ui'
import { NumberInput } from '../../components/shared'
import { useResource } from '../../hooks/useResource'
import { useFormNav } from '../../hooks/useFormNav'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiPost, apiPut } from '../../lib/api'
import { pickName } from '../../lib/format'
import type { Bank, Company } from '../../types'

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function NewBankDialog({
  open,
  onClose,
  onSaved,
  editBank,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editBank?: Bank | null
}) {
  const t = useT()
  const { lang } = useLang()
  const { companyId } = useCompany()
  const { success, error } = useToast()
  const formNav = useFormNav()
  const { data: companies } = useResource<Company>('companies')

  const isEdit = !!editBank
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [branch, setBranch] = useState('')
  const [company, setCompany] = useState(companyId ?? '')
  const [openingIqd, setOpeningIqd] = useState('')
  const [openingUsd, setOpeningUsd] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editBank) {
      setNameAr(editBank.name_ar ?? '')
      setNameEn(editBank.name_en ?? '')
      setBranch(editBank.branch ?? '')
      setCompany(editBank.company_id ?? '')
      setOpeningIqd(editBank.opening_balance_iqd ? String(editBank.opening_balance_iqd) : '')
      setOpeningUsd(editBank.opening_balance_usd ? String(editBank.opening_balance_usd) : '')
    } else {
      setNameAr('')
      setNameEn('')
      setBranch('')
      setCompany(companyId ?? '')
      setOpeningIqd('')
      setOpeningUsd('')
    }
  }, [open, editBank, companyId])

  const close = () => {
    if (submitting) return
    onClose()
  }

  const submit = async () => {
    if (!nameAr.trim()) return error(t('accounting.bank.err_name'))
    const iqd = num(openingIqd)
    const usd = num(openingUsd)

    const body: Record<string, unknown> = {
      name_ar: nameAr.trim(),
      name_en: nameEn.trim(),
      branch: branch.trim(),
      company_id: company || null,
      opening_balance_iqd: iqd,
      opening_balance_usd: usd,
    }

    setSubmitting(true)
    try {
      if (editBank) {
        // Keep the live balance in sync with any change to the opening balance.
        const deltaIqd = iqd - (editBank.opening_balance_iqd ?? 0)
        const deltaUsd = usd - (editBank.opening_balance_usd ?? 0)
        body.balance_iqd = (editBank.balance_iqd ?? 0) + deltaIqd
        body.balance_usd = (editBank.balance_usd ?? 0) + deltaUsd
        await apiPut(`/banks/${editBank.id}`, body)
      } else {
        body.balance_iqd = iqd
        body.balance_usd = usd
        body.status = 'ACTIVE'
        await apiPost('/banks', body)
      }
      success(t('common.saved'))
      onSaved()
      onClose()
    } catch (e) {
      error((e as Error)?.message || t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <Landmark className="h-5 w-5 text-primary" />}
          {isEdit ? t('accounting.bank.edit') : t('accounting.bank.new')}
        </span>
      }
      description={t('accounting.bank.desc')}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={close} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? t('accounting.new.saving') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" {...formNav}>
        <Field label={t('accounting.bank.name_ar')} required>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={t('accounting.bank.name_ar')} />
        </Field>
        <Field label={t('accounting.bank.name_en')}>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={t('accounting.bank.name_en')} dir="ltr" />
        </Field>
        <Field label={t('accounting.bank.branch')}>
          <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
        <Field label={t('accounting.new.company')} className="sm:col-span-2">
          <Select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            options={companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))}
            placeholder={t('common.select')}
          />
        </Field>
        <Field label={t('accounting.bank.opening_iqd')}>
          <NumberInput value={openingIqd} onValueChange={setOpeningIqd} className="tabular-nums" />
        </Field>
        <Field label={t('accounting.bank.opening_usd')}>
          <NumberInput value={openingUsd} onValueChange={setOpeningUsd} className="tabular-nums" />
        </Field>
      </div>
    </Dialog>
  )
}
