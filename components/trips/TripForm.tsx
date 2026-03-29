// components/trips/TripForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import CoverImageUpload from './CoverImageUpload'
import type { TripStatus, TripType, TripCategory } from '@/lib/types/airtable'
import type { WorkspaceTrip, CountryOption, CityOption } from '@/lib/types/trips'

interface TripFormProps {
  mode: 'create' | 'edit'
  userId: string
  trip?: WorkspaceTrip        // edit mode only
  countries: CountryOption[]
  cities: CityOption[]
}

const STATUS_OPTIONS: TripStatus[] = ['Completed', 'Planned', 'In Progress', 'Wishlist']
const TRIP_TYPE_OPTIONS: TripType[] = ['Solo', 'Group', 'Couple', 'Family', 'Work']
const CATEGORY_OPTIONS: TripCategory[] = [
  'Culture', 'Adventure', 'Food', 'Relaxation', 'Festival', 'City Break',
]

const STATUS_COLORS: Record<TripStatus, string> = {
  Completed: 'text-teal-300 border-teal-600 bg-teal-900/30',
  Planned: 'text-amber-300 border-amber-700 bg-amber-900/20',
  'In Progress': 'text-blue-300 border-blue-700 bg-blue-900/20',
  Wishlist: 'text-violet-300 border-violet-700 bg-violet-900/20',
}

const pixelFont = { fontFamily: 'var(--font-pixel)' }
const inputClass =
  'w-full bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 text-[11px] focus:border-teal-700 focus:outline-none transition-colors'
const labelClass = 'text-[7px] text-slate-500 mb-1 block'
const inactiveChip =
  'text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300'

export default function TripForm({ mode, userId, trip, countries, cities }: TripFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [hasCoverImage, setHasCoverImage] = useState(trip?.hasCoverImage ?? false)

  // Form state
  const [name, setName] = useState(trip?.name ?? '')
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? 'Planned')
  const [startDate, setStartDate] = useState(trip?.startDate ?? '')
  const [endDate, setEndDate] = useState(trip?.endDate ?? '')
  const [tripType, setTripType] = useState<TripType | ''>(trip?.tripType ?? '')
  const [category, setCategory] = useState<TripCategory[]>(trip?.category ?? [])
  const [countryIds, setCountryIds] = useState<string[]>(trip?.countryIds ?? [])
  const [cityIds, setCityIds] = useState<string[]>(trip?.cityIds ?? [])
  const [summary, setSummary] = useState(trip?.summary ?? '')
  const [rating, setRating] = useState(trip?.rating ?? 0)
  const [budgetSpent, setBudgetSpent] = useState(
    trip?.budgetSpent != null ? String(trip.budgetSpent) : ''
  )

  // Cities filtered by selected countries
  const filteredCities = countryIds.length === 0
    ? cities
    : cities.filter(c => c.countryIds.some(cid => countryIds.includes(cid)))

  function toggleCategory(cat: TripCategory) {
    setCategory(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function toggleCountry(id: string) {
    setCountryIds(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      // Remove cities that no longer belong to any selected country
      if (!next.includes(id)) {
        const removedCityIds = cities
          .filter(c => c.countryIds.includes(id) && !c.countryIds.some(cid => next.includes(cid)))
          .map(c => c.id)
        setCityIds(prevCities => prevCities.filter(cid => !removedCityIds.includes(cid)))
      }
      return next
    })
  }

  function toggleCity(id: string) {
    setCityIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !status) return

    setSaveStatus('saving')
    setErrorMsg('')

    const fields: Record<string, unknown> = {
      Name: name.trim(),
      Status: status,
    }
    if (startDate) fields['Start Date'] = startDate
    if (endDate) fields['End Date'] = endDate
    if (tripType) fields['Trip Type'] = tripType
    if (category.length > 0) fields['Category'] = category
    if (countryIds.length > 0) fields['Country'] = countryIds
    if (cityIds.length > 0) fields['Cities'] = cityIds
    if (summary.trim()) fields['summary'] = summary.trim()
    if (rating > 0) fields['Rating'] = rating
    const budgetNum = parseFloat(budgetSpent)
    if (!isNaN(budgetNum) && budgetNum > 0) fields['Budget Spent'] = budgetNum

    try {
      if (mode === 'create') {
        fields['User'] = [userId]
        const res = await fetch('/api/airtable/Trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        if (!res.ok) throw new Error('Failed to create trip')
        const created = await res.json()
        startTransition(() => router.push(`/trips/${created.id}/mindmap`))
      } else {
        // Edit mode
        const res = await fetch('/api/airtable/Trips', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: trip!.id, ...fields }),
        })
        if (!res.ok) throw new Error('Failed to save trip')
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
        // Refresh server component data
        startTransition(() => router.refresh())
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed')
      setSaveStatus('error')
    }
  }

  async function handleRemoveCoverImage() {
    if (!trip) return
    try {
      await fetch('/api/airtable/Trips', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trip.id, 'Cover Image': [] }),
      })
      setHasCoverImage(false)
    } catch {
      // silently fail — user can try again
    }
  }

  const canSubmit = name.trim().length > 0 && status !== undefined

  return (
    <form onSubmit={handleSubmit} className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Name */}
        <div>
          <label className={labelClass} style={pixelFont}>TRIP NAME *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Valencia — Las Fallas 2025"
            required
            className={inputClass}
            style={{ boxShadow: '2px 2px 0 0 #0F172A' }}
          />
        </div>

        {/* Status */}
        <div>
          <label className={labelClass} style={pixelFont}>STATUS *</label>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-[7px] px-3 py-1.5 border transition-colors leading-none ${
                  status === s ? STATUS_COLORS[s] : inactiveChip
                }`}
                style={{ ...pixelFont, boxShadow: '2px 2px 0 0 #0F172A' }}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={pixelFont}>START DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} style={pixelFont}>END DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Trip Type */}
        <div>
          <label className={labelClass} style={pixelFont}>TRIP TYPE</label>
          <div className="flex gap-2 flex-wrap">
            {TRIP_TYPE_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTripType(tripType === t ? '' : t)}
                className={`text-[7px] px-2 py-1 border transition-colors leading-none ${
                  tripType === t
                    ? 'text-teal-300 border-teal-600 bg-teal-900/30'
                    : inactiveChip
                }`}
                style={{ ...pixelFont, boxShadow: '2px 2px 0 0 #0F172A' }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className={labelClass} style={pixelFont}>CATEGORY</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`text-[7px] px-2 py-1 border transition-colors leading-none ${
                  category.includes(cat)
                    ? 'text-teal-300 border-teal-600 bg-teal-900/30'
                    : inactiveChip
                }`}
                style={{ ...pixelFont, boxShadow: '2px 2px 0 0 #0F172A' }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Countries */}
        <div>
          <label className={labelClass} style={pixelFont}>COUNTRIES</label>
          <div className="border border-slate-800 max-h-40 overflow-y-auto p-2 space-y-1">
            {countries.length === 0 ? (
              <p className="text-[8px] text-slate-600 p-1" style={pixelFont}>
                No countries in Airtable yet
              </p>
            ) : (
              countries.map(c => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={countryIds.includes(c.id)}
                    onChange={() => toggleCountry(c.id)}
                    className="accent-teal-500"
                  />
                  <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">
                    {c.flagEmoji} {c.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Cities */}
        <div>
          <label className={labelClass} style={pixelFont}>CITIES</label>
          <div className="border border-slate-800 max-h-40 overflow-y-auto p-2 space-y-1">
            {filteredCities.length === 0 ? (
              <p className="text-[8px] text-slate-600 p-1" style={pixelFont}>
                {countryIds.length > 0
                  ? 'No cities linked to selected countries'
                  : 'Select a country to filter cities'}
              </p>
            ) : (
              filteredCities.map(c => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={cityIds.includes(c.id)}
                    onChange={() => toggleCity(c.id)}
                    className="accent-teal-500"
                  />
                  <span className="text-[10px] text-slate-300 group-hover:text-white transition-colors">
                    {c.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className={labelClass} style={pixelFont}>SUMMARY</label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="A brief description or highlight..."
            rows={3}
            className={`${inputClass} resize-none`}
            style={{ boxShadow: '2px 2px 0 0 #0F172A' }}
          />
        </div>

        {/* Rating */}
        <div>
          <label className={labelClass} style={pixelFont}>RATING</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? 0 : n)}
                className={`text-xl leading-none transition-colors ${
                  n <= rating ? 'text-amber-400' : 'text-slate-700'
                } hover:text-amber-300`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className={labelClass} style={pixelFont}>BUDGET SPENT</label>
          <div className="flex items-center gap-0">
            <span
              className="bg-slate-800 border border-slate-700 border-r-0 px-2 py-2 text-slate-400 text-[11px]"
            >
              £
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetSpent}
              onChange={e => setBudgetSpent(e.target.value)}
              placeholder="0.00"
              className={`${inputClass} flex-1`}
              style={{ borderLeft: 'none' }}
            />
          </div>
        </div>

        {/* Cover Image — edit mode only */}
        {mode === 'edit' && trip && (
          <CoverImageUpload
            recordId={trip.id}
            hasExisting={hasCoverImage}
            onUploadComplete={() => {
              setHasCoverImage(true)
              startTransition(() => router.refresh())
            }}
            onRemove={handleRemoveCoverImage}
          />
        )}

        {/* Save status + submit */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
          <button
            type="submit"
            disabled={!canSubmit || saveStatus === 'saving' || isPending}
            className={`text-[8px] px-6 py-2 border transition-colors disabled:opacity-40 ${
              canSubmit
                ? 'text-teal-300 border-teal-700 bg-teal-900/40 hover:bg-teal-800/40'
                : 'text-slate-600 border-slate-800'
            }`}
            style={{ ...pixelFont, boxShadow: '2px 2px 0 0 #0D4040' }}
          >
            {saveStatus === 'saving' || isPending
              ? 'SAVING...'
              : mode === 'create'
              ? 'CREATE TRIP →'
              : 'SAVE CHANGES'}
          </button>

          {saveStatus === 'saved' && (
            <span className="text-[8px] text-teal-400 flicker-in" style={pixelFont}>
              SAVED ✓
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[8px] text-red-400" style={pixelFont}>
              {errorMsg || 'SAVE FAILED'}
            </span>
          )}
        </div>
      </div>
    </form>
  )
}
