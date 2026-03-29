'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { WorkspaceTrip } from '@/lib/types/trips'
import type { TripStatus } from '@/lib/types/airtable'

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string }> = {
  Completed: { label: 'DONE', color: 'text-teal-400' },
  Planned: { label: 'PLANNED', color: 'text-amber-400' },
  'In Progress': { label: 'IN PROG', color: 'text-blue-400' },
  Wishlist: { label: 'WISHLIST', color: 'text-violet-400' },
}

const TABS = [
  { label: 'MIND MAP', suffix: 'mindmap' },
  { label: 'ITINERARY', suffix: 'itinerary' },
  { label: 'MEMORIES', suffix: 'memories' },
  { label: 'INFO', suffix: 'info' },
]

const pixelFont = { fontFamily: 'var(--font-pixel)' }

interface WorkspaceShellProps {
  trip: WorkspaceTrip
  children: React.ReactNode
}

export default function WorkspaceShell({ trip, children }: WorkspaceShellProps) {
  const pathname = usePathname()
  const statusCfg = STATUS_CONFIG[trip.status]

  const flagStr = trip.countries.map(c => c.flagEmoji ?? '').filter(Boolean).join(' ')
  const countryNames = trip.countries.map(c => c.name).join(', ')

  const coverBg = trip.hasCoverImage
    ? `url(/api/images?recordId=${trip.id}&table=Trips&field=Cover+Image) center/cover no-repeat`
    : 'linear-gradient(135deg, #0d2030 0%, #0a1020 100%)'

  function formatDateRange(start?: string, end?: string) {
    if (!start) return ''
    const sy = start.slice(0, 4)
    if (!end) return sy
    const ey = end.slice(0, 4)
    if (sy === ey) {
      return `${start.slice(5, 7)}–${end.slice(5, 7)} ${sy}`
    }
    return `${sy}–${ey}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hero strip */}
      <div
        className="relative flex-shrink-0 pt-[52px]"
        style={{ background: coverBg }}
      >
        {/* Blur + dark overlay for cover image backgrounds */}
        {trip.hasCoverImage && (
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(10,15,20,0.75)' }}
          />
        )}
        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          }}
        />

        <div className="relative z-10 px-4 py-3 flex items-center gap-4">
          {/* Back link */}
          <Link
            href="/trips"
            className="text-[7px] text-slate-500 hover:text-teal-400 transition-colors shrink-0"
            style={pixelFont}
          >
            ← TRIPS
          </Link>

          {/* Trip name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[10px] text-white truncate"
                style={pixelFont}
              >
                {trip.name.toUpperCase()}
              </h1>
              <span
                className={`text-[7px] px-1.5 py-0.5 border leading-none ${statusCfg.color}`}
                style={{ ...pixelFont, borderColor: 'currentColor' }}
              >
                {statusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {flagStr && <span className="text-sm">{flagStr}</span>}
              {countryNames && (
                <span className="text-[8px] text-slate-400">{countryNames}</span>
              )}
              {(trip.startDate || trip.endDate) && (
                <span className="text-[8px] text-slate-500">
                  {formatDateRange(trip.startDate, trip.endDate)}
                </span>
              )}
              {trip.rating != null && trip.rating > 0 && (
                <span className="text-[10px] text-amber-400">
                  {'★'.repeat(trip.rating)}
                  <span className="text-slate-700">{'★'.repeat(5 - trip.rating)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="relative z-10 flex border-t"
          style={{ borderColor: 'rgba(13,148,136,0.3)' }}
        >
          {TABS.map(tab => {
            const href = `/trips/${trip.id}/${tab.suffix}`
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={tab.suffix}
                href={href}
                className={`px-4 py-2 text-[8px] transition-colors border-r last:border-r-0 ${
                  isActive
                    ? 'text-teal-300 border-b-2 border-b-teal-400 bg-teal-950/40'
                    : 'text-slate-500 hover:text-teal-400 hover:bg-teal-950/20'
                }`}
                style={{
                  ...pixelFont,
                  borderRightColor: 'rgba(13,148,136,0.2)',
                  marginBottom: isActive ? -2 : 0,
                }}
              >
                {isActive ? `▶ ${tab.label}` : tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
