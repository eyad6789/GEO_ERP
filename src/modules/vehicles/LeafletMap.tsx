// ============================================================================
// LeafletMap — reusable Leaflet map component for the Fleet module.
// Leaflet is loaded from CDN (window.L); no npm package.
// Contract: export interface LeafletMapProps / export function LeafletMap
// ============================================================================
import { useEffect, useRef } from 'react'
import type { FleetMapData } from '../../types'
import { useLang } from '../../context/LangContext'
import { STATUS_COLOR } from './fleetUtils'

export interface LeafletMapProps {
  data: FleetMapData | null
  height?: number
  compact?: boolean
  className?: string
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

// Status label text colours for popup text
const STATUS_TEXT_COLOR: Record<string, string> = {
  ACTIVE: '#16a34a',
  MAINTENANCE: '#d97706',
  INACTIVE: '#64748b',
  RETIRED: '#94a3b8',
}

export function LeafletMap({ data, height = 400, compact = false, className }: LeafletMapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  // Keep a stable ref to the map instance so we can destroy/re-init on data changes
  const mapRef = useRef<unknown>(null)
  const { lang } = useLang()

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

    // Initialise Leaflet map
    const map = L.map(container, {
      zoomControl: !compact,
      attributionControl: !compact,
    }).setView([33.2, 44.0], compact ? 5 : 6)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    mapRef.current = map

    // ── Project markers ──────────────────────────────────────────────────────
    if (data?.projects) {
      data.projects.forEach((p) => {
        if (p.lat == null || p.lng == null) return

        const color = KIND_COLOR[p.kind] ?? '#1a5f7a'
        const name = lang === 'ar' ? p.name_ar : p.name_en
        const kindEmoji = p.kind === 'ACTIVE' ? '📍' : p.kind === 'MASTERPLAN' ? '🗺️' : '🏢'
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
            display:flex;align-items:center;gap:3px;
            direction:${lang === 'ar' ? 'rtl' : 'ltr'};
          ">${kindEmoji} ${name}${countBadge}</div>`,
          iconSize: [null as unknown as number, 26],
          iconAnchor: [60, 13],
        })

        L.marker([p.lat, p.lng], { icon })
          .bindPopup(`
            <div style="font-family:Cairo,Inter,sans-serif;min-width:160px;direction:${lang === 'ar' ? 'rtl' : 'ltr'}">
              <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:6px;">${kindEmoji} ${name}</div>
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

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:${statusColor};
            border:2.5px solid #fff;
            border-radius:50%;
            width:30px;height:30px;
            display:flex;align-items:center;justify-content:center;
            font-size:14px;
            box-shadow:0 2px 6px rgba(0,0,0,.35);
            cursor:pointer;
          ">${v.emoji || '🚗'}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        })

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
          ? `${v.emoji} ${typeAr[v.vehicle_type] ?? v.vehicle_type}`
          : `${v.emoji} ${typeEn[v.vehicle_type] ?? v.vehicle_type}`
        const vehicleName = isAr ? v.name_ar : v.name_en
        const headingLabel = isAr ? 'متجهة إلى' : 'Heading to'
        const driverLabel = isAr ? 'السائق' : 'Driver'
        const plateLabel = isAr ? 'اللوحة' : 'Plate'
        const typeFieldLabel = isAr ? 'النوع' : 'Type'
        const statusFieldLabel = isAr ? 'الحالة' : 'Status'
        const headingValue = v.project_name || v.location || (isAr ? 'غير محدد' : 'Unknown')

        const popupHtml = `
          <div style="font-family:Cairo,Inter,sans-serif;min-width:190px;direction:${isAr ? 'rtl' : 'ltr'}">
            <div style="font-size:13px;font-weight:700;color:#1a5f7a;margin-bottom:7px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;">
              ${v.emoji} ${vehicleName}
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

        L.marker([v.lat, v.lng], { icon })
          .bindPopup(L.popup({ maxWidth: 260 }).setContent(popupHtml))
          .addTo(map)
      })
    }

    // Force Leaflet to recalculate its size after mount — fixes blank tile issue
    // when the container wasn't fully painted yet.
    requestAnimationFrame(() => {
      try { map.invalidateSize() } catch (_) { /* map may have been unmounted */ }
    })

    return () => {
      try { map.remove() } catch (_) { /* ignore */ }
      mapRef.current = null
    }
    // Re-init when data or lang changes (markers need re-rendering for bilingual labels)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lang, compact])

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
      ref={containerRef}
      className={className}
      style={{ height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}
    />
  )
}
