'use client'

import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { CityMapData, TripSummary } from '@/lib/types/map'
import type { TripStatus } from '@/lib/types/airtable'

const STATUS_BADGE: Record<TripStatus, { label: string; color: string }> = {
  Completed: { label: 'DONE', color: '#0D9488' },
  Planned: { label: 'PLANNED', color: '#D97706' },
  'In Progress': { label: 'IN PROG', color: '#3B82F6' },
  Wishlist: { label: 'WISH', color: '#7C3AED' },
}

function createCityIcon(timesVisited: number): L.DivIcon {
  // Scale icon size with visit count
  const size = timesVisited >= 5 ? 14 : timesVisited >= 3 ? 11 : timesVisited >= 2 ? 9 : 7
  const glowSize = size + 6

  return L.divIcon({
    html: `
      <div style="position: relative; width: ${glowSize}px; height: ${glowSize}px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: #0D9488;
          border: 2px solid #5EEAD4;
          box-shadow: 0 0 ${glowSize}px rgba(13,148,136,0.7), 2px 2px 0 0 #0F766E;
          cursor: pointer;
          transition: all 0.15s;
        "></div>
      </div>
    `,
    className: '',
    iconSize: [glowSize, glowSize],
    iconAnchor: [glowSize / 2, glowSize / 2],
    popupAnchor: [0, -(glowSize / 2 + 4)],
  })
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(rating)}
      <span className="text-slate-600">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function TripBadge({ trip }: { trip: TripSummary }) {
  const badge = STATUS_BADGE[trip.status]
  return (
    <li className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11px] text-slate-300 truncate flex-1">{trip.name}</span>
      <span
        className="text-[8px] px-1 py-px shrink-0"
        style={{
          fontFamily: 'var(--font-pixel)',
          color: badge.color,
          border: `1px solid ${badge.color}`,
        }}
      >
        {badge.label}
      </span>
    </li>
  )
}

interface CityMarkersProps {
  cities: CityMapData[]
}

export default function CityMarkers({ cities }: CityMarkersProps) {
  return (
    <>
      {cities.map((city) => (
        <Marker
          key={city.id}
          position={[city.latitude, city.longitude]}
          icon={createCityIcon(city.timesVisited)}
        >
          <Popup minWidth={180} maxWidth={260}>
            <div className="p-3">
              {/* City name */}
              <p
                className="text-[10px] text-teal-300 mb-2 leading-relaxed"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                {city.name.toUpperCase()}
              </p>

              {/* Rating */}
              {city.rating != null && city.rating > 0 && (
                <div className="mb-2">
                  <RatingStars rating={city.rating} />
                </div>
              )}

              {/* Visit count */}
              <p
                className="text-[9px] text-slate-400 mb-2"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                VISITED {city.timesVisited}×
              </p>

              {/* Trips */}
              {city.trips.length > 0 && (
                <div className="border-t border-teal-900 pt-2">
                  <ul className="space-y-0.5">
                    {city.trips.map((t) => (
                      <TripBadge key={t.id} trip={t} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
