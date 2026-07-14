import {
  Cylinder,
  Blocks,
  Gauge,
  Waves,
  Cog,
  Zap,
  Construction,
  Frame,
  Paintbrush,
  Droplets,
  Hammer,
  ShieldCheck,
  MapPin,
  Boxes,
  Package,
  type LucideIcon,
} from 'lucide-react'

// Per-category icon + color styling for the visual explorer.
//   tile — colored icon tile (bg + icon color)
//   text — accent text color (counts / active labels)
//   chip — soft tinted pill (bg + text + ring) for active chips
// NOTE: all Tailwind classes are written LITERALLY — Tailwind's purge only keeps
// classes it can see as complete strings, so never build these dynamically.
export interface CategoryMeta {
  icon: LucideIcon
  tile: string
  text: string
  chip: string
  bar: string // solid fill for the share-of-inventory bar on the category cards
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  PIPES: { icon: Cylinder, tile: 'bg-sky-50 text-sky-600', text: 'text-sky-700', chip: 'bg-sky-50 text-sky-700 ring-sky-200', bar: 'bg-sky-500' },
  FITTINGS: { icon: Blocks, tile: 'bg-indigo-50 text-indigo-600', text: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', bar: 'bg-indigo-500' },
  VALVES: { icon: Gauge, tile: 'bg-violet-50 text-violet-600', text: 'text-violet-700', chip: 'bg-violet-50 text-violet-700 ring-violet-200', bar: 'bg-violet-500' },
  PUMPS: { icon: Waves, tile: 'bg-cyan-50 text-cyan-600', text: 'text-cyan-700', chip: 'bg-cyan-50 text-cyan-700 ring-cyan-200', bar: 'bg-cyan-500' },
  EQUIPMENT: { icon: Cog, tile: 'bg-amber-50 text-amber-600', text: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500' },
  ELECTRICAL: { icon: Zap, tile: 'bg-yellow-50 text-yellow-600', text: 'text-yellow-700', chip: 'bg-yellow-50 text-yellow-700 ring-yellow-200', bar: 'bg-yellow-400' },
  CONSTRUCTION: { icon: Construction, tile: 'bg-orange-50 text-orange-600', text: 'text-orange-700', chip: 'bg-orange-50 text-orange-700 ring-orange-200', bar: 'bg-orange-500' },
  SCAFFOLDING: { icon: Frame, tile: 'bg-lime-50 text-lime-600', text: 'text-lime-700', chip: 'bg-lime-50 text-lime-700 ring-lime-200', bar: 'bg-lime-500' },
  FINISHING: { icon: Paintbrush, tile: 'bg-pink-50 text-pink-600', text: 'text-pink-700', chip: 'bg-pink-50 text-pink-700 ring-pink-200', bar: 'bg-pink-500' },
  SANITARY: { icon: Droplets, tile: 'bg-teal-50 text-teal-600', text: 'text-teal-700', chip: 'bg-teal-50 text-teal-700 ring-teal-200', bar: 'bg-teal-500' },
  TOOLS: { icon: Hammer, tile: 'bg-slate-100 text-slate-600', text: 'text-slate-700', chip: 'bg-slate-100 text-slate-700 ring-slate-200', bar: 'bg-slate-500' },
  SAFETY: { icon: ShieldCheck, tile: 'bg-red-50 text-red-600', text: 'text-red-700', chip: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' },
  SITE: { icon: MapPin, tile: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' },
  OTHER: { icon: Boxes, tile: 'bg-gray-100 text-gray-600', text: 'text-gray-700', chip: 'bg-gray-100 text-gray-700 ring-gray-200', bar: 'bg-gray-400' },
}

// Fallback for unknown / legacy category ids.
export const FALLBACK_CATEGORY_META: CategoryMeta = {
  icon: Package,
  tile: 'bg-slate-100 text-slate-500',
  text: 'text-slate-600',
  chip: 'bg-slate-100 text-slate-600 ring-slate-200',
  bar: 'bg-slate-300',
}

export function categoryMeta(id: string): CategoryMeta {
  return CATEGORY_META[id] ?? FALLBACK_CATEGORY_META
}
