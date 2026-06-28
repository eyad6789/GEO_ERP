// ============================================================================
// LeafletMap — reusable Leaflet map component for the Fleet module.
// Leaflet is loaded from CDN (window.L); no npm package.
// Contract: export interface LeafletMapProps / export function LeafletMap
// ============================================================================
import { useEffect, useRef, useState, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapPin, Map as MapIcon, Building2, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FleetMapData } from '../../types'
import { useLang, useT } from '../../context/LangContext'
import { STATUS_COLOR, TYPE_ICON, VEHICLE_TYPES } from './fleetUtils'
import { registerStrings } from '../../i18n/strings'

// Cooperative-gesture hint shown when the user scrolls over the map without Ctrl/⌘.
registerStrings({
  'fleet.map.zoom_hint': { ar: 'استخدم Ctrl + التمرير للتكبير', en: 'Use Ctrl + scroll to zoom' },
})

export interface LeafletMapProps {
  data: FleetMapData | null
  height?: number
  compact?: boolean
  className?: string
  /** When set, the map flies to this vehicle, opens its popup, and highlights its marker. */
  selectedVehicleId?: string | null
  /** Fleet Manager only: makes vehicle markers draggable to relocate the car. */
  editable?: boolean
  /** Called after a vehicle marker is dragged to a new position. */
  onVehicleMove?: (vehicleId: string, lat: number, lng: number) => void
}

// Project-kind colours aligned with the app theme:
//   ACTIVE     → teal primary  #1a5f7a
//   MASTERPLAN → amber accent  #e8a838
//   BASE       → slate HQ      #475569
const KIND_COLOR: Record<string, string> = {
  ACTIVE: '#1a5f7a',
  MASTERPLAN: '#e8a838',
  BASE: '#475569',
}

// Middle East bounding box [SW, NE] — keeps the map from panning/zooming out to the world.
const MIDDLE_EAST_BOUNDS: [[number, number], [number, number]] = [[12.0, 25.0], [42.5, 63.0]]

// Iraq bounding box [SW, NE] — the map opens framed on Iraq.
const IRAQ_BOUNDS: [[number, number], [number, number]] = [[29.0, 38.8], [37.4, 48.6]]

// Status label text colours for popup text
const STATUS_TEXT_COLOR: Record<string, string> = {
  ACTIVE: '#16a34a',
  MAINTENANCE: '#d97706',
  INACTIVE: '#64748b',
  RETIRED: '#94a3b8',
}

// ── Lucide icons → static SVG strings (markers are HTML, not React). ──────────
// Precomputed once at module load since icons are static.
const iconSvg = (Icon: LucideIcon, size: number, color: string, stroke = 2): string =>
  renderToStaticMarkup(createElement(Icon, { size, color, strokeWidth: stroke }))

// Per vehicle-type: white icon for the marker (normal + larger selected) and a
// dark icon for the popup heading.
const TYPE_SVG: Record<string, string> = {}
const TYPE_SVG_LG: Record<string, string> = {}
const TYPE_SVG_POPUP: Record<string, string> = {}
VEHICLE_TYPES.forEach((tp) => {
  const Icon = TYPE_ICON[tp] ?? Truck
  TYPE_SVG[tp] = iconSvg(Icon, 16, '#fff', 2.25)
  TYPE_SVG_LG[tp] = iconSvg(Icon, 20, '#fff', 2.25)
  TYPE_SVG_POPUP[tp] = iconSvg(Icon, 13, '#1a5f7a', 2)
})

// Project-kind: white icon for the map label, coloured icon for the popup heading.
const KIND_ICON: Record<string, LucideIcon> = { ACTIVE: MapPin, MASTERPLAN: MapIcon, BASE: Building2 }
const KIND_SVG: Record<string, string> = {}
const KIND_SVG_POPUP: Record<string, string> = {}
;(['ACTIVE', 'MASTERPLAN', 'BASE'] as const).forEach((k) => {
  KIND_SVG[k] = iconSvg(KIND_ICON[k], 13, '#fff', 2.25)
  KIND_SVG_POPUP[k] = iconSvg(KIND_ICON[k], 13, KIND_COLOR[k] ?? '#1a5f7a', 2.25)
})

export function LeafletMap({ data, height = 400, compact = false, className, selectedVehicleId, editable = false, onVehicleMove }: LeafletMapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  // Latest move callback, kept in a ref so the build effect needn't depend on it.
  const onMoveRef = useRef(onVehicleMove)
  onMoveRef.current = onVehicleMove
  // Keep a stable ref to the map instance so we can destroy/re-init on data changes
  const mapRef = useRef<unknown>(null)
  // Registry of vehicle markers (id → Leaflet marker) populated by the build effect,
  // consumed by the selection effect to fly/highlight without rebuilding the map.
  const markersRef = useRef<Record<string, any>>({})
  // Id of the marker currently showing the highlighted icon (so it can be reverted).
  const prevSelectedRef = useRef<string | null>(null)
  const { lang } = useLang()
  const t = useT()

  // Transient "Use Ctrl + scroll to zoom" hint, flashed when the user scrolls without a modifier.
  const [hint, setHint] = useState(false)
  const hintTimer = useRef<number | null>(null)
  const showHint = () => {
    setHint(true)
    if (hintTimer.current != null) clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(false), 1300)
  }
  useEffect(() => () => { if (hintTimer.current != null) clearTimeout(hintTimer.current) }, [])

  useEffect(() => {
    const L = (window as any).L as any
    if (!L) return
    const container = containerRef.current
    if (!container) return

    // Destroy previous instance if any (React strict-mode double-invoke guard)
    if (mapRef.current) {
      try { (mapRef.current as any).remove() } catch (_) { /* ignore */ }
      mapRef.current = null
    }

    // Fresh build → empty marker registry and no active highlight. (Prevents the
    // selection effect from reverting a marker that belonged to a destroyed map.)
    markersRef.current = {}
    prevSelectedRef.current = null

    // Initialise Leaflet map
    const map = L.map(container, {
      zoomControl: !compact,
      attributionControl: !compact,
      maxBounds: MIDDLE_EAST_BOUNDS,   // hard pan limit
      maxBoundsViscosity: 1.0,         // bounds act as a solid wall (no rubber-band drag-out)
      minZoom: 4,                      // can't zoom out past the regional view
      scrollWheelZoom: false,          // plain scroll scrolls the page; Ctrl/⌘+scroll zooms (handled below)
    }).fitBounds(IRAQ_BOUNDS)          // open framed on Iraq

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map

    // ── Cooperative wheel zoom: Ctrl/⌘ + scroll zooms toward the cursor; plain scroll
    //    lets the page scroll and flashes a hint. (passive:false so we can preventDefault.)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {            // modifier held, or trackpad pinch (browsers set ctrlKey)
        e.preventDefault()                     // stop the browser's own Ctrl+wheel page-zoom
        const delta = e.deltaY < 0 ? 1 : -1
        map.setZoomAround(map.mouseEventToLatLng(e), map.getZoom() + delta)  // clamped by minZoom/maxBounds
      } else {
        showHint()                             // let the page scroll; nudge the user toward Ctrl
      }
    }
    container.addEventListener('wheel', onWheel, { passive: false })

    // ── Project markers ──────────────────────────────────────────────────────
    if (data?.projects) {
      data.projects.forEach((p) => {
        if (p.lat == null || p.lng == null) return

        const color = KIND_COLOR[p.kind] ?? '#1a5f7a'
        const name = lang === 'ar' ? p.name_ar : p.name_en
        const kindIcon = KIND_SVG[p.kind] ?? KIND_SVG.BASE
        const kindIconPopup = KIND_SVG_POPUP[p.kind] ?? KIND_SVG_POPUP.BASE
        const countBadge = p.vehicle_count > 0
          ? `<span style="background:rgba(255,255,255,0.25);border-radius:9px;padding:0 5px;font-size:10px;margin-${lang === 'ar' ? 'right' : 'left'}:4px;">${p.vehicle_count}</span>`
          : ''

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:${color};
            color:#fff;
            border:2px solid #fff;
            border-radius:6px;
            padding:4px 8px;
            font-size:11px;
            font-weight:700;
            font-family:Cairo,Inter,sans-serif;
            white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,.3);
            display:flex;align-items:center;gap:4px;
            direction:${lang === 'ar' ? 'rtl' : 'ltr'};
          ">${kindIcon}<span>${name}</span>${countBadge}</div>`,
          iconSize: [null as unknown as number, 26],
          iconAnchor: [60, 13],
        })

        L.marker([p.lat, p.lng], { icon })
          .bindPopup(`
            <div style="font-family:Cairo,Inter,sans-serif;min-width:160px;direction:${lang === 'ar' ? 'rtl' : 'ltr'}">
              <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:6px;display:flex;align-items:center;gap:5px;">${kindIconPopup}<span>${name}</span></div>
              <div style="font-size:11px;color:#64748b;">${p.location}</div>
              ${p.vehicle_count > 0
                ? `<div style="margin-top:6px;font-size:11px;color:#1a5f7a;font-weight:600;">
                    ${lang === 'ar' ? `${p.vehicle_count} آلية في الموقع` : `${p.vehicle_count} vehicle${p.vehicle_count !== 1 ? 's' : ''} on site`}
                   </div>`
                : ''}
            </div>
          `)
          .addTo(map)
      })
    }

    // ── Vehicle markers ──────────────────────────────────────────────────────
    if (data?.vehicles) {
      data.vehicles.forEach((v) => {
        if (v.lat == null || v.lng == null) return

        const statusColor = STATUS_COLOR[v.status] ?? '#64748b'
        const statusTextColor = STATUS_TEXT_COLOR[v.status] ?? '#64748b'

        const typeSvg = TYPE_SVG[v.vehicle_type] ?? TYPE_SVG.MISC
        const typeSvgLg = TYPE_SVG_LG[v.vehicle_type] ?? TYPE_SVG_LG.MISC

        const normalIcon = L.divIcon({
          className: '',
          html: `<div style="
            background:${statusColor};
            border:2.5px solid #fff;
            border-radius:50%;
            width:30px;height:30px;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            cursor:pointer;
          ">${typeSvg}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        })

        // Larger, ringed variant used when this vehicle is the selected one.
        const selectedHtml = `<div style="
          background:${statusColor};
          border:3px solid #fff;
          border-radius:50%;
          width:40px;height:40px;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 0 0 3px ${statusColor}, 0 2px 12px rgba(0,0,0,.45);
          cursor:pointer;
        ">${typeSvgLg}</div>`

        const statusAr: Record<string, string> = {
          ACTIVE: 'عاملة', MAINTENANCE: 'صيانة', INACTIVE: 'متوقفة', RETIRED: 'مسحوبة'
        }
        const typeAr: Record<string, string> = {
          CAR: 'سيارة', PICKUP: 'بيك أب', MIXER: 'خباطة', EXCAVATOR: 'حفارة',
          LOADER: 'شفل', BULLDOZER: 'جرافة', CRANE: 'كرين', DUMP_TRUCK: 'قلاب',
          LIFT: 'رافعة', ROLLER: 'حادلة', DUMPER: 'دنبر', TANKER: 'تانكر',
          PUMP: 'مضخة', MISC: 'أخرى',
        }
        const typeEn: Record<string, string> = {
          CAR: 'Light Vehicle', PICKUP: 'Pickup', MIXER: 'Concrete Mixer', EXCAVATOR: 'Excavator',
          LOADER: 'Wheel Loader', BULLDOZER: 'Bulldozer/Grader', CRANE: 'Crane', DUMP_TRUCK: 'Dump Truck',
          LIFT: 'Lift/Forklift', ROLLER: 'Road Roller', DUMPER: 'Dumper', TANKER: 'Tanker',
          PUMP: 'Concrete Pump', MISC: 'Other',
        }

        const isAr = lang === 'ar'
        const statusLabel = isAr ? (statusAr[v.status] ?? v.status) : v.status
        const typeLabel = isAr
          ? `${typeAr[v.vehicle_type] ?? v.vehicle_type}`
          : `${typeEn[v.vehicle_type] ?? v.vehicle_type}`
        const vehicleName = isAr ? v.name_ar : v.name_en
        const headingLabel = isAr ? 'متجهة إلى' : 'Heading to'
        const driverLabel = isAr ? 'السائق' : 'Driver'
        const plateLabel = isAr ? 'اللوحة' : 'Plate'
        const typeFieldLabel = isAr ? 'النوع' : 'Type'
        const statusFieldLabel = isAr ? 'الحالة' : 'Status'
        const headingValue = v.project_name || v.location || (isAr ? 'غير محدد' : 'Unknown')

        const popupHtml = `
          <div style="font-family:Cairo,Inter,sans-serif;min-width:190px;direction:${isAr ? 'rtl' : 'ltr'}">
            <div style="font-size:13px;font-weight:700;color:#1a5f7a;margin-bottom:7px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;display:flex;align-items:center;gap:5px;">
              ${TYPE_SVG_POPUP[v.vehicle_type] ?? ''}<span>${vehicleName}</span>
            </div>
            <table style="width:100%;font-size:11px;border-collapse:collapse;color:#334155;">
              <tr>
                <td style="padding:2px 0;color:#94a3b8;${isAr ? 'text-align:right' : ''}">${plateLabel}</td>
                <td style="padding:2px 0;font-weight:600;${isAr ? 'text-align:left' : 'text-align:right'}">${v.plate_number}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;color:#94a3b8;${isAr ? 'text-align:right' : ''}">${typeFieldLabel}</td>
                <td style="padding:2px 0;${isAr ? 'text-align:left' : 'text-align:right'}">${typeLabel}</td>
              </tr>
              <tr>
                <td style="padding:2px 0;color:#94a3b8;${isAr ? 'text-align:right' : ''}">${statusFieldLabel}</td>
                <td style="padding:2px 0;font-weight:600;color:${statusTextColor};${isAr ? 'text-align:left' : 'text-align:right'}">${statusLabel}</td>
              </tr>
              ${v.driver_name ? `
              <tr>
                <td style="padding:2px 0;color:#94a3b8;${isAr ? 'text-align:right' : ''}">${driverLabel}</td>
                <td style="padding:2px 0;${isAr ? 'text-align:left' : 'text-align:right'}">${v.driver_name}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:4px 0 2px;color:#94a3b8;${isAr ? 'text-align:right' : ''}">${headingLabel}</td>
                <td style="padding:4px 0 2px;color:#1a5f7a;font-weight:600;${isAr ? 'text-align:left' : 'text-align:right'}">${headingValue}</td>
              </tr>
            </table>
          </div>
        `

        const marker = L.marker([v.lat, v.lng], { icon: normalIcon, draggable: editable })
          .bindPopup(L.popup({ maxWidth: 260 }).setContent(popupHtml))
          .addTo(map)

        // Fleet Manager: dragging the marker relocates the vehicle. We persist via
        // the callback but do NOT rebuild the map, so the view/zoom stays put.
        if (editable) {
          marker.on('dragend', () => {
            const p = marker.getLatLng()
            onMoveRef.current?.(v.id, p.lat, p.lng)
          })
        }

        // Stash icon variants on the marker and register it for the selection effect.
        marker._normalIcon = normalIcon
        marker._selectedHtml = selectedHtml
        markersRef.current[v.id] = marker
      })
    }

    // Force Leaflet to recalculate its size after mount — fixes blank tile issue
    // when the container wasn't fully painted yet.
    requestAnimationFrame(() => {
      try { map.invalidateSize() } catch (_) { /* map may have been unmounted */ }
    })

    return () => {
      container.removeEventListener('wheel', onWheel)
      try { map.remove() } catch (_) { /* ignore */ }
      mapRef.current = null
    }
    // Re-init when data or lang changes (markers need re-rendering for bilingual labels)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lang, compact, editable])

  // ── Selection: fly to + open popup + highlight the chosen vehicle ──────────
  // Declared AFTER the build effect so that, on a `data` change, the build body
  // repopulates markersRef before this body reads it. No cleanup — it must never
  // touch the map after the build effect's teardown. Keyed on `data` too, so the
  // highlight re-applies after a rebuild while a selection is active.
  useEffect(() => {
    const L = (window as any).L as any
    const map = mapRef.current as any
    if (!L || !map) return

    // Revert the previously highlighted marker (if it's a different one and still exists).
    const prevId = prevSelectedRef.current
    if (prevId && prevId !== selectedVehicleId) {
      const prev = markersRef.current[prevId]
      if (prev && prev._normalIcon) prev.setIcon(prev._normalIcon)
    }

    if (!selectedVehicleId) {
      prevSelectedRef.current = null
      return
    }

    const marker = markersRef.current[selectedVehicleId]
    if (!marker) {
      // Vehicle has no coordinates, or isn't in the map payload — no-op gracefully.
      prevSelectedRef.current = selectedVehicleId
      return
    }

    // Highlight, then fly (before opening the popup so its auto-pan doesn't fight flyTo).
    marker.setIcon(
      L.divIcon({
        className: '',
        html: marker._selectedHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22],
      }),
    )
    const ll = marker.getLatLng()
    try { map.flyTo([ll.lat, ll.lng], Math.max(map.getZoom(), 13), { duration: 1.2 }) } catch (_) { /* ignore */ }
    marker.openPopup()

    prevSelectedRef.current = selectedVehicleId
  }, [selectedVehicleId, data])

  // Guard: if CDN hasn't loaded yet
  if (typeof window !== 'undefined' && !(window as any).L) {
    return (
      <div
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span className="text-sm text-slate-400">Leaflet not loaded — check CDN</span>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{ position: 'relative', height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}
    >
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      {hint && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none', zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'rgba(15,23,42,.72)', color: '#fff', padding: '8px 16px',
              borderRadius: 8, fontSize: 13, fontFamily: 'Cairo,Inter,sans-serif',
            }}
          >
            {t('fleet.map.zoom_hint')}
          </div>
        </div>
      )}
    </div>
  )
}
