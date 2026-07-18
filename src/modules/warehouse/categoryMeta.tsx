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
  PIPES: { icon: Cylinder, tile: 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300', text: 'text-sky-700 dark:text-sky-300', chip: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-500/30', bar: 'bg-sky-500' },
  FITTINGS: { icon: Blocks, tile: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300', text: 'text-indigo-700 dark:text-indigo-300', chip: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-500/30', bar: 'bg-indigo-500' },
  VALVES: { icon: Gauge, tile: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300', text: 'text-violet-700 dark:text-violet-300', chip: 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-500/30', bar: 'bg-violet-500' },
  PUMPS: { icon: Waves, tile: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300', text: 'text-cyan-700 dark:text-cyan-300', chip: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-cyan-200 dark:ring-cyan-500/30', bar: 'bg-cyan-500' },
  EQUIPMENT: { icon: Cog, tile: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300', text: 'text-amber-700 dark:text-amber-300', chip: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30', bar: 'bg-amber-500' },
  ELECTRICAL: { icon: Zap, tile: 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-600 dark:text-yellow-300', text: 'text-yellow-700 dark:text-yellow-300', chip: 'bg-yellow-50 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 ring-yellow-200 dark:ring-yellow-500/30', bar: 'bg-yellow-400' },
  CONSTRUCTION: { icon: Construction, tile: 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300', text: 'text-orange-700 dark:text-orange-300', chip: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 ring-orange-200 dark:ring-orange-500/30', bar: 'bg-orange-500' },
  SCAFFOLDING: { icon: Frame, tile: 'bg-lime-50 text-lime-600 dark:bg-lime-500/15 dark:text-lime-300', text: 'text-lime-700 dark:text-lime-300', chip: 'bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:ring-lime-500/30', bar: 'bg-lime-500' },
  FINISHING: { icon: Paintbrush, tile: 'bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-300', text: 'text-pink-700 dark:text-pink-300', chip: 'bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 ring-pink-200 dark:ring-pink-500/30', bar: 'bg-pink-500' },
  SANITARY: { icon: Droplets, tile: 'bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-300', text: 'text-teal-700 dark:text-teal-300', chip: 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-teal-200 dark:ring-teal-500/30', bar: 'bg-teal-500' },
  TOOLS: { icon: Hammer, tile: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300', text: 'text-slate-700 dark:text-slate-200', chip: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-slate-700', bar: 'bg-slate-500' },
  SAFETY: { icon: ShieldCheck, tile: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300', text: 'text-red-700 dark:text-red-300', chip: 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-500/30', bar: 'bg-red-500' },
  SITE: { icon: MapPin, tile: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300', text: 'text-emerald-700 dark:text-emerald-300', chip: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30', bar: 'bg-emerald-500' },
  OTHER: { icon: Boxes, tile: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300', text: 'text-gray-700 dark:text-slate-300', chip: 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600', bar: 'bg-gray-400' },
}

// Fallback for unknown / legacy category ids.
export const FALLBACK_CATEGORY_META: CategoryMeta = {
  icon: Package,
  tile: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  text: 'text-slate-600 dark:text-slate-300',
  chip: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-700',
  bar: 'bg-slate-300',
}

export function categoryMeta(id: string): CategoryMeta {
  return CATEGORY_META[id] ?? FALLBACK_CATEGORY_META
}
