import { useEffect, useMemo, useState } from 'react'
import { FolderKanban } from 'lucide-react'
import { Dialog, Button, Field, Input, SearchSelect, useToast } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { apiPost } from '../../lib/api'
import { pickName } from '../../lib/format'
import type { Company, Project } from '../../types'

/** TEMPORARY project creation for the accountant — the projects module isn't
 *  finished yet, but the accountant needs real projects to post entries
 *  against. Everything created here is a REAL row via the normal API. */
export function NewProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const { success, error } = useToast()
  const { data: companies } = useResource<Company>('companies')
  const { data: projects, refetch } = useResource<Project>('projects')

  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [code, setCode] = useState('')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [saving, setSaving] = useState(false)

  // Suggest the next code in the existing PRJ-0XX sequence (editable).
  const nextCode = useMemo(() => {
    let max = 0
    for (const p of projects) {
      const m = /(\d+)$/.exec(p.code || '')
      if (m) max = Math.max(max, +m[1])
    }
    return `PRJ-${String(max + 1).padStart(3, '0')}`
  }, [projects])

  useEffect(() => {
    if (!open) return
    setNameAr('')
    setNameEn('')
    setCompanyId('')
    setLocation('')
    setStatus('ACTIVE')
    setCode('')
  }, [open])

  const companyOptions = companies.map((c) => ({ value: c.id, label: pickName(c, lang) }))
  const statusOptions = (['ACTIVE', 'PLANNING', 'ON_HOLD', 'COMPLETED'] as const).map((s) => ({
    value: s,
    label: t(`accounting.newprj.st.${s}`),
  }))

  const handleSave = async () => {
    if (!nameAr.trim() || saving) return
    setSaving(true)
    try {
      await apiPost('/projects', {
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        company_id: companyId || null,
        code: code.trim() || nextCode,
        location: location.trim(),
        status,
        currency: 'IQD',
        progress: 0,
      })
      success(t('accounting.newprj.saved'))
      refetch()
      onCreated?.()
      onClose()
    } catch (e) {
      error((e as Error)?.message || t('common.error'))
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
          <FolderKanban className="h-5 w-5 text-primary" />
          {t('accounting.newprj.title')}
        </span>
      }
      description={t('accounting.newprj.desc')}
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || !nameAr.trim()}>
            {saving ? t('companies.saving') : t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('accounting.newprj.name_ar')} required>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </Field>
        <Field label={t('accounting.newprj.name_en')}>
          <Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </Field>
        <Field label={t('common.company')}>
          <SearchSelect value={companyId} onChange={setCompanyId} options={companyOptions} placeholder={t('common.select')} />
        </Field>
        <Field label={t('accounting.newprj.code')} hint={`${t('accounting.newprj.code_hint')} ${nextCode}`}>
          <Input dir="ltr" className="font-mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder={nextCode} />
        </Field>
        <Field label={t('accounting.newprj.location')}>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label={t('common.status')}>
          <SearchSelect value={status} onChange={(v) => setStatus(v || 'ACTIVE')} options={statusOptions} />
        </Field>
      </div>
    </Dialog>
  )
}
