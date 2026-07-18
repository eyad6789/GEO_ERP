import type { FormFieldConfig } from '@/components/shared'

// Editable fields for an existing employee — identity, contact/address,
// employment and financial. Company/department are set at creation (a transfer),
// so they are intentionally not edited here. Shared by the profile-page edit
// (EmployeeDetail) and the card-list quick edit (EmployeeCards).
export function EDIT_FIELDS(t: (k: string) => string): FormFieldConfig[] {
  const sel = (name: string, label: string, values: string[], prefix: string): FormFieldConfig => ({
    name,
    label,
    type: 'select',
    options: values.map((v) => ({ value: v, label: t(`${prefix}${v}`) })),
  })
  return [
    { name: 'full_name_ar', label: t('hr.emp.full_name_ar'), required: true, dir: 'rtl' },
    { name: 'full_name_en', label: t('hr.emp.full_name_en'), dir: 'ltr' },
    { name: 'national_id', label: t('hr.f.national_id'), dir: 'ltr' },
    { name: 'dob', label: t('hr.f.dob'), type: 'date' },
    { name: 'place_of_birth', label: t('hr.f.place_of_birth') },
    { name: 'nationality', label: t('hr.f.nationality') },
    sel('gender', t('hr.f.gender'), ['MALE', 'FEMALE'], 'hr.gender.'),
    { name: 'marital_status', label: t('hr.f.marital_status') },
    { name: 'phone_primary', label: t('hr.f.phone_primary'), dir: 'ltr' },
    { name: 'phone_secondary', label: t('hr.f.phone_secondary'), dir: 'ltr' },
    { name: 'email_work', label: t('hr.f.email_work'), type: 'email', dir: 'ltr' },
    { name: 'email_personal', label: t('hr.f.email_personal'), type: 'email', dir: 'ltr' },
    { name: 'address', label: t('hr.f.address'), colSpan: 2 },
    { name: 'emergency_name', label: t('hr.f.emergency_name') },
    { name: 'emergency_phone', label: t('hr.f.emergency_phone'), dir: 'ltr' },
    { name: 'job_title', label: t('hr.f.job_title') },
    sel('employment_type', t('hr.f.employment_type'), ['FULL', 'PART', 'CONTRACT', 'TEMP'], 'hr.etype.'),
    sel('status', t('hr.f.status'), ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'], 'status.'),
    { name: 'hire_date', label: t('hr.f.hire_date'), type: 'date' },
    { name: 'basic_salary', label: t('hr.f.basic_salary'), type: 'number' },
    { name: 'bank_name', label: t('hr.f.bank_name') },
    { name: 'bank_account', label: t('hr.f.bank_account'), dir: 'ltr' },
    { name: 'iban', label: t('hr.f.iban'), dir: 'ltr' },
  ]
}
