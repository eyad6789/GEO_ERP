import { Building2 } from 'lucide-react'
import { useResource } from '../../hooks/useResource'
import { useCompany } from '../../context/CompanyContext'
import { useLang, useT } from '../../context/LangContext'
import { Select } from '../ui/Select'
import { pickName } from '../../lib/format'
import type { Company } from '../../types'

export function CompanySelector() {
  const t = useT()
  const { lang } = useLang()
  const { companyId, setCompanyId } = useCompany()
  const { data: companies } = useResource<Company>('companies')

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-slate-400" />
      <Select
        value={companyId ?? ''}
        onChange={(e) => setCompanyId(e.target.value || null)}
        className="h-9 min-w-[180px] text-sm"
      >
        <option value="">{t('header.company_all')}</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {pickName(c, lang)}
          </option>
        ))}
      </Select>
    </div>
  )
}
