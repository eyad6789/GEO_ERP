import type { ReactNode } from 'react'
import {
  Hash,
  Receipt,
  MapPin,
  Building,
  Phone,
  Mail,
  Globe,
  CalendarDays,
  Coins,
  Network,
  Tag,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { formatDate, CURRENCY_LABEL } from '../../lib/format'
import type { Company } from '../../types'

interface InfoRow {
  icon: ReactNode
  label: string
  value: ReactNode
}

function InfoGrid({ rows }: { rows: InfoRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {r.icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-400">{r.label}</p>
            <p className="mt-0.5 break-words font-medium text-slate-700 dark:text-slate-200">{r.value || '—'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InfoTab({ company }: { company: Company }) {
  const t = useT()
  const { lang } = useLang()

  const curLabel = (c: string | null | undefined) =>
    c ? `${CURRENCY_LABEL[c as keyof typeof CURRENCY_LABEL]?.[lang] ?? c} (${c})` : '—'

  const identity: InfoRow[] = [
    { icon: <Tag className="h-4 w-4" />, label: t('common.code'), value: <span className="font-mono">{company.code}</span> },
    {
      icon: <Network className="h-4 w-4" />,
      label: t('companies.info.type'),
      value: company.type === 'PARENT' ? t('companies.parent') : t('companies.subsidiary'),
    },
    { icon: <Hash className="h-4 w-4" />, label: t('companies.info.registration'), value: company.registration_number },
    { icon: <Receipt className="h-4 w-4" />, label: t('companies.info.tax'), value: company.tax_number },
    { icon: <CalendarDays className="h-4 w-4" />, label: t('companies.info.established'), value: formatDate(company.established_date, lang) },
  ]

  const contact: InfoRow[] = [
    { icon: <MapPin className="h-4 w-4" />, label: t('companies.info.address'), value: company.address },
    { icon: <Building className="h-4 w-4" />, label: t('companies.info.city'), value: `${company.city}، ${company.country}` },
    { icon: <Phone className="h-4 w-4" />, label: t('companies.info.phone'), value: <span dir="ltr" className="inline-block">{company.phone}</span> },
    {
      icon: <Mail className="h-4 w-4" />,
      label: t('companies.info.email'),
      value: company.email ? (
        <a href={`mailto:${company.email}`} dir="ltr" className="inline-block text-primary hover:underline">
          {company.email}
        </a>
      ) : (
        '—'
      ),
    },
    {
      icon: <Globe className="h-4 w-4" />,
      label: t('companies.info.website'),
      value: company.website ? (
        <a
          href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
          target="_blank"
          rel="noreferrer"
          dir="ltr"
          className="inline-block text-primary hover:underline"
        >
          {company.website}
        </a>
      ) : (
        '—'
      ),
    },
  ]

  const financial: InfoRow[] = [
    { icon: <Coins className="h-4 w-4" />, label: t('companies.info.currency_primary'), value: curLabel(company.currency_primary) },
    { icon: <Coins className="h-4 w-4" />, label: t('companies.info.currency_secondary'), value: curLabel(company.currency_secondary) },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: t('common.status'),
      value: company.status === 'ACTIVE' ? t('status.ACTIVE') : t('status.INACTIVE'),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title={t('companies.info.identity')} icon={<ShieldCheck className="h-4 w-4" />} />
        <CardBody>
          <InfoGrid rows={identity} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t('companies.info.contact')} icon={<MapPin className="h-4 w-4" />} />
        <CardBody>
          <InfoGrid rows={contact} />
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title={t('companies.info.financial')} icon={<Coins className="h-4 w-4" />} />
        <CardBody>
          <InfoGrid rows={financial} />
        </CardBody>
      </Card>
    </div>
  )
}
