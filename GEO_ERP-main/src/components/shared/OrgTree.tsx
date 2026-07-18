import { Avatar } from '../ui/Avatar'

export interface OrgNode {
  id: string
  name: string
  title?: string
  subtitle?: string
  color?: string
  children?: OrgNode[]
}

/**
 * Build a forest of OrgNode from a flat list using a parent pointer.
 * Roots are nodes whose parent id is null or not present in the set.
 */
export function buildOrgTree<T>(
  items: T[],
  opts: {
    id: (t: T) => string
    parentId: (t: T) => string | null
    name: (t: T) => string
    title?: (t: T) => string
    subtitle?: (t: T) => string
    color?: (t: T) => string
  },
): OrgNode[] {
  const map = new Map<string, OrgNode>()
  for (const it of items) {
    map.set(opts.id(it), {
      id: opts.id(it),
      name: opts.name(it),
      title: opts.title?.(it),
      subtitle: opts.subtitle?.(it),
      color: opts.color?.(it),
      children: [],
    })
  }
  const roots: OrgNode[] = []
  for (const it of items) {
    const node = map.get(opts.id(it))!
    const pid = opts.parentId(it)
    if (pid && map.has(pid)) {
      map.get(pid)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function Node({ node }: { node: OrgNode }) {
  const hasChildren = node.children && node.children.length > 0
  return (
    <li className="flex flex-col items-center">
      <div className="relative flex flex-col items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card min-w-[160px] transition hover:border-primary hover:shadow-card-hover">
        <Avatar name={node.name} color={node.color ?? '#1a5f7a'} size="md" />
        <p className="mt-2 text-sm font-semibold text-slate-800 text-center">{node.name}</p>
        {node.title && <p className="text-xs text-primary text-center">{node.title}</p>}
        {node.subtitle && <p className="text-[11px] text-slate-400 text-center">{node.subtitle}</p>}
      </div>
      {hasChildren && (
        <>
          <div className="h-5 w-px bg-slate-300" />
          <ul className="flex gap-6 pt-0">
            {node.children!.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                <div className="absolute -top-0 h-5 w-px bg-slate-300" />
                <Node node={child} />
              </div>
            ))}
          </ul>
        </>
      )}
    </li>
  )
}

/** Recursive CSS org chart. Pass roots from buildOrgTree. */
export function OrgTree({ roots }: { roots: OrgNode[] }) {
  return (
    <div className="w-full overflow-x-auto pb-6">
      <ul className="flex justify-center gap-8 pt-2" style={{ minWidth: 'max-content' }}>
        {roots.map((r) => (
          <Node key={r.id} node={r} />
        ))}
      </ul>
    </div>
  )
}
