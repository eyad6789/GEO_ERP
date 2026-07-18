import { useEffect, useState, type ReactNode } from 'react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input, Textarea, Field } from '../ui/Input'
import { Select, type SelectOption } from '../ui/Select'
import { useT } from '../../context/LangContext'
import { useToast } from '../ui/Toast'
import { useFormNav } from '../../hooks/useFormNav'

export type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'select' | 'email' | 'tel'

export interface FormFieldConfig {
  name: string
  label: string
  type?: FieldType
  required?: boolean
  options?: SelectOption[]
  placeholder?: string
  hint?: string
  colSpan?: 1 | 2
  dir?: 'rtl' | 'ltr'
  defaultValue?: string | number
}

export interface FormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  fields: FormFieldConfig[]
  initial?: Record<string, unknown>
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void
  submitLabel?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Custom content rendered above the fields grid (e.g. an avatar uploader). */
  header?: ReactNode
}

function buildInitial(fields: FormFieldConfig[], initial?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    out[f.name] = initial?.[f.name] ?? f.defaultValue ?? (f.type === 'number' ? 0 : '')
  }
  return out
}

export function FormDialog({
  open,
  onClose,
  title,
  description,
  fields,
  initial,
  onSubmit,
  submitLabel,
  size = 'md',
  header,
}: FormDialogProps) {
  const t = useT()
  const toast = useToast()
  const formNav = useFormNav()
  const [values, setValues] = useState<Record<string, unknown>>(() => buildInitial(fields, initial))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(buildInitial(fields, initial))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (name: string, value: unknown) => setValues((v) => ({ ...v, [name]: value }))

  const submit = async () => {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && (values[f.name] === '' || values[f.name] === undefined || values[f.name] === null)) {
        errs[f.name] = t('common.required')
      }
    }
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      setSaving(true)
      await onSubmit(values)
      toast.success(t('common.saved'))
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {submitLabel ?? t('common.save')}
          </Button>
        </>
      }
    >
      {header && <div className="mb-5">{header}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" {...formNav}>
        {fields.map((f) => {
          const span = (f.colSpan ?? (f.type === 'textarea' ? 2 : 1)) === 2 ? 'sm:col-span-2' : ''
          return (
            <Field key={f.name} label={f.label} required={f.required} error={errors[f.name]} hint={f.hint} className={span}>
              {f.type === 'textarea' ? (
                <Textarea
                  dir={f.dir}
                  value={String(values[f.name] ?? '')}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : f.type === 'select' ? (
                <Select
                  value={String(values[f.name] ?? '')}
                  placeholder={f.placeholder ?? t('common.select')}
                  options={f.options}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type ?? 'text'}
                  dir={f.dir}
                  value={String(values[f.name] ?? '')}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.name, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                />
              )}
            </Field>
          )
        })}
      </div>
    </Dialog>
  )
}
