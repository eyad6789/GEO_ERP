import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { useT } from '../../context/LangContext'

export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title?: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
        {icon ?? <Inbox className="h-7 w-7" />}
      </span>
      <div>
        <p className="font-semibold text-slate-600">{title ?? t('common.empty')}</p>
        <p className="mt-1 text-sm text-slate-400">{hint ?? t('common.empty_hint')}</p>
      </div>
      {action}
    </div>
  )
}
