import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { translate, type Lang } from '../i18n/strings'

interface LangContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (l: Lang) => void
  toggle: () => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar')
  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const toggle = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), [])
  const t = useCallback((key: string) => translate(key, lang), [lang])

  return (
    <LangContext.Provider value={{ lang, dir, setLang, toggle, t }}>{children}</LangContext.Provider>
  )
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}

/** Convenience hook returning just the translate function. */
export function useT(): (key: string) => string {
  return useLang().t
}
