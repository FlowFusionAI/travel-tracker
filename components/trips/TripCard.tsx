// components/trips/TripCard.tsx
'use client'

import Link from 'next/link'
import type { TripListItem } from '@/lib/types/trips'
import type { TripStatus } from '@/lib/types/airtable'

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; borderColor: string }> = {
  Completed: { label: 'DONE', color: 'text-teal-400', borderColor: 'border-teal-700' },
  Planned: { label: 'PLANNED', color: 'text-amber-400', borderColor: 'border-amber-700' },
  'In Progress': { label: 'IN PROG', color: 'text-blue-400', borderColor: 'border-blue-700' },
  Wishlist: { label: 'WISHLIST', color: 'text-violet-400', borderColor: 'border-violet-700' },
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return ''
  const sy = start.slice(0, 4)
  const sm = start.slice(5, 7)
  if (!end) return `${sm}/${sy}`
  const ey = end.slice(0, 4)
  const em = end.slice(5, 7)
  if (sy === ey) return `${sm}–${em}/${sy}`
  return `${sm}/${sy}–${em}/${ey}`
}

interface TripCardProps {
  trip: TripListItem
  variant: 'featured' | 'small'
}

export default function TripCard({ trip, variant }: TripCardProps) {
  const cfg = STATUS_CONFIG[trip.status]
  const dateStr = formatDateRange(trip.startDate, trip.endDate)
  const firstCountry = trip.countries[0]
  const flagStr = trip.countries.map(c => c.flagEmoji ?? '').filter(Boolean).join(' ')

  const imageUrl = trip.hasCoverImage
    ? `/api/images?recordId=${trip.id}&table=Trips&field=Cover+Image`
    : null

  if (variant === 'featured') {
    return (
      <Link
        href={`/trips/${trip.id}/mindmap`}
        className="block group relative overflow-hidden"
        style={{
          border: '2px solid #0d9488',
          boxShadow: '4px 4px 0 0 #0d9488',
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
        onMouseDown={e => {
          const el = e.currentTarget
          el.style.transform = 'translateY(2px)'
          el.style.boxShadow = '2px 2px 0 0 #0d9488'
        }}
        onMouseUp={e => {
          const el = e.currentTarget
          el.style.transform = ''
          el.style.boxShadow = '4px 4px 0 0 #0d9488'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget
          el.style.transform = ''
          el.style.boxShadow = '4px 4px 0 0 #0d9488'
        }}
      >
        {/* Cover image area */}
        <div className="relative h-[220px] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={trip.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(135deg, #0d2030 0%, #0a1520 50%, #0d1430 100%)',
              }}
            />
          )}
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
            }}
          />
          {/* Bottom gradient overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3"
            style={{
              background: 'linear-gradient(transparent, rgba(10,15,20,0.95) 60%)',
            }}
          >
            <div className="flex items-end justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3
                  className="text-[11px] text-white leading-relaxed truncate"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {trip.name}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {flagStr && <span className="text-sm leading-none">{flagStr}</span>}
                  {firstCountry && (
                    <span className="text-[9px] text-slate-400">{firstCountry.name}</span>
                  )}
                  {dateStr && <span className="text-[9px] text-slate-500">{dateStr}</span>}
                  {trip.rating != null && trip.rating > 0 && (
                    <span className="text-[10px] text-amber-400">
                      {'★'.repeat(trip.rating)}
                      <span className="text-slate-700">{'★'.repeat(5 - trip.rating)}</span>
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-[7px] px-1.5 py-1 border shrink-0 leading-none ${cfg.color} ${cfg.borderColor}`}
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Small variant
  return (
    <Link
      href={`/trips/${trip.id}/mindmap`}
      className="block group overflow-hidden"
      style={{
        border: '2px solid #1e3a3a',
        boxShadow: '3px 3px 0 0 #0d4040',
        background: 'rgba(13,27,42,0.8)',
        transition: 'transform 0.1s, box-shadow 0.1s, border-color 0.1s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = '#0d9488'
        el.style.boxShadow = '3px 3px 0 0 #0d9488'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = '#1e3a3a'
        el.style.boxShadow = '3px 3px 0 0 #0d4040'
        el.style.transform = ''
      }}
      onMouseDown={e => {
        const el = e.currentTarget
        el.style.transform = 'translateY(2px)'
        el.style.boxShadow = '1px 1px 0 0 #0d9488'
      }}
      onMouseUp={e => {
        const el = e.currentTarget
        el.style.transform = ''
        el.style.boxShadow = '3px 3px 0 0 #0d9488'
      }}
    >
      {/* Cover image */}
      <div className="relative h-[120px] overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={trip.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #0d1a2a, #0a1018)' }}
          />
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          }}
        />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p
          className="text-[9px] text-slate-200 leading-snug line-clamp-2 mb-1.5"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          {trip.name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {flagStr && <span className="text-[11px]">{flagStr}</span>}
          {firstCountry && (
            <span className="text-[8px] text-slate-500">{firstCountry.name}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          {dateStr ? (
            <span className="text-[8px] text-slate-600">{dateStr}</span>
          ) : (
            <span />
          )}
          <span
            className={`text-[6px] px-1 py-0.5 border leading-none ${cfg.color} ${cfg.borderColor}`}
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            {cfg.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
