import { useEffect, useState } from 'react'
import { Users, LogOut } from 'lucide-react'
import { Avatar, useToast } from '../../components/ui'
import { useT, useLang } from '../../context/LangContext'
import { ROLES } from '../../context/CompanyContext'
import { Panel, DTable, DTh, DTd } from './ui'
import { durationSince, seedUsers, type ActiveUser } from './lib'

export function UsersPanel() {
  const t = useT()
  const { lang } = useLang()
  const { success } = useToast()
  const [users, setUsers] = useState<ActiveUser[]>(() => seedUsers())
  const [, setTick] = useState(0)

  // tick once per second so durations stay live
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const roleLabel = (key: string) => {
    const r = ROLES.find((x) => x.key === key)
    return r ? (lang === 'ar' ? r.label_ar : r.label_en) : key
  }

  const terminate = (u: ActiveUser) => {
    setUsers((list) => list.filter((x) => x.id !== u.id))
    success(`${t('debug.users.terminated')} ${u.name}`)
  }

  return (
    <Panel
      title={t('debug.users.title')}
      subtitle={`${users.length} ${lang === 'ar' ? 'جلسة نشطة' : 'live sessions'}`}
      icon={<Users className="h-4 w-4" />}
    >
      <DTable
        head={
          <>
            <DTh>{t('debug.users.user')}</DTh>
            <DTh className="w-40">{t('debug.users.role')}</DTh>
            <DTh>{t('debug.users.page')}</DTh>
            <DTh className="w-32">{t('debug.users.duration')}</DTh>
            <DTh className="w-32">{t('debug.users.ip')}</DTh>
            <DTh className="w-28 text-end" />
          </>
        }
      >
        {users.map((u) => (
          <tr key={u.id} className="transition hover:bg-white/[0.02]">
            <DTd>
              <span className="flex items-center gap-2.5">
                <Avatar name={u.name} size="sm" />
                <span className="font-medium text-slate-100">{u.name}</span>
              </span>
            </DTd>
            <DTd>
              <span className="rounded-full bg-debug-bg px-2 py-0.5 text-xs text-slate-300 ring-1 ring-inset ring-debug-line">
                {roleLabel(u.role)}
              </span>
            </DTd>
            <DTd>
              <code className="font-mono text-xs text-sky-300" dir="ltr">{u.page}</code>
            </DTd>
            <DTd>
              <span className="font-mono tabular-nums text-emerald-300">{durationSince(u.startedAt, lang)}</span>
            </DTd>
            <DTd>
              <code className="font-mono text-xs text-slate-400" dir="ltr">{u.ip}</code>
            </DTd>
            <DTd className="text-end">
              <button
                onClick={() => terminate(u)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 px-2 py-1 text-xs text-red-300 transition hover:bg-red-400/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('debug.users.terminate')}
              </button>
            </DTd>
          </tr>
        ))}
        {users.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-10 text-center text-slate-500">—</td>
          </tr>
        )}
      </DTable>
    </Panel>
  )
}
