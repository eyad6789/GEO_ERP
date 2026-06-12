import { Hammer } from 'lucide-react'

/** Temporary placeholder shown by foundation route stubs until a module is built. */
export function ModulePlaceholder({ name }: { name: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Hammer className="h-8 w-8" />
      </span>
      <h2 className="text-xl font-bold text-slate-700">{name}</h2>
      <p className="text-sm text-slate-400">قيد الإنشاء — Under construction</p>
    </div>
  )
}
