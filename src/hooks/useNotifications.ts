import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApi } from './useResource'
import { useCompany, DEFAULT_USER } from '../context/CompanyContext'
import { useT, useLang } from '../context/LangContext'
import { formatDate, formatNumber } from '../lib/format'
import type { LeaveRequest, Training } from '../types'

export type NotifTone = 'green' | 'red' | 'amber' | 'blue' | 'primary' | 'gray'
export type NotifIcon = 'check' | 'x' | 'bell' | 'clock' | 'graduation' | 'question' | 'truck' | 'calendar'

export interface Notif {
  id: string
  title: string
  subtitle?: string
  icon: NotifIcon
  tone: NotifTone
  date?: string // ISO, for sorting/display
}

interface LicenseAlert {
  id: string
  plate_number: string
  name_ar: string
  name_en: string
  days: number
  kind: 'expired' | 'soon'
}

/**
 * Per-user notifications for the header bell — keyed off the current "acting as"
 * user (not the cosmetic role). Employees get their own leave decisions,
 * summons/recalls, manager questions and assigned trainings; the default manager
 * gets pending-approval + fleet alerts. No notifications table exists, so items
 * are derived from live data and a per-user "seen" set is kept in localStorage.
 */
export function useNotifications() {
  const t = useT()
  const { lang } = useLang()
  const { currentUser, role } = useCompany()
  const isEmployee = currentUser.id !== DEFAULT_USER.id
  const isFleet = role.key === 'fleet_manager'

  const { data: myLeaves } = useApi<LeaveRequest[]>(
    isEmployee ? '/leave_requests' : null,
    isEmployee ? { employee_id: currentUser.id } : undefined,
  )
  const { data: myTrainings } = useApi<Training[]>(
    isEmployee ? '/trainings' : null,
    isEmployee ? { employee_id: currentUser.id } : undefined,
  )
  const { data: pendingLeaves } = useApi<LeaveRequest[]>(
    !isEmployee ? '/leave_requests' : null,
    !isEmployee ? { status: 'PENDING' } : undefined,
  )
  const { data: license } = useApi<{ alerts: LicenseAlert[]; count: number }>(
    isFleet ? '/fleet/license-alerts' : null,
  )

  const items: Notif[] = useMemo(() => {
    const out: Notif[] = []

    // ---- Employee's own notifications ----
    for (const l of myLeaves ?? []) {
      const period = l.hours_count
        ? `${formatNumber(l.hours_count, lang)} ${t('hr.leave.hours')}`
        : `${formatDate(l.start_date, lang)}`
      if (l.status === 'APPROVED') {
        out.push({ id: `lv-appr-${l.id}`, icon: 'check', tone: 'green', title: t('notif.leave_approved'), subtitle: l.decision_note || period, date: l.start_date })
      } else if (l.status === 'REJECTED') {
        out.push({ id: `lv-rej-${l.id}`, icon: 'x', tone: 'red', title: t('notif.leave_rejected'), subtitle: l.decision_note || period, date: l.start_date })
      }
      if (l.summoned_at) {
        out.push({ id: `lv-sum-${l.id}`, icon: 'bell', tone: 'amber', title: t('notif.summoned'), subtitle: period, date: l.summoned_at })
      }
      if (l.recalled_at) {
        out.push({ id: `lv-rec-${l.id}`, icon: 'calendar', tone: 'amber', title: t('notif.recalled'), subtitle: l.recall_note || period, date: l.recalled_at })
      }
      if (l.manager_question && !l.question_answer) {
        out.push({ id: `lv-q-${l.id}`, icon: 'question', tone: 'blue', title: t('notif.question'), subtitle: l.manager_question, date: l.start_date })
      }
    }
    for (const tr of myTrainings ?? []) {
      if (tr.status === 'PLANNED' || tr.status === 'IN_PROGRESS') {
        out.push({ id: `tr-${tr.id}`, icon: 'graduation', tone: 'primary', title: t('notif.training_assigned'), subtitle: tr.title, date: tr.date })
      }
    }

    // ---- Manager notifications ----
    const pend = pendingLeaves ?? []
    if (pend.length) {
      out.push({
        id: `pend-leaves-${pend.length}`,
        icon: 'calendar',
        tone: 'amber',
        title: t('notif.pending_leaves').replace('{n}', formatNumber(pend.length, lang)),
        subtitle: t('notif.pending_leaves_sub'),
      })
    }

    // ---- Fleet manager: vehicle license alerts ----
    for (const a of license?.alerts ?? []) {
      out.push({
        id: `veh-${a.id}-${a.kind}`,
        icon: 'truck',
        tone: a.kind === 'expired' ? 'red' : 'amber',
        title: `${lang === 'ar' ? a.name_ar : a.name_en || a.name_ar} · ${a.plate_number}`,
        subtitle: a.kind === 'expired' ? t('notif.veh_expired') : t('notif.veh_soon'),
      })
    }

    // newest first
    return out.sort((x, y) => (y.date || '').localeCompare(x.date || ''))
  }, [myLeaves, myTrainings, pendingLeaves, license, lang, t])

  // ---- Seen state, per user, persisted ----
  const storageKey = `geo-erp-notif-seen-${currentUser.id}`
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setSeen(new Set(raw ? (JSON.parse(raw) as string[]) : []))
    } catch {
      setSeen(new Set())
    }
  }, [storageKey])

  const unseenCount = useMemo(() => items.filter((i) => !seen.has(i.id)).length, [items, seen])

  const markAllSeen = useCallback(() => {
    const next = new Set(seen)
    for (const i of items) next.add(i.id)
    setSeen(next)
    try { localStorage.setItem(storageKey, JSON.stringify([...next])) } catch { /* ignore */ }
  }, [items, seen, storageKey])

  return { items, unseenCount, markAllSeen, isSeen: (id: string) => seen.has(id) }
}
