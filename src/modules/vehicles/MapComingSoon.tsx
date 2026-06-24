import { Map as MapIcon, Clock3 } from 'lucide-react'
import { useT } from '../../context/LangContext'

// "قريباً / Coming soon" placeholder shown in place of the Fleet map while it is
// being finished. Mirrors the look of the shared LockedPage (same strings) but
// fits inside a tab / card. The real map code stays in place — flip
// FEATURES.fleetMap to show it.
export function MapComingSoon({ minHeight = 360 }: { minHeight?: number }) {
  const t = useT()
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center"
      style={{ minHeight }}
    >
      <div className="relative">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5 text-primary/40">
          <MapIcon className="h-10 w-10" />
        </span>
        <span className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-4 ring-white">
          <Clock3 className="h-4 w-4" />
        </span>
      </div>
      <div>
        <h3 className="text-2xl font-extrabold text-slate-700">{t('locked.title')}</h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">{t('locked.hint')}</p>
      </div>
    </div>
  )
}
