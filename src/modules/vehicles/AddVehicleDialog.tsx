import { registerStrings } from '../../i18n/strings'
import { FormDialog } from '../../components/shared'
import type { FormFieldConfig } from '../../components/shared'
import { useT } from '../../context/LangContext'
import { useToast } from '../../components/ui/Toast'
import { useResource } from '../../hooks/useResource'
import { apiPost } from '../../lib/api'
import { VEHICLE_TYPES } from './fleetUtils'
import type { Project, Vehicle } from '../../types'

// Extra keys needed only by this dialog
registerStrings({
  'fleet.vehicle.added': { ar: 'تمت إضافة الآلية بنجاح', en: 'Vehicle added successfully' },
})

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function AddVehicleDialog({ open, onClose, onCreated }: Props) {
  const t = useT()
  const toast = useToast()
  const { data: projects } = useResource<Project>('projects')

  const typeOptions = VEHICLE_TYPES.map((k) => ({ value: k, label: t(`fleet.type.${k}`) }))
  const projectOptions = [
    { value: '', label: t('fleet.card.no_project') },
    ...projects.map((p) => ({ value: p.id, label: `${p.name_ar} — ${p.name_en}` })),
  ]

  const fields: FormFieldConfig[] = [
    {
      name: 'vehicle_type',
      label: t('fleet.field.type'),
      type: 'select',
      required: true,
      options: typeOptions,
    },
    {
      name: 'plate_number',
      label: t('fleet.field.plate'),
      type: 'text',
      required: true,
      dir: 'ltr',
      placeholder: t('fleet.field.plate'),
    },
    {
      name: 'model_year',
      label: t('fleet.field.model_year'),
      type: 'number',
      placeholder: new Date().getFullYear().toString(),
    },
    {
      name: 'registration_expiry',
      label: t('fleet.field.registration_expiry'),
      type: 'date',
    },
    {
      name: 'owner_name',
      label: t('fleet.field.owner'),
      type: 'text',
    },
    {
      name: 'project_id',
      label: t('fleet.field.project'),
      type: 'select',
      options: projectOptions,
      hint: t('fleet.dialog.project_hint'),
    },
    {
      name: 'driver_name',
      label: t('fleet.field.driver'),
      type: 'text',
    },
    {
      name: 'oil_change_date',
      label: t('fleet.field.oil_change'),
      type: 'date',
    },
  ]

  const handleSubmit = async (values: Record<string, unknown>) => {
    const now = new Date().toISOString()
    const code = `VEH-${Date.now().toString(36).toUpperCase()}`
    const payload: Partial<Vehicle> = {
      ...values as Partial<Vehicle>,
      code,
      status: 'ACTIVE',
      model_year: values.model_year ? Number(values.model_year) : null,
      project_id: (values.project_id as string) || null,
      // seed compatible bilingual names — use plate as fallback
      name_ar: (values.plate_number as string) || code,
      name_en: (values.plate_number as string) || code,
      created_at: now,
    }
    await apiPost('/vehicles', payload)
    toast.success(t('fleet.vehicle.added'))
    onCreated?.()
    onClose()
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={t('fleet.dialog.add_title')}
      description={t('fleet.dialog.add_hint')}
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel={t('fleet.add')}
      size="lg"
    />
  )
}
