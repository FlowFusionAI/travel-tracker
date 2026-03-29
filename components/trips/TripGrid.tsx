// components/trips/TripGrid.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import TripCard from './TripCard'
import TripFilters from './TripFilters'
import type { TripListItem, CountryOption, TripFiltersState } from '@/lib/types/trips'

interface TripGridProps {
  trips: TripListItem[]
  countries: CountryOption[]
}

function applyFilters(trips: TripListItem[], f: TripFiltersState): TripListItem[] {
  let result = [...trips]

  if (f.status !== 'All') result = result.filter(t => t.status === f.status)
  if (f.countryId) result = result.filter(t => t.countries.some(c => c.id === f.countryId))
  if (f.year) result = result.filter(t => t.startDate?.startsWith(f.year))
  if (f.tripType) result = result.filter(t => t.tripType === f.tripType)
  if (f.category.length > 0) {
    result = result.filter(t =>
      f.category.every(cat => t.category?.includes(cat))
    )
  }

  result.sort((a, b) => {
    if (f.sort === 'date_desc') {
      return (b.startDate ?? '').localeCompare(a.startDate ?? '')
    }
    if (f.sort === 'date_asc') {
      return (a.startDate ?? '').localeCompare(b.startDate ?? '')
    }
    if (f.sort === 'rating_desc') {
      return (b.rating ?? 0) - (a.rating ?? 0)
    }
    // modified_desc — no modified field in view model; fall back to date_desc
    return (b.startDate ?? '').localeCompare(a.startDate ?? '')
  })

  return result
}

export default function TripGrid({ trips, countries }: TripGridProps) {
  const [filters, setFilters] = useState<TripFiltersState>({
    status: 'All',
    countryId: '',
    year: '',
    tripType: '',
    category: [],
    sort: 'date_desc',
  })

  const filtered = useMemo(() => applyFilters(trips, filters), [trips, filters])

  // Year options derived from actual trip dates
  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    trips.forEach(t => {
      if (t.startDate) years.add(parseInt(t.startDate.slice(0, 4), 10))
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [trips])

  const [featured, ...rest] = filtered

  return (
    <div className="h-full overflow-y-auto">
      <TripFilters
        filters={filters}
        onChange={setFilters}
        countryOptions={countries}
        yearOptions={yearOptions}
      />

      <div className="p-4">
        {filtered.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="pixel-panel px-8 py-10 text-center"
              style={{ maxWidth: 400 }}
            >
              <p
                className="text-[10px] text-teal-400 mb-4"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                NO TRIPS YET
              </p>
              {trips.length === 0 ? (
                <Link
                  href="/trips/new"
                  className="text-[8px] text-teal-300 border border-teal-700 px-4 py-2 hover:bg-teal-900/40 transition-colors inline-block"
                  style={{ fontFamily: 'var(--font-pixel)', boxShadow: '2px 2px 0 0 #0D4040' }}
                >
                  + ADD YOUR FIRST TRIP →
                </Link>
              ) : (
                <p className="text-[8px] text-slate-600" style={{ fontFamily: 'var(--font-pixel)' }}>
                  NO RESULTS FOR CURRENT FILTERS
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Featured card */}
            <TripCard trip={featured} variant="featured" />

            {/* Small cards grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {rest.map(trip => (
                  <TripCard key={trip.id} trip={trip} variant="small" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
