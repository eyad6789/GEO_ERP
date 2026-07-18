import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronDown,
  ChevronLeft,
  FolderTree,
  Dot,
  ListTree,
  ChevronsLeft,
  Plus,
  Trash2,
  FolderPlus,
  AlertTriangle,
  Pencil,
  Hash,
  Check,
  X,
} from 'lucide-react'
import { Card, CardHeader, Badge, Button, Input, Field, Dialog, useToast } from '../../components/ui'
import { KpiCard, EmptyState } from '../../components/shared'
import { useApi, useResource } from '../../hooks/useResource'
import { useLang, useT } from '../../context/LangContext'
import { useCompany } from '../../context/CompanyContext'
import { apiGet, apiPut } from '../../lib/api'
import { pickName, formatCurrency } from '../../lib/format'
import type { Account, AccountType } from '../../types'
import { ACCOUNT_TYPE_COLOR, ACCOUNT_TYPE_DOT, canEditAccounting, type TrialBalanceResp } from './shared'
import { NewAccountDialog } from './NewAccountDialog'

interface AccountNode extends Account {
  children: AccountNode[]
}

function buildTree(accounts: Account[]): AccountNode[] {
  const map = new Map<string, AccountNode>()
  for (const a of accounts) map.set(a.code, { ...a, children: [] })
  const roots: AccountNode[] = []
  for (const node of map.values()) {
    if (node.parent_code && map.has(node.parent_code)) {
      map.get(node.parent_code)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (nodes: AccountNode[]) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code))
    nodes.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

function collectCodes(nodes: AccountNode[], acc: Set<string>) {
  for (const n of nodes) {
    if (n.children.length) acc.add(n.code)
    collectCodes(n.children, acc)
  }
}

interface DeleteState {
  node: AccountNode
  blocked: boolean
  hasFile: boolean
  fileCount: number
}

export function ChartTab() {
  const t = useT()
  const { lang } = useLang()
  const { role, companyId } = useCompany()
  const canEdit = canEditAccounting(role.key)
  const toast = useToast()
  const { data, loading, refetch, create, update, remove } = useResource<Account>('accounts')
  const { data: trial } = useApi<TrialBalanceResp>(
    '/reports/trial-balance',
    companyId ? { company_id: companyId } : undefined,
  )
  // The chart tree is the single source of truth: every balance comes straight
  // from real journal postings (the trial balance). No display overlays — money
  // shows up here only once it is posted as a real journal entry, and the tree
  // then feeds every other page. (Vehicle spend lives on its expense accounts;
  // the per-car view is in the الآليات tab.)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addParent, setAddParent] = useState<string | undefined>(undefined)
  const [del, setDel] = useState<DeleteState | null>(null)
  const [recodeNode, setRecodeNode] = useState<AccountNode | null>(null)

  const tree = useMemo(() => buildTree(data), [data])
  const allParents = useMemo(() => {
    const s = new Set<string>()
    collectCodes(tree, s)
    return s
  }, [tree])

  // Roll-up balances: a node's balance = its own posting balance + the sum of
  // all descendants. IQD figures convert USD lines via their rate; the USD
  // figure keeps raw USD. So any change in a leaf propagates up to its parents.
  const rolled = useMemo(() => {
    const ownIqd = new Map<string, number>()
    const ownUsd = new Map<string, number>()
    for (const r of trial?.rows ?? []) {
      ownIqd.set(r.code, r.balance_iqd ?? r.balance)
      ownUsd.set(r.code, r.balance_usd ?? 0)
    }
    const iqd = new Map<string, number>()
    const usd = new Map<string, number>()
    const calc = (node: AccountNode): { i: number; u: number } => {
      let i = node.is_posting === 1 ? ownIqd.get(node.code) ?? 0 : 0
      let u = node.is_posting === 1 ? ownUsd.get(node.code) ?? 0 : 0
      for (const c of node.children) {
        const r = calc(c)
        i += r.i
        u += r.u
      }
      iqd.set(node.code, i)
      usd.set(node.code, u)
      return { i, u }
    }
    tree.forEach(calc)
    return { iqd, usd }
  }, [tree, trial])

  const postingCount = data.filter((a) => a.is_posting === 1).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tree
    const filterRec = (nodes: AccountNode[]): AccountNode[] => {
      const out: AccountNode[] = []
      for (const n of nodes) {
        const kids = filterRec(n.children)
        const self =
          n.code.toLowerCase().includes(q) ||
          n.name_ar.toLowerCase().includes(q) ||
          (n.name_en || '').toLowerCase().includes(q)
        if (self || kids.length) out.push({ ...n, children: kids })
      }
      return out
    }
    return filterRec(tree)
  }, [tree, query])

  const searching = query.trim().length > 0

  const toggle = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })

  const openAdd = (parent?: string) => {
    setAddParent(parent)
    setAddOpen(true)
  }

  // Inline rename of an account (the current language's name).
  const onRename = async (code: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const patch = lang === 'en' ? { name_en: trimmed } : { name_ar: trimmed }
    try {
      await update(code, patch)
      refetch()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    }
  }

  // Change an account's CODE (its number). The backend cascades the new code to
  // child accounts, journal lines and linked bank/vehicle accounts, so a mis-
  // typed number can be corrected without losing history.
  const doRecode = async (oldCode: string, newCode: string) => {
    const next = newCode.trim()
    if (!next || next === oldCode) return setRecodeNode(null)
    if (data.some((a) => a.code === next)) return toast.error(t('accounting.recode.err_dup'))
    try {
      await apiPut(`/accounts/${encodeURIComponent(oldCode)}/recode`, { new_code: next })
      toast.success(t('accounting.recode.done'))
      setRecodeNode(null)
      refetch()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    }
  }

  // Drag & drop reordering. The drop position decides the move:
  //   'inside'        → nest the dragged account INSIDE the target (as a child)
  //   'before'/'after'→ place it as a sibling before/after the target (this is
  //                     also how you pull an item OUT of a subtree — drop it
  //                     before/after a higher-level node).
  const onReorder = async (dragCode: string, targetCode: string, pos: 'before' | 'inside' | 'after') => {
    if (!canEdit || dragCode === targetCode) return
    const drag = data.find((a) => a.code === dragCode)
    const target = data.find((a) => a.code === targetCode)
    if (!drag || !target) return

    // Block dropping onto own descendant (would create a cycle).
    const descendants = new Set<string>()
    const collect = (code: string) => {
      for (const a of data) if (a.parent_code === code) { descendants.add(a.code); collect(a.code) }
    }
    collect(dragCode)
    if (descendants.has(targetCode)) return

    let newParent: string | null
    let newOrder: number

    if (pos === 'inside') {
      newParent = targetCode
      const kids = data
        .filter((a) => a.parent_code === targetCode && a.code !== dragCode)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      newOrder = kids.length ? (kids[kids.length - 1].sort_order ?? 0) + 1 : 0
    } else {
      newParent = target.parent_code ?? null
      const siblings = data
        .filter((a) => a.parent_code === newParent && a.code !== dragCode)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code))
      const ti = siblings.findIndex((s) => s.code === targetCode)
      if (pos === 'before') {
        const prev = siblings[ti - 1]
        newOrder = prev ? ((prev.sort_order ?? 0) + (target.sort_order ?? 0)) / 2 : (target.sort_order ?? 0) - 1
      } else {
        const next = siblings[ti + 1]
        newOrder = next ? ((target.sort_order ?? 0) + (next.sort_order ?? 0)) / 2 : (target.sort_order ?? 0) + 1
      }
    }

    const oldParent = drag.parent_code ?? null
    try {
      await update(dragCode, { parent_code: newParent, sort_order: newOrder })
      // The new parent now has children → header; an emptied old parent → leaf.
      const np = newParent ? data.find((a) => a.code === newParent) : undefined
      if (np && np.is_posting === 1) await update(np.code, { is_posting: 0 })
      if (oldParent && oldParent !== newParent) {
        const stillHasKids = data.some((a) => a.parent_code === oldParent && a.code !== dragCode)
        const op = data.find((a) => a.code === oldParent)
        if (op && !stillHasKids && op.is_posting === 0) await update(op.code, { is_posting: 1 })
      }
      refetch()
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    }
  }

  // Removal: block if it has sub-accounts; otherwise check for linked records.
  const requestDelete = async (node: AccountNode) => {
    if (node.children.length > 0) {
      setDel({ node, blocked: true, hasFile: false, fileCount: 0 })
      return
    }
    let fileCount = 0
    try {
      const lines = await apiGet<unknown[]>('/journal_lines', { account_code: node.code, limit: 1000 })
      fileCount = Array.isArray(lines) ? lines.length : 0
    } catch {
      /* ignore */
    }
    setDel({ node, blocked: false, hasFile: fileCount > 0, fileCount })
  }

  const doDelete = async () => {
    if (!del || del.blocked) return
    try {
      await remove(del.node.code) // soft-delete on the backend (archived = 1)
      toast.success(t('accounting.del.done'))
      setDel(null)
    } catch (e) {
      toast.error((e as Error)?.message || t('common.error'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t('accounting.chart.title')} value={`${data.length} ${t('accounting.chart.count')}`} icon={<ListTree className="h-5 w-5" />} accent="primary" />
        <KpiCard label={t('accounting.chart.posting')} value={`${postingCount} ${t('accounting.chart.posting_count')}`} accent="success" />
        <KpiCard label={t('accounting.chart.parent')} value={allParents.size} accent="info" />
      </div>

      <Card>
        <CardHeader
          title={t('accounting.chart.title')}
          subtitle={t('accounting.chart.subtitle')}
          icon={<FolderTree className="h-5 w-5" />}
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpanded(new Set(allParents))}>
                {t('accounting.chart.expand_all')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())}>
                {t('accounting.chart.collapse_all')}
              </Button>
              {canEdit && (
                <Button variant="primary" size="sm" onClick={() => openAdd(undefined)}>
                  <Plus className="h-4 w-4" />
                  {t('accounting.add.button')}
                </Button>
              )}
            </div>
          }
        />
        <div className="border-b border-slate-100 p-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common.search')} className="max-w-sm" />
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title={t('common.empty')} hint={t('common.empty_hint')} />
        ) : (
          <div className="py-1">
            {/* Column captions for the balances */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span className="w-4 shrink-0" />
              <span className="w-20 shrink-0">{t('accounting.chart.code')}</span>
              <span className="flex-1">{t('accounting.chart.name')}</span>
              <span className="w-36 shrink-0 text-end">{t('accounting.bank.balance_iqd')}</span>
              <span className="w-28 shrink-0 text-end">{t('accounting.bank.balance_usd')}</span>
              {canEdit && <span className="w-16 shrink-0" />}
            </div>
            <div className="divide-y divide-slate-50">
            {filtered.map((node) => (
              <AccountRow
                key={node.code}
                node={node}
                depth={0}
                expanded={expanded}
                forceOpen={searching}
                onToggle={toggle}
                lang={lang}
                t={t}
                canEdit={canEdit}
                rolled={rolled}
                onAddChild={openAdd}
                onDelete={requestDelete}
                onReorder={onReorder}
                onRename={onRename}
                onEditCode={setRecodeNode}
              />
            ))}
            </div>
          </div>
        )}
      </Card>

      {canEdit && (
        <NewAccountDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          accounts={data}
          create={create}
          update={update}
          onCreated={refetch}
          presetParent={addParent}
        />
      )}

      {/* Delete / archive confirmation */}
      <Dialog
        open={!!del}
        onClose={() => setDel(null)}
        title={del?.blocked ? t('accounting.del.blocked_title') : t('accounting.del.title')}
        footer={
          del?.blocked ? (
            <Button variant="outline" onClick={() => setDel(null)}>
              {t('common.close')}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDel(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={doDelete}>
                <Trash2 className="h-4 w-4" />
                {t('accounting.del.action')}
              </Button>
            </>
          )
        }
      >
        {del && (
          <div className="space-y-3">
            <p className="font-semibold text-slate-700">
              <span className="font-mono text-slate-500">{del.node.code}</span> — {pickName(del.node, lang)}
            </p>
            {del.blocked ? (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                <p className="text-sm text-red-700">{t('accounting.del.blocked')}</p>
              </div>
            ) : (
              <>
                {del.hasFile ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="flex items-center gap-2 font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      {t('accounting.del.warn_title')}
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      {t('accounting.del.warn_file')} <span className="font-bold tabular-nums">{del.fileCount}</span>{' '}
                      {t('accounting.del.movements')}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">{t('accounting.del.confirm_empty')}</p>
                )}
                <p className="rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-500">{t('accounting.del.soft')}</p>
              </>
            )}
          </div>
        )}
      </Dialog>

      {canEdit && (
        <RecodeDialog
          node={recodeNode}
          onClose={() => setRecodeNode(null)}
          onSubmit={(next) => recodeNode && doRecode(recodeNode.code, next)}
        />
      )}
    </div>
  )
}

// Change an account's number. The new code cascades to every reference on the
// backend (child accounts, journal lines, linked bank & vehicle accounts).
function RecodeDialog({
  node,
  onClose,
  onSubmit,
}: {
  node: AccountNode | null
  onClose: () => void
  onSubmit: (newCode: string) => void
}) {
  const t = useT()
  const { lang } = useLang()
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (node) setDraft(node.code)
  }, [node])

  return (
    <Dialog
      open={!!node}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          {t('accounting.recode.title')}
        </span>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => onSubmit(draft)} disabled={!draft.trim() || draft.trim() === node?.code}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      {node && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            <span className="font-mono font-semibold text-slate-500">{node.code}</span> — {pickName(node, lang)}
          </p>
          <Field label={t('accounting.recode.new_code')} required>
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draft.trim() && draft.trim() !== node.code) onSubmit(draft)
              }}
              className="font-mono"
              dir="ltr"
            />
          </Field>
          <p className="rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-700">{t('accounting.recode.warn')}</p>
        </div>
      )}
    </Dialog>
  )
}

function AccountRow({
  node,
  depth,
  expanded,
  forceOpen,
  onToggle,
  lang,
  t,
  canEdit,
  rolled,
  onAddChild,
  onDelete,
  onReorder,
  onRename,
  onEditCode,
}: {
  node: AccountNode
  depth: number
  expanded: Set<string>
  forceOpen: boolean
  onToggle: (code: string) => void
  lang: 'ar' | 'en'
  t: (k: string) => string
  canEdit: boolean
  rolled: { iqd: Map<string, number>; usd: Map<string, number> }
  onAddChild: (parent: string) => void
  onDelete: (node: AccountNode) => void
  onReorder: (dragCode: string, targetCode: string, pos: 'before' | 'inside' | 'after') => void
  onRename: (code: string, name: string) => void
  onEditCode: (node: AccountNode) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen = forceOpen || expanded.has(node.code)
  const type = node.type as AccountType
  const navigate = useNavigate()
  const [dropPos, setDropPos] = useState<'before' | 'inside' | 'after' | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(pickName(node, lang))
    setEditing(true)
  }
  const commitEdit = () => {
    if (draft.trim() && draft.trim() !== pickName(node, lang)) onRename(node.code, draft)
    setEditing(false)
  }

  const dropClass =
    dropPos === 'inside'
      ? 'bg-primary/10 ring-1 ring-inset ring-primary'
      : dropPos === 'before'
        ? 'border-t-2 border-primary'
        : dropPos === 'after'
          ? 'border-b-2 border-primary'
          : ''

  return (
    <div>
      <div
        className={'group flex cursor-pointer items-center gap-2 px-3 py-2 transition hover:bg-primary/5 ' + dropClass}
        style={{ paddingInlineStart: 12 + depth * 22 }}
        draggable={canEdit && !editing}
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.setData('text/plain', node.code)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          if (!canEdit) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          const rect = e.currentTarget.getBoundingClientRect()
          const y = e.clientY - rect.top
          setDropPos(y < rect.height * 0.3 ? 'before' : y > rect.height * 0.7 ? 'after' : 'inside')
        }}
        onDragLeave={() => setDropPos(null)}
        onDrop={(e) => {
          e.preventDefault()
          const pos = dropPos ?? 'inside'
          setDropPos(null)
          const dragCode = e.dataTransfer.getData('text/plain')
          if (dragCode) onReorder(dragCode, node.code, pos)
        }}
        onClick={() => (hasChildren ? onToggle(node.code) : navigate(`/accounting/accounts/${node.code}`))}
        title={hasChildren ? (isOpen ? t('accounting.chart.collapse_all') : t('accounting.account.open')) : t('accounting.account.open')}
      >
        {hasChildren ? (
          <span className="text-slate-400 group-hover:text-primary">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 rtl:rotate-180" />}
          </span>
        ) : (
          <span className={'mx-1 h-1.5 w-1.5 rounded-full ' + ACCOUNT_TYPE_DOT[type]} />
        )}

        <span className="w-20 shrink-0 font-mono text-xs font-semibold text-slate-500">{node.code}</span>
        {editing ? (
          <span className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitEdit()
                } else if (e.key === 'Escape') {
                  setEditing(false)
                }
              }}
              onBlur={commitEdit}
              className="h-8 py-1"
            />
            <button type="button" title={t('common.save')} onMouseDown={(e) => e.preventDefault()} onClick={commitEdit} className="rounded p-1 text-emerald-600 hover:bg-emerald-50">
              <Check className="h-4 w-4" />
            </button>
            <button type="button" title={t('common.cancel')} onMouseDown={(e) => e.preventDefault()} onClick={() => setEditing(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </span>
        ) : (
          <Link
            to={`/accounting/accounts/${node.code}`}
            onClick={(e) => e.stopPropagation()}
            title={t('accounting.account.open')}
            className={
              'flex-1 truncate hover:text-primary hover:underline ' +
              (depth === 0 ? 'font-bold text-slate-800' : node.is_posting ? 'text-slate-600' : 'font-medium text-slate-700')
            }
          >
            {pickName(node, lang)}
          </Link>
        )}

        {depth === 0 && <Badge color={ACCOUNT_TYPE_COLOR[type]}>{t(`accounting.type.${type}`)}</Badge>}
        {node.is_posting === 1 && (
          <span className="hidden items-center gap-1 text-xs text-emerald-600 sm:inline-flex">
            <Dot className="h-4 w-4" />
            {t('accounting.chart.posting')}
          </span>
        )}

        {/* Rolled-up balance (parents = sum of their leaves) — IQD then USD */}
        <span className={'w-36 shrink-0 text-end tabular-nums ' + (hasChildren || depth === 0 ? 'font-bold text-slate-800' : 'text-slate-600')}>
          {formatCurrency(rolled.iqd.get(node.code) ?? 0, 'IQD', lang)}
        </span>
        <span className={'w-28 shrink-0 text-end tabular-nums ' + (hasChildren || depth === 0 ? 'font-bold text-emerald-700' : 'text-emerald-600')}>
          {formatCurrency(rolled.usd.get(node.code) ?? 0, 'USD', lang)}
        </span>

        {canEdit && !editing ? (
          <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              title={t('accounting.chart.rename')}
              onClick={(e) => {
                e.stopPropagation()
                startEdit()
              }}
              className="rounded p-1 text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={t('accounting.recode.tooltip')}
              onClick={(e) => {
                e.stopPropagation()
                onEditCode(node)
              }}
              className="rounded p-1 text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            >
              <Hash className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={t('accounting.add.child_tooltip')}
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(node.code)
              }}
              className="rounded p-1 text-slate-400 transition hover:bg-primary/10 hover:text-primary"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={t('accounting.del.tooltip')}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node)
              }}
              className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          !hasChildren && <ChevronsLeft className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100 rtl:rotate-180" />
        )}
      </div>

      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <AccountRow
              key={child.code}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              forceOpen={forceOpen}
              onToggle={onToggle}
              lang={lang}
              t={t}
              canEdit={canEdit}
              rolled={rolled}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onReorder={onReorder}
              onRename={onRename}
              onEditCode={onEditCode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
