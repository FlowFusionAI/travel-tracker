// components/trips/TripFilters.tsx
'use client'

import Link from 'next/link'
import type { TripStatus, TripType, TripCategory } from '@/lib/types/airtable'
import type { TripFiltersState } from '@/lib/types/trips'

interface TripFiltersProps {
  filters: TripFiltersState
  onChange: (f: TripFiltersState) => void
  countryOptions: Array<{ id: string; name: string }>
  yearOptions: number[]
}

const STATUS_OPTIONS: Array<TripStatus | 'All'> = [
  'All', 'Completed', 'Planned', 'In Progress', 'Wishlist',
]
const STATUS_LABELS: Record<TripStatus | 'All', string> = {
  All: 'ALL', Completed: 'DONE', Planned: 'PLANNED', 'In Progress': 'IN PROG', Wishlist: 'WISHLIST',
}
const STATUS_ACTIVE_COLOR: Record<TripStatus | 'All', string> = {
  All: 'text-teal-300 border-teal-600 bg-teal-900/30',
  Completed: 'text-teal-300 border-teal-600 bg-teal-900/30',
  Planned: 'text-amber-300 border-amber-700 bg-amber-900/20',
  'In Progress': 'text-blue-300 border-blue-700 bg-blue-900/20',
  Wishlist: 'text-violet-300 border-violet-700 bg-violet-900/20',
}

const TRIP_TYPE_OPTIONS: TripType[] = ['Solo', 'Group', 'Couple', 'Family', 'Work']
const CATEGORY_OPTIONS: TripCategory[] = [
  'Culture', 'Adventure', 'Food', 'Relaxation', 'Festival', 'City Break',
]
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'DATE ↓' },
  { value: 'date_asc', label: 'DATE ↑' },
  { value: 'rating_desc', label: 'RATING ↓' },
] as const

const pixelFont = { fontFamily: 'var(--font-pixel)' }
const inactiveChip = 'text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300'

export default function TripFilters({
  filters,
  onChange,
  countryOptions,
  yearOptions,
}: TripFiltersProps) {
  const isFiltered =
    filters.status !== 'All' ||
    filters.countryId !== '' ||
    filters.year !== '' ||
    filters.tripType !== '' ||
    filters.category.length > 0

  function set<K extends keyof TripFiltersState>(key: K, value: TripFiltersState[K]) {
    onChange({ ...filters, [key]: value })
  }

  function toggleCategory(cat: TripCategory) {
    const next = filters.category.includes(cat)
      ? filters.category.filter(c => c !== cat)
      : [...filters.category, cat]
    set('category', next)
  }

  function clear() {
    onChange({ status: 'All', countryId: '', year: '', tripType: '', category: [], sort: filters.sort })
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-b border-teal-900/40 bg-slate-950/60">
      {/* Row 1: Status chips + Sort + New trip button */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[7px] text-slate-600 mr-1 shrink-0" style={pixelFont}>
          STATUS:
        </span>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => set('status', s)}
            className={`text-[7px] px-2 py-1 border transition-colors leading-none ${
              filters.status === s ? STATUS_ACTIVE_COLOR[s] : inactiveChip
            }`}
            style={{ ...pixelFont, boxShadow: '2px 2px 0 0 #0F172A' }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Sort */}
          <select
            value={filters.sort}
            onChange={e => set('sort', e.target.value as TripFiltersState['sort'])}
            className="text-[7px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-1 appearance-none cursor-pointer"
            style={pixelFont}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* New trip */}
          <Link
            href="/trips/new"
            className="text-[7px] px-3 py-1.5 bg-teal-900/60 text-teal-300 border border-teal-700 hover:bg-teal-800/60 transition-colors leading-none"
            style={{ ...pixelFont, boxShadow: '2px 2px 0 0 #0D4040' }}
          >
            + NEW TRIP
          </Link>
        </div>
      </div>

      {/* Row 2: Country / Year / Type / Category filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Country */}
        <select
          value={filters.countryId}
          onChange={e => set('countryId', e.target.value)}
          className="text-[7px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 appearance-none cursor-pointer"
          style={pixelFont}
        >
          <option value="">ALL COUNTRIES</option>
          {countryOptions.map(c => (
            <option key={c.id} value={c.id}>{(c.name ?? '').toUpperCase()}</option>
          ))}
        </select>

        {/* Year */}
        <select
          value={filters.year}
          onChange={e => set('year', e.target.value)}
          className="text-[7px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 appearance-none cursor-pointer"
          style={pixelFont}
        >
          <option value="">ALL YEARS</option>
          {yearOptions.map(y => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>

        {/* Trip Type */}
        <select
          value={filters.tripType}
          onChange={e => set('tripType', e.target.value as TripType | '')}
          className="text-[7px] bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 appearance-none cursor-pointer"
          style={pixelFont}
        >
          <option value="">ALL TYPES</option>
          {TRIP_TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>

        {/* Category chips */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_OPTIONS.map(cat => {
            const active = filters.category.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`text-[6px] px-1.5 py-0.5 border transition-colors leading-none ${
                  active ? 'text-teal-300 border-teal-600 bg-teal-900/30' : inactiveChip
                }`}
                style={{ ...pixelFont, boxShadow: '1px 1px 0 0 #0F172A' }}
              >
                {cat.toUpperCase()}
              </button>
            )
          })}
        </div>

        {/* Clear */}
        {isFiltered && (
          <button
            type="button"
            onClick={clear}
            className="text-[7px] text-slate-500 hover:text-teal-400 border border-slate-800 px-2 py-0.5 transition-colors"
            style={pixelFont}
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  )
}
