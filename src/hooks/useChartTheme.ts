import { useTheme } from '../context/ThemeContext'

/**
 * Theme-aware colors for Recharts (and other JS-driven visualizations).
 * Recharts takes raw color strings via props — it can't use Tailwind `dark:`
 * classes — so charts read these values and re-render when the theme flips.
 * Light values mirror the original hardcoded palette (slate-500/100/200 + white).
 */
export interface ChartTheme {
  /** Axis tick label color. */
  axis: string
  /** Cartesian grid stroke. */
  grid: string
  /** Axis line stroke. */
  axisLine: string
  /** Custom tooltip surface. */
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  /** Stroke separating pie/donut slices (was hardcoded `#fff`). */
  pieStroke: string
}

const LIGHT: ChartTheme = {
  axis: '#64748b', // slate-500
  grid: '#f1f5f9', // slate-100
  axisLine: '#e2e8f0', // slate-200
  tooltipBg: '#ffffff',
  tooltipBorder: '#e2e8f0', // slate-200
  tooltipText: '#334155', // slate-700
  pieStroke: '#ffffff',
}

const DARK: ChartTheme = {
  axis: '#94a3b8', // slate-400
  grid: '#23262f', // deep border (matches .dark --slate-700)
  axisLine: '#23262f',
  tooltipBg: '#16181e', // card surface (matches .dark --slate-800)
  tooltipBorder: '#23262f',
  tooltipText: '#e2e8f0', // slate-200
  pieStroke: '#090a0d', // page bg (matches .dark --slate-900)
}

export function useChartTheme(): ChartTheme {
  return useTheme().theme === 'dark' ? DARK : LIGHT
}
