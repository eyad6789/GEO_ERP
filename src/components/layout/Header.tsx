import { useRef, useState } from 'react'
import { Bell, Languages, ChevronDown, Clock, Sun, Moon, Camera, CheckCircle2, XCircle, GraduationCap, HelpCircle, Truck, CalendarClock } from 'lucide-react'
import { CompanySelector } from './CompanySelector'
import { useLang, useT } from '../../context/LangContext'
import { useTheme } from '../../context/ThemeContext'
import { useCompany, ROLES, DEFAULT_USER } from '../../context/CompanyContext'
import { useApi, useResource } from '../../hooks/useResource'
import { useNotifications, type NotifIcon } from '../../hooks/useNotifications'
import { apiPost, apiDelete } from '../../lib/api'
import { Avatar } from '../ui/Avatar'
import { Popover } from '../ui/Popover'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/Toast'
import { formatDate } from '../../lib/format'
import type { Employee, EmployeeDoc } from '../../types'

const NOTIF_ICON: Record<NotifIcon, typeof Bell> = {
  check: CheckCircle2, x: XCircle, bell: Bell, clock: Clock,
  graduation: GraduationCap, question: HelpCircle, truck: Truck, calendar: CalendarClock,
}
const NOTIF_TONE: Record<string, string> = {
  green: 'text-emerald-500', red: 'text-red-500', amber: 'text-amber-500',
  blue: 'text-blue-500', primary: 'text-primary', gray: 'text-slate-400',
}

export function Header() {
  const t = useT()
  const { lang, toggle } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const { role, setRole, currentUser, setCurrentUser } = useCompany()

  // People you can "act as": the default manager + every employee.
  const { data: employees } = useResource<Employee>('employees')
  const people = [DEFAULT_USER, ...employees.map((e) => ({ id: e.id, name: lang === 'ar' ? e.full_name_ar : e.full_name_en || e.full_name_ar }))]

  // Current user's profile photo. Employees store it as a PHOTO document; the
  // default manager (no employee record) keeps it in the browser (localStorage).
  const toast = useToast()
  const isEmployeeUser = currentUser.id !== DEFAULT_USER.id
  const [photoReload, setPhotoReload] = useState(0)
  const { data: myDocs } = useApi<EmployeeDoc[]>(
    isEmployeeUser ? '/employee-documents' : null,
    isEmployeeUser ? { employee_id: currentUser.id, _r: photoReload } : undefined,
  )
  const photoDoc = (myDocs ?? []).find((d) => d.doc_type === 'PHOTO')
  const [localPhoto, setLocalPhoto] = useState<string | null>(() => {
    try { return localStorage.getItem(`geo-erp-photo-${currentUser.id}`) } catch { return null }
  })
  const myPhotoUrl = isEmployeeUser
    ? (photoDoc ? `/api/employee-documents/${photoDoc.id}/file` : undefined)
    : (localPhoto ?? undefined)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const uploadMyPhoto = async (file: File) => {
    setPhotoBusy(true)
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result as string)
        r.onerror = rej
        r.readAsDataURL(file)
      })
      if (isEmployeeUser) {
        await apiPost('/employee-documents', {
          employee_id: currentUser.id,
          doc_type: 'PHOTO',
          title: t('hr.doc.PHOTO'),
          file_name: file.name,
          mime: file.type || 'image/jpeg',
          data: (dataUrl.split(',')[1] ?? ''),
        })
        // Drop the previous photo so only the newest remains.
        if (photoDoc) await apiDelete(`/employee-documents/${photoDoc.id}`).catch(() => undefined)
        setPhotoReload((n) => n + 1)
      } else {
        try { localStorage.setItem(`geo-erp-photo-${currentUser.id}`, dataUrl) } catch { /* ignore */ }
        setLocalPhoto(dataUrl)
      }
      toast.success(t('header.photo.saved'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setPhotoBusy(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  // Per-user notifications (keyed off the current "acting as" user).
  const { items: notifs, unseenCount, markAllSeen } = useNotifications()

  return (
    <>
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-4 backdrop-blur sm:px-6">

      <div className="flex flex-1 items-center justify-end gap-2">
        <CompanySelector />

        {/* Theme (light/dark) toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title={t(theme === 'dark' ? 'header.theme.light' : 'header.theme.dark')}
          aria-label={t(theme === 'dark' ? 'header.theme.light' : 'header.theme.dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Language toggle */}
        <button
          onClick={toggle}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          title="AR / EN"
        >
          <Languages className="h-4 w-4" />
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>

        {/* Notifications — vehicle license / registration expiry */}
        <Popover
          width="w-[22rem]"
          align="end"
          trigger={({ toggle: tg, open }) => (
            <button
              onClick={() => { if (!open) markAllSeen(); tg() }}
              title={t('header.notif.title')}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Bell className="h-4 w-4" />
              {unseenCount > 0 && (
                <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
                  {unseenCount > 99 ? '99+' : unseenCount}
                </span>
              )}
            </button>
          )}
        >
          {() => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Bell className="h-4 w-4 text-primary" />
                  {t('header.notif.title')}
                </span>
                {notifs.length > 0 && <Badge color="gray">{notifs.length}</Badge>}
              </div>

              {notifs.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-400">{t('header.notif.empty')}</p>
              ) : (
                <div className="-mx-1 max-h-[22rem] space-y-1 overflow-y-auto px-1">
                  {notifs.map((n) => {
                    const Icon = NOTIF_ICON[n.icon]
                    return (
                      <div key={n.id} className="flex items-start gap-2.5 rounded-lg border border-slate-100 dark:border-slate-700/70 p-2.5">
                        <Icon className={'mt-0.5 h-4 w-4 shrink-0 ' + (NOTIF_TONE[n.tone] ?? 'text-slate-400')} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.title}</p>
                          {n.subtitle && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{n.subtitle}</p>}
                          {n.date && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-400">{formatDate(n.date, lang)}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Popover>

        {/* User / person switcher + role menu */}
        <Popover
          width="w-64"
          trigger={({ toggle: tg }) => (
            <button onClick={tg} className="flex items-center gap-2 rounded-lg p-1 pe-2 transition hover:bg-slate-50 dark:hover:bg-slate-800">
              <Avatar name={currentUser.name} src={myPhotoUrl} color="#1a5f7a" size="sm" />
              <div className="hidden text-start sm:block">
                <p className="max-w-[9rem] truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400">{lang === 'ar' ? role.label_ar : role.label_en}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-400" />
            </button>
          )}
        >
          {(close) => (
            <div className="space-y-2">
              {/* Current user + change profile photo */}
              <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
                <Avatar name={currentUser.name} src={myPhotoUrl} color="#1a5f7a" size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{currentUser.name}</p>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy}
                    className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary transition hover:underline disabled:opacity-50"
                  >
                    <Camera className="h-3 w-3" />
                    {myPhotoUrl ? t('header.photo.change') : t('header.photo.add')}
                  </button>
                </div>
              </div>

              {/* Acting-as person switcher */}
              <div>
                <p className="px-2 py-1 text-xs font-semibold text-slate-400 dark:text-slate-400">{t('header.acting_as')}</p>
                <div className="-mx-1 max-h-56 space-y-0.5 overflow-y-auto px-1">
                  {people.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setCurrentUser(p); close() }}
                      className={
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ' +
                        (p.id === currentUser.id ? 'text-primary font-semibold' : 'text-slate-600 dark:text-slate-300')
                      }
                    >
                      <Avatar name={p.name} size="sm" />
                      <span className="flex-1 truncate text-start">{p.name}</span>
                      {p.id === currentUser.id && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role (cosmetic) */}
              <div className="border-t border-slate-100 dark:border-slate-700/70 pt-1.5">
                <p className="px-2 py-1 text-xs font-semibold text-slate-400 dark:text-slate-400">{t('header.role')}</p>
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => { setRole(r); close() }}
                    className={
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ' +
                      (r.key === role.key ? 'text-primary font-semibold' : 'text-slate-600 dark:text-slate-300')
                    }
                  >
                    {lang === 'ar' ? r.label_ar : r.label_en}
                    {r.key === role.key && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>
      </div>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMyPhoto(f) }}
      />
    </header>
    </>
  )
}
