import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  /** true when the user has an explicit saved choice (not just following the OS). */
  isExplicit: boolean
  setTheme: (t: Theme) => void
  toggle: () => void
}

const STORAGE_KEY = 'geo-erp-theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

/** Applies/removes the `dark` class and native color-scheme on <html>. */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Follow the OS on first visit; an explicit toggle persists and wins thereafter.
  const [theme, setThemeState] = useState<Theme>(() => storedTheme() ?? systemTheme())
  const [isExplicit, setIsExplicit] = useState<boolean>(() => storedTheme() !== null)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // While the user hasn't chosen explicitly, track live OS preference changes.
  useEffect(() => {
    if (isExplicit) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setThemeState(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [isExplicit])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    setIsExplicit(true)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* ignore persistence failures (private mode, etc.) */
    }
  }, [])

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, isExplicit, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
