'use client'

import { useEffect, useRef } from 'react'
import type { CountryMapData, TripSummary } from '@/lib/types/map'
import type { TripStatus } from '@/lib/types/airtable'

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; borderColor: string }> = {
  Completed: {
    label: 'DONE',
    color: 'text-teal-400',
    borderColor: 'border-teal-700',
  },
  Planned: {
    label: 'PLANNED',
    color: 'text-amber-400',
    borderColor: 'border-amber-700',
  },
  'In Progress': {
    label: 'IN PROG',
    color: 'text-blue-400',
    borderColor: 'border-blue-700',
  },
  Wishlist: {
    label: 'WISHLIST',
    color: 'text-violet-400',
    borderColor: 'border-violet-700',
  },
}

const COUNTRY_STATUS_STYLE = {
  visited: { label: 'VISITED', color: 'text-teal-400' },
  planned: { label: 'PLANNED', color: 'text-amber-400' },
  wishlist: { label: 'WISHLIST', color: 'text-violet-400' },
  unvisited: { label: 'UNVISITED', color: 'text-slate-500' },
}

interface CountrySidebarProps {
  country: CountryMapData | null
  onClose: () => void
}

export default function CountrySidebar({ country, onClose }: CountrySidebarProps) {
  const isOpen = country !== null
  const closeRef = useRef(onClose)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  closeRef.current = onClose

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Move focus to close button when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let the CSS transition start
      const timer = setTimeout(() => closeBtnRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <>
      {/* ── Desktop: slide-in panel from right ─────────────────────────────── */}
      <aside
        className={`
          hidden sm:flex flex-col fixed top-0 right-0 h-screen w-80 z-[999]
          bg-slate-950/95 backdrop-blur-sm
          border-l-2 border-teal-700
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-hidden
        `}
        style={{
          boxShadow: isOpen ? '-4px 0 0 0 #0D9488' : 'none',
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
          }}
        />
        <div className="relative z-20 flex flex-col h-full">
          <SidebarContent country={country} onClose={onClose} closeBtnRef={closeBtnRef} />
        </div>
      </aside>

      {/* ── Mobile: bottom sheet ─────────────────────────────────────────────── */}
      <div
        className={`
          sm:hidden fixed bottom-0 left-0 right-0 z-[999] h-[62vh]
          bg-slate-950/98 backdrop-blur-sm
          border-t-2 border-teal-700
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          overflow-hidden
        `}
        style={{
          boxShadow: isOpen ? '0 -4px 0 0 #0D9488' : 'none',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-0.5 bg-teal-800" />
        </div>
        <div className="h-[calc(100%-20px)] overflow-hidden">
          <SidebarContent country={country} onClose={onClose} closeBtnRef={closeBtnRef} />
        </div>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[998] bg-black/40"
          onClick={onClose}
        />
      )}
    </>
  )
}

function SidebarContent({
  country,
  onClose,
  closeBtnRef,
}: {
  country: CountryMapData | null
  onClose: () => void
  closeBtnRef?: React.RefObject<HTMLButtonElement | null>
}) {
  if (!country) return null

  const countryStyle = COUNTRY_STATUS_STYLE[country.status]

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-teal-900/60">
        <div className="flex items-start gap-3">
          {/* Flag */}
          {country.flagEmoji ? (
            <span className="text-3xl leading-none mt-0.5 select-none">
              {country.flagEmoji}
            </span>
          ) : (
            <span className="text-3xl leading-none mt-0.5 text-slate-600 select-none">?</span>
          )}
          <div>
            <h2
              className="text-[10px] text-teal-300 leading-relaxed"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              {country.name.toUpperCase()}
            </h2>
            {country.continent && (
              <p
                className="text-[8px] text-slate-500 mt-1"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                {country.continent.toUpperCase()}
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="
            text-slate-500 hover:text-teal-300
            border border-slate-800 hover:border-teal-700
            text-[9px] px-2 py-1.5 mt-0.5
            transition-colors leading-none
          "
          style={{ fontFamily: 'var(--font-pixel)', boxShadow: '2px 2px 0 0 #1E293B' }}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 border-b border-teal-900/40">
        <StatCell
          label="VISITS"
          value={country.timesVisited > 0 ? `${country.timesVisited}×` : '—'}
          valueClass="text-teal-300"
        />
        <StatCell
          label="FIRST"
          value={country.firstVisited ? country.firstVisited.slice(0, 4) : '—'}
          valueClass="text-slate-300"
          border
        />
        <StatCell
          label="STATUS"
          value={countryStyle.label}
          valueClass={countryStyle.color}
          border
        />
      </div>

      {/* ── Trip list ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          <p
            className="text-[8px] text-slate-600 mb-2"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            TRIPS ─────────────────────
          </p>

          {country.trips.length === 0 ? (
            <div className="py-6 text-center">
              <p
                className="text-[9px] text-slate-700"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                NO TRIPS YET
              </p>
              <p className="text-[10px] text-slate-600 mt-2">Add one in Airtable</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {country.trips.map((trip) => (
                <TripRow key={trip.id} trip={trip} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  valueClass,
  border = false,
}: {
  label: string
  value: string
  valueClass?: string
  border?: boolean
}) {
  return (
    <div className={`px-3 py-3 ${border ? 'border-l border-teal-900/40' : ''}`}>
      <p
        className="text-[7px] text-slate-600 mb-1"
        style={{ fontFamily: 'var(--font-pixel)' }}
      >
        {label}
      </p>
      <p
        className={`text-[10px] ${valueClass ?? 'text-slate-300'}`}
        style={{ fontFamily: 'var(--font-pixel)' }}
      >
        {value}
      </p>
    </div>
  )
}

function TripRow({ trip }: { trip: TripSummary }) {
  const cfg = STATUS_CONFIG[trip.status]

  // Build date range string
  let dateStr = ''
  if (trip.startDate) {
    dateStr = trip.startDate.slice(0, 4)
    if (trip.endDate && trip.endDate.slice(0, 4) !== trip.startDate.slice(0, 4)) {
      dateStr += `–${trip.endDate.slice(0, 4)}`
    }
  }

  return (
    <li
      className="
        border border-slate-800 hover:border-teal-900
        p-2.5 transition-colors cursor-default
      "
      style={{ boxShadow: '2px 2px 0 0 #0F172A' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-slate-200 leading-snug flex-1 min-w-0">
          {trip.name}
        </p>
        <span
          className={`text-[7px] px-1.5 py-0.5 border shrink-0 leading-none ${cfg.color} ${cfg.borderColor}`}
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1.5">
        {dateStr && (
          <span className="text-[9px] text-slate-500">{dateStr}</span>
        )}
        {trip.rating != null && trip.rating > 0 && (
          <span className="text-[10px] text-amber-400">
            {'★'.repeat(trip.rating)}
            <span className="text-slate-700">{'★'.repeat(5 - trip.rating)}</span>
          </span>
        )}
      </div>
    </li>
  )
}
