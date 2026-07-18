import { registerStrings } from '../../i18n/strings'
import { FormDialog } from '../../components/shared'
import type { FormFieldConfig } from '../../components/shared'
import { useT, useLang } from '../../context/LangContext'
import { useToast } from '../../components/ui/Toast'
import { useResource } from '../../hooks/useResource'
import { apiPost } from '../../lib/api'
import { pickName } from '../../lib/format'
import { VEHICLE_TYPES, VEHICLE_STATUSES, FLEET_LOCATIONS, locationCoords } from './fleetUtils'
import type { Company, Project, Vehicle, VehicleStatus } from '../../types'

// Extra keys needed only by this dialog
registerStrings({
  'fleet.vehicle.added': { ar: 'تمت إضافة الآلية بنجاح', en: 'Vehicle added successfully' },
  'fleet.field.name': { ar: 'اسم الآلية', en: 'Vehicle Name' },
  'fleet.dialog.location_hint': { ar: 'يحدد موقع الآلية على الخريطة', en: 'Places the vehicle on the map' },
})

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: (vehicle: Vehicle) => void
}

export function AddVehicleDialog({ open, onClose, onCreated }: Props) {
  const t = useT()
  const { lang } = useLang()
  const toast = useToast()
  const { data: projects } = useResource<Project>('projects')
  const { data: companies } = useResource<Company>('companies')

  const typeOptions = VEHICLE_TYPES.map((k) => ({ value: k, label: t(`fleet.type.${k}`) }))
  const statusOptions = VEHICLE_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))
  const companyOptions = [
    { value: '', label: '—' },
    ...companies.map((c) => ({ value: c.id, label: pickName(c, lang) })),
  ]
  const locationOptions = [
    { value: '', label: '—' },
    ...FLEET_LOCATIONS.map((l) => ({ value: l.name, label: l.name })),
  ]
  const projectOptions = [
    { value: '', label: t('fleet.card.no_project') },
    ...projects.map((p) => ({ value: p.id, label: `${p.name_ar} — ${p.name_en}` })),
  ]

  const fields: FormFieldConfig[] = [
    { name: 'vehicle_type', label: t('fleet.field.type'), type: 'select', required: true, options: typeOptions },
    { name: 'plate_number', label: t('fleet.field.plate'), type: 'text', required: true, dir: 'ltr', placeholder: t('fleet.field.plate') },
    { name: 'name_ar', label: t('fleet.field.name'), type: 'text', colSpan: 2 },
    { name: 'model_year', label: t('fleet.field.model_year'), type: 'number', placeholder: new Date().getFullYear().toString() },
    { name: 'status', label: t('fleet.field.status'), type: 'select', options: statusOptions, defaultValue: 'ACTIVE' },
    { name: 'company_id', label: t('fleet.field.company'), type: 'select', options: companyOptions },
    { name: 'location', label: t('fleet.field.location'), type: 'select', options: locationOptions, hint: t('fleet.dialog.location_hint') },
    { name: 'project_id', label: t('fleet.field.project'), type: 'select', options: projectOptions, hint: t('fleet.dialog.project_hint') },
    { name: 'owner_name', label: t('fleet.field.owner'), type: 'text' },
    { name: 'registration_expiry', label: t('fleet.field.registration_expiry'), type: 'date' },
    { name: 'driver_name', label: t('fleet.field.driver'), type: 'text' },
  ]

  // جلولاء / خان ضاري are project sites — match the chosen location to its project
  // so a vehicle dropped there is linked even if the user leaves Project blank.
  const projectForLocation = (loc: string) =>
    loc ? projects.find((p) => p.name_ar.includes(loc))?.id ?? null : null

  const handleSubmit = async (values: Record<string, unknown>) => {
    const now = new Date().toISOString()
    const code = `VEH-${Date.now().toString(36).toUpperCase()}`
    const plate = (values.plate_number as string) || ''
    const location = ((values.location as string) || '').trim()
    const coords = locationCoords(location)
    const jitter = () => (Math.random() - 0.5) * 0.04 // spread pins so they don't overlap
    const project_id = ((values.project_id as string) || '') || projectForLocation(location)

    const payload: Partial<Vehicle> = {
      ...(values as Partial<Vehicle>),
      code,
      status: ((values.status as VehicleStatus) || 'ACTIVE'),
      model_year: values.model_year ? Number(values.model_year) : null,
      company_id: (values.company_id as string) || undefined,
      location: location || undefined,
      project_id,
      lat: coords ? coords.lat + jitter() : null,
      lng: coords ? coords.lng + jitter() : null,
      // bilingual name falls back to plate, then the generated code
      name_ar: (values.name_ar as string) || plate || code,
      name_en: (values.name_ar as string) || plate || code,
      created_at: now,
    }
    const created = (await apiPost('/vehicles', payload)) as Vehicle
    toast.success(t('fleet.vehicle.added'))
    onClose()
    // Hand the new vehicle back so the caller can open the full detail view
    // (all fields + document attachments + map location point).
    onCreated?.(created)
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
