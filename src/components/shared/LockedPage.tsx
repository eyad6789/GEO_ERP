import { Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { NAV_ITEMS, LANDING_PATH } from '../../config/nav'
import { useT } from '../../context/LangContext'
import { Button } from '../ui/Button'

/** Shown in place of a gated module's content — a "coming soon" screen. */
export function LockedPage({ moduleKey }: { moduleKey: string }) {
  const t = useT()
  const navigate = useNavigate()
  const item = NAV_ITEMS.find((n) => n.key === moduleKey)
  const Icon = item?.icon ?? Clock3

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <div className="relative">
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/5 text-primary/40">
          <Icon className="h-12 w-12" />
        </span>
        <span className="absolute -bottom-1 -end-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-4 ring-slate-50">
          <Clock3 className="h-4 w-4" />
        </span>
      </div>

      <div>
        {item && <p className="mb-1 text-sm font-semibold text-slate-400">{t(item.labelKey)}</p>}
        <h2 className="text-3xl font-extrabold text-slate-700">{t('locked.title')}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{t('locked.hint')}</p>
      </div>

      <Button variant="primary" onClick={() => navigate(LANDING_PATH)}>
        {t('locked.cta')}
      </Button>
    </div>
  )
}
