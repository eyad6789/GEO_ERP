import { useEffect, useMemo, useState } from 'react'
import { ListTree, FolderPlus } from 'lucide-react'
import { Dialog, Button, Field, Input, SearchSelect, useToast } from '../../components/ui'
import { useFormNav } from '../../hooks/useFormNav'
import { useLang, useT } from '../../context/LangContext'
import { pickName } from '../../lib/format'
import type { Account, AccountType } from '../../types'

// Account class is derived, never chosen: a sub-account inherits its parent's
// class; a top-level account is classed by its leading digit (Unified system:
// 1 assets · 2 liabilities · 3 expenses · 4 revenue).
const TYPE_BY_DIGIT: Record<string, AccountType> = {
  '1': 'ASSET',
  '2': 'LIABILITY',
  '3': 'EXPENSE',
  '4': 'REVENUE',
}
const normalBalanceOf = (t: AccountType) => (t === 'ASSET' || t === 'EXPENSE' ? 'DEBIT' : 'CREDIT')

export function NewAccountDialog({
  open,
  onClose,
  accounts,
  create,
  update,
  onCreated,
  presetParent,
}: {
  open: boolean
  onClose: () => void
  accounts: Account[]
  create: (body: Partial<Account>) => Promise<unknown>
  update?: (id: string, body: Partial<Account>) => Promise<unknown>
  onCreated: () => void
  presetParent?: string
}) {
  const t = useT()
  const { lang } = useLang()
  const { error } = useToast()
  const formNav = useFormNav()

  const [code, setCode] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [parentCode, setParentCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setCode('')
    setNameAr('')
    setNameEn('')
    setParentCode(presetParent ?? '')
  }, [open, presetParent])

  // Any non-archived account can be a parent (so a new account nests under it).
  const parentOptions = useMemo(
    () => [
      { value: '', label: t('accounting.add.parent_none') },
      ...accounts
        .filter((a) => a.archived !== 1)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((a) => ({ value: a.code, label: `${a.code} — ${pickName(a, lang)}` })),
    ],
    [accounts, lang, t],
  )

  const parent = parentCode ? accounts.find((a) => a.code === parentCode) : undefined
  const derivedType: AccountType = parent?.type ?? TYPE_BY_DIGIT[code.trim()[0]] ?? 'ASSET'

  const submit = async () => {
    const c = code.trim()
    if (!c) return error(t('common.required'))
    if (!nameAr.trim()) return error(t('common.required'))
    if (accounts.some((a) => a.code === c)) return error(t('accounting.add.err_dup'))

    const level = parent ? (parent.level || 1) + 1 : 1
    setSubmitting(true)
    try {
      await create({
        code: c,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim(),
        type: derivedType,
        normal_balance: normalBalanceOf(derivedType),
        parent_code: parentCode || null,
        level,
        is_posting: 1, // new accounts are postable leaves; they become a group once they get children
        archived: 0,
      })
      // The parent now has a child, so it becomes a header (no longer postable).
      if (parent && parent.is_posting === 1 && update) {
        await update(parent.code, { is_posting: 0 })
      }
      onCreated()
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
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          {presetParent ? <FolderPlus className="h-5 w-5 text-primary" /> : <ListTree className="h-5 w-5 text-primary" />}
          {presetParent ? t('accounting.add.child') : t('accounting.add.title')}
        </span>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting}>
            {t('accounting.add.button')}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" {...formNav}>
        <Field label={t('accounting.add.parent')} className="sm:col-span-2">
          <SearchSelect
            value={parentCode}
            onChange={setParentCode}
            options={parentOptions}
            placeholder={t('common.search')}
          />
        </Field>
        <Field label={t('accounting.add.code')} required>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثال: 1151" className="font-mono" dir="ltr" />
        </Field>
        <Field label={t('accounting.add.name_ar')} required>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
        </Field>
        <Field label={t('accounting.add.name_en')} className="sm:col-span-2">
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
        </Field>
      </div>
    </Dialog>
  )
}
