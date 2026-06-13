import { CalendarDays, Sparkles } from 'lucide-react'
import { useT, useLang } from '../../context/LangContext'
import { formatDate } from '../../lib/format'

/**
 * Welcoming hero banner on a subtle brand gradient.
 * Greeting + today's date (constructed live from the browser Date API).
 */
export function HeroHeader() {
  const t = useT()
  const { lang } = useLang()
  const todayIso = new Date().toISOString()

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-l from-primary-dark via-primary to-primary-light p-6 text-white shadow-card sm:p-8">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -top-16 -start-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -end-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-white/30">
            <img src="/qeg-logo.png" alt={t('app.title')} className="h-full w-full object-contain" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{t('dashboard.greeting')}</h1>
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-1 text-base font-bold text-white">{t('app.title')}</p>
            <p className="text-xs text-white/80">{t('dashboard.hero_subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 ring-1 ring-white/15 backdrop-blur">
          <CalendarDays className="h-4 w-4 text-accent" />
          <span className="tabular-nums">{formatDate(todayIso, lang)}</span>
        </div>
      </div>
    </div>
  )
}
