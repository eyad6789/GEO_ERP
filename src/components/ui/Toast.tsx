import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++counter
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
  }

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-danger" />,
    info: <Info className="h-5 w-5 text-info" />,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 start-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-white dark:bg-slate-800 px-4 py-3 shadow-lg animate-fade-in min-w-[260px]',
              t.kind === 'success' && 'border-emerald-200 dark:border-emerald-500/30',
              t.kind === 'error' && 'border-red-200 dark:border-red-500/30',
              t.kind === 'info' && 'border-slate-200 dark:border-slate-700',
            )}
          >
            {icons[t.kind]}
            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{t.message}</span>
            <button
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className="text-slate-300 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
