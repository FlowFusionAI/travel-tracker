# F2: Trip Workspaces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/trips` magazine-style list page, the `/trips/[id]` workspace shell (hero + tabs), the create/edit trip form with all PRD fields, and cover image upload — matching the approved design spec.

**Architecture:** Server components fetch data (trips, countries, cities) and pass view-model types to client components for filter/sort/interaction. The existing `(dashboard)/layout.tsx` is untouched; trip pages scroll within `h-full overflow-y-auto` inner containers. Cover images use the existing `/api/images` proxy for display and a new `/api/airtable/upload` route for upload via Airtable's Content Upload API.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Airtable SDK (`/lib/airtable.ts`), `browser-image-compression`, NextAuth v5 (`auth()` from `@/auth`).

---

## Airtable Schema Reference (verified via MCP 2026-03-29)

**Base ID:** `appLd7YnCUjWwvZjB`

**Trips** (`tbln8FTdK3DWHBMUo`) key fields:
- `Name` (`fldVAy0AIezf4kO2U`) — singleLineText
- `Status` (`fld2FiDMH0RaMUMkj`) — singleSelect
- `Country` (`fldTF8ZRQGOLw3on7`) — multipleRecordLinks
- `Cities` (`fldu0Tmb0m1ejhFFw`) — multipleRecordLinks
- `Start Date` (`fldus2vnQrg7v8vFS`) — date
- `End Date` (`fldiWUp4BIGNAIBRC`) — date
- `Trip Type` (`fldkto4Bw01YF2ahy`) — singleSelect
- `Category` (`fldpcuJ9oocukxBNS`) — multipleSelects
- `Cover Image` (`fldLdoM3BVe0PUair`) — multipleAttachments ← **field ID needed for upload**
- `summary` (`fldyvFH5Fy0Tia4mQ`) — multilineText (**lowercase** in Airtable — fix type)
- `Rating` (`fldOvXYPAtj7tqkAX`) — rating
- `Budget Spent` (`fldRkrYADKIXl6adn`) — currency
- `User` (`fldg6RBBH3Hy8trcT`) — multipleRecordLinks

**Countries** (`tblHFmThHmDWONt2d`): `Name`, `ISO Code`, `Continent`, `Flag Emoji`, `Times Visited` — trust existing `CountryFields` type (map works).

**Cities** (`tbltFKtyQBBuikhp8`): `Name`, `Country`, `Latitude`, `Longitude`, `Times Visited` — trust existing `CityFields` type (map works).

---

## File Map

**Create:**
- `lib/types/trips.ts` — TripListItem + WorkspaceTrip view-model types
- `app/(dashboard)/trips/page.tsx` — server, trip list
- `app/(dashboard)/trips/new/page.tsx` — server shell → TripForm create
- `app/(dashboard)/trips/[id]/page.tsx` — redirect to /mindmap
- `app/(dashboard)/trips/[id]/layout.tsx` — fetches trip, renders WorkspaceShell
- `app/(dashboard)/trips/[id]/mindmap/page.tsx` — placeholder
- `app/(dashboard)/trips/[id]/itinerary/page.tsx` — placeholder
- `app/(dashboard)/trips/[id]/memories/page.tsx` — placeholder
- `app/(dashboard)/trips/[id]/info/page.tsx` — server shell → TripForm edit
- `app/api/airtable/upload/route.ts` — cover image upload to Airtable
- `components/trips/TripCard.tsx` — featured + small card variants
- `components/trips/TripFilters.tsx` — filter chips + sort dropdown
- `components/trips/TripGrid.tsx` — magazine layout + client filter/sort
- `components/trips/WorkspaceShell.tsx` — hero strip + tab bar
- `components/trips/TripForm.tsx` — shared create/edit form
- `components/trips/CoverImageUpload.tsx` — file picker + upload + preview

**Modify:**
- `lib/types/airtable.ts` — fix `Summary` → `summary` in TripFields

---

## Task 1: Install browser-image-compression

**Files:** `package.json`

- [ ] **Step 1: Install the package**

```bash
cd "C:/Users/saura/Desktop/Personal/travel-tracker" && npm install browser-image-compression
```

Expected output includes: `added 1 package` (or similar). No errors.

- [ ] **Step 2: Verify package.json**

Open `package.json` and confirm `"browser-image-compression"` appears in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add browser-image-compression dependency"
```

---

## Task 2: Fix TripFields type + add trip view-model types

**Files:**
- Modify: `lib/types/airtable.ts`
- Create: `lib/types/trips.ts`

- [ ] **Step 1: Fix the `summary` field name in TripFields**

In `lib/types/airtable.ts`, find this line in `TripFields`:
```typescript
  Summary?: string
```
Change it to:
```typescript
  summary?: string
```

- [ ] **Step 2: Create lib/types/trips.ts**

```typescript
// lib/types/trips.ts
// View-model types used by trip list + workspace components.
// These are plain serialisable shapes built from raw Airtable data in server components.

import type { TripStatus, TripType, TripCategory } from './airtable'

/** Shape used by TripCard + TripGrid (trip list page) */
export interface TripListItem {
  id: string
  name: string
  status: TripStatus
  startDate?: string
  endDate?: string
  rating?: number
  hasCoverImage: boolean      // true if Cover Image attachment exists — render /api/images proxy
  countries: Array<{
    id: string
    name: string
    flagEmoji?: string
  }>
  tripType?: TripType
  category?: TripCategory[]
  summary?: string
}

/** Shape passed to WorkspaceShell + TripForm (workspace pages) */
export interface WorkspaceTrip {
  id: string
  name: string
  status: TripStatus
  startDate?: string
  endDate?: string
  rating?: number
  hasCoverImage: boolean
  countries: Array<{ id: string; name: string; flagEmoji?: string }>
  // Raw linked IDs for form pre-population
  countryIds: string[]
  cityIds: string[]
  tripType?: TripType
  category?: TripCategory[]
  summary?: string
  budgetSpent?: number
}

/** Country option used in TripForm dropdowns */
export interface CountryOption {
  id: string
  name: string
  flagEmoji?: string
}

/** City option used in TripForm dropdowns */
export interface CityOption {
  id: string
  name: string
  countryIds: string[]  // linked country record IDs
}

/** Filter + sort state for the trip list — defined here to avoid circular imports
 *  between TripGrid (imports TripFilters) and TripFilters (needs this type). */
export interface TripFiltersState {
  status: TripStatus | 'All'
  countryId: string
  year: string
  tripType: TripType | ''
  category: TripCategory[]
  sort: 'date_desc' | 'date_asc' | 'rating_desc' | 'modified_desc'
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types/airtable.ts lib/types/trips.ts
git commit -m "feat(f2): add trip view-model types, fix summary field casing"
```

---

## Task 3: Upload API route

**Files:**
- Create: `app/api/airtable/upload/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/airtable/upload/route.ts
// POST /api/airtable/upload?recordId=recXXX&field=Cover+Image
//
// Accepts multipart/form-data with a single "file" entry.
// Uploads to Airtable via the Content Upload API:
//   POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment
//
// Only the "Cover Image" field is supported for now.
// Returns { success: true } or { error: string }.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// Map of human-readable field names → Airtable field IDs (from Trips table)
const SUPPORTED_FIELDS: Record<string, string> = {
  'Cover Image': 'fldLdoM3BVe0PUair',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId')
  const fieldName = searchParams.get('field')

  if (!recordId || !fieldName) {
    return NextResponse.json(
      { error: 'recordId and field query params are required' },
      { status: 400 }
    )
  }

  const fieldId = SUPPORTED_FIELDS[fieldName]
  if (!fieldId) {
    return NextResponse.json(
      { error: `Upload not supported for field: ${fieldName}` },
      { status: 400 }
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'file is required in form data' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const baseId = process.env.AIRTABLE_BASE_ID
  const apiKey = process.env.AIRTABLE_API_KEY

  if (!baseId || !apiKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const uploadUrl = `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldId}/uploadAttachment`

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': file.type || 'image/jpeg',
      'X-Airtable-Client-Secret': apiKey,
    },
    body: buffer,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    console.error('Airtable upload error:', uploadRes.status, errText)
    return NextResponse.json(
      { error: `Airtable upload failed (${uploadRes.status})` },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify the route file exists**

Check `app/api/airtable/upload/route.ts` was created correctly.

- [ ] **Step 3: Commit**

```bash
git add app/api/airtable/upload/route.ts
git commit -m "feat(f2): add cover image upload API route (Airtable Content Upload API)"
```

---

## Task 4: TripCard component

**Files:**
- Create: `components/trips/TripCard.tsx`

- [ ] **Step 1: Create TripCard.tsx**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/trips/TripCard.tsx
git commit -m "feat(f2): add TripCard component (featured + small variants)"
```

---

## Task 5: TripFilters component

**Files:**
- Create: `components/trips/TripFilters.tsx`

- [ ] **Step 1: Create TripFilters.tsx**

```typescript
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
  { value: 'modified_desc', label: 'MODIFIED' },
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
            <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
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
```

- [ ] **Step 2: Commit**

```bash
git add components/trips/TripFilters.tsx
git commit -m "feat(f2): add TripFilters component"
```

---

## Task 6: TripGrid component

**Files:**
- Create: `components/trips/TripGrid.tsx`

- [ ] **Step 1: Create TripGrid.tsx**

```typescript
// components/trips/TripGrid.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import TripCard from './TripCard'
import TripFilters from './TripFilters'
import type { TripListItem, CountryOption, TripFiltersState } from '@/lib/types/trips'
import type { TripStatus, TripType, TripCategory } from '@/lib/types/airtable'

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
```

- [ ] **Step 2: Commit**

```bash
git add components/trips/TripGrid.tsx
git commit -m "feat(f2): add TripGrid component with client-side filter/sort"
```

---

## Task 7: Trip list server page

**Files:**
- Create: `app/(dashboard)/trips/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(dashboard)/trips/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listRecords } from '@/lib/airtable'
import type { TripFields, CountryFields } from '@/lib/types/airtable'
import type { TripListItem, CountryOption } from '@/lib/types/trips'
import TripGrid from '@/components/trips/TripGrid'

export const dynamic = 'force-dynamic'

export default async function TripsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const [rawTrips, rawCountries] = await Promise.all([
    listRecords('Trips', `{User}="${userId}"`),
    listRecords('Countries'),
  ])

  const trips = rawTrips as unknown as Array<{ id: string } & TripFields>
  const countries = rawCountries as unknown as Array<{ id: string } & CountryFields>

  // Build a country lookup map for resolving linked country IDs
  const countryMap = new Map<string, { id: string } & CountryFields>(
    countries.map(c => [c.id, c])
  )

  // Build TripListItem view models
  const tripItems: TripListItem[] = trips.map(t => ({
    id: t.id,
    name: t.Name,
    status: t.Status,
    startDate: t['Start Date'],
    endDate: t['End Date'],
    rating: t.Rating,
    hasCoverImage: Array.isArray(t['Cover Image']) && t['Cover Image'].length > 0,
    countries: (t.Country ?? [])
      .map(cid => countryMap.get(cid))
      .filter((c): c is { id: string } & CountryFields => c !== undefined)
      .map(c => ({ id: c.id, name: c.Name, flagEmoji: c['Flag Emoji'] })),
    tripType: t['Trip Type'],
    category: t.Category,
    summary: t.summary,
  }))

  // Country options for the filter dropdown (only countries that appear in trips)
  const usedCountryIds = new Set(trips.flatMap(t => t.Country ?? []))
  const countryOptions: CountryOption[] = countries
    .filter(c => usedCountryIds.has(c.id))
    .map(c => ({ id: c.id, name: c.Name, flagEmoji: c['Flag Emoji'] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="h-full flex flex-col bg-[#0a0f14] pt-[52px]">
      {/* pt-[52px] clears the floating nav pill */}
      <TripGrid trips={tripItems} countries={countryOptions} />
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify `/trips` renders**

```bash
npm run dev
```

Open `http://localhost:3000/trips`. Should see the filter bar + empty state ("NO TRIPS YET") if no trips exist, or the Valencia trip card if seed data is in Airtable.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/trips/page.tsx
git commit -m "feat(f2): add trip list server page with magazine layout"
```

---

## Task 8: WorkspaceShell component + workspace layout

**Files:**
- Create: `components/trips/WorkspaceShell.tsx`
- Create: `app/(dashboard)/trips/[id]/layout.tsx`

- [ ] **Step 1: Create WorkspaceShell.tsx**

```typescript
// components/trips/WorkspaceShell.tsx
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
```

- [ ] **Step 2: Create app/(dashboard)/trips/[id]/layout.tsx**

```typescript
// app/(dashboard)/trips/[id]/layout.tsx
import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getRecord, listRecords } from '@/lib/airtable'
import type { TripFields, CountryFields } from '@/lib/types/airtable'
import type { WorkspaceTrip } from '@/lib/types/trips'
import WorkspaceShell from '@/components/trips/WorkspaceShell'

export const dynamic = 'force-dynamic'

type LayoutParams = { params: Promise<{ id: string }> }

export default async function TripWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
} & LayoutParams) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  let raw: Record<string, unknown>
  try {
    raw = await getRecord('Trips', id)
  } catch {
    notFound()
  }

  const trip = raw as unknown as { id: string } & TripFields

  // Verify ownership — trip.User is an array of linked record IDs
  if (!Array.isArray(trip.User) || !trip.User.includes(session.user.id)) {
    notFound()
  }

  // Fetch countries to resolve linked country names/flags (cached 1h)
  const rawCountries = await listRecords('Countries')
  const countries = rawCountries as unknown as Array<{ id: string } & CountryFields>
  const countryMap = new Map(countries.map(c => [c.id, c]))

  const workspaceTrip: WorkspaceTrip = {
    id: trip.id,
    name: trip.Name,
    status: trip.Status,
    startDate: trip['Start Date'],
    endDate: trip['End Date'],
    rating: trip.Rating,
    hasCoverImage: Array.isArray(trip['Cover Image']) && trip['Cover Image'].length > 0,
    countries: (trip.Country ?? [])
      .map(cid => countryMap.get(cid))
      .filter((c): c is { id: string } & CountryFields => c !== undefined)
      .map(c => ({ id: c.id, name: c.Name, flagEmoji: c['Flag Emoji'] })),
    countryIds: trip.Country ?? [],
    cityIds: trip.Cities ?? [],
    tripType: trip['Trip Type'],
    category: trip.Category,
    summary: trip.summary,
    budgetSpent: trip['Budget Spent'],
  }

  return <WorkspaceShell trip={workspaceTrip}>{children}</WorkspaceShell>
}
```

- [ ] **Step 3: Commit**

```bash
git add components/trips/WorkspaceShell.tsx "app/(dashboard)/trips/[id]/layout.tsx"
git commit -m "feat(f2): add WorkspaceShell + workspace layout (hero + tabs)"
```

---

## Task 9: Workspace redirect + placeholder tab pages

**Files:**
- Create: `app/(dashboard)/trips/[id]/page.tsx`
- Create: `app/(dashboard)/trips/[id]/mindmap/page.tsx`
- Create: `app/(dashboard)/trips/[id]/itinerary/page.tsx`
- Create: `app/(dashboard)/trips/[id]/memories/page.tsx`

- [ ] **Step 1: Create the redirect page**

```typescript
// app/(dashboard)/trips/[id]/page.tsx
import { redirect } from 'next/navigation'

type PageParams = { params: Promise<{ id: string }> }

export default async function TripPage({ params }: PageParams) {
  const { id } = await params
  redirect(`/trips/${id}/mindmap`)
}
```

- [ ] **Step 2: Create the Mind Map placeholder**

```typescript
// app/(dashboard)/trips/[id]/mindmap/page.tsx
export default function MindMapPage() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0a0f14] relative">
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, #0d9488 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div
        className="relative z-10 pixel-panel px-10 py-8 text-center"
        style={{ maxWidth: 360 }}
      >
        {/* Pixel node-graph icon */}
        <div className="flex items-center justify-center gap-3 mb-6 text-teal-800 text-[10px]" style={{ fontFamily: 'var(--font-pixel)' }}>
          <span className="border border-teal-800 px-2 py-1">A</span>
          <span>──</span>
          <span className="border border-teal-800 px-2 py-1">B</span>
          <span>──</span>
          <span className="border border-teal-800 px-2 py-1">C</span>
        </div>

        <p
          className="text-[10px] text-teal-400 mb-3"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          MIND MAP CANVAS
        </p>
        <p
          className="text-[8px] text-slate-600 mb-4"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          COMING IN F3
        </p>
        <span
          className="text-teal-400 text-[12px]"
          style={{ fontFamily: 'var(--font-pixel)', animation: 'pixel-blink 1s step-end infinite' }}
        >
          █
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create Itinerary placeholder**

```typescript
// app/(dashboard)/trips/[id]/itinerary/page.tsx
export default function ItineraryPage() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0a0f14]">
      <div className="pixel-panel-amber px-10 py-8 text-center" style={{ maxWidth: 360 }}>
        <p className="text-[10px] text-amber-400 mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
          ITINERARY MODE
        </p>
        <p className="text-[8px] text-slate-600" style={{ fontFamily: 'var(--font-pixel)' }}>
          FEATURE COMING SOON
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create Memories placeholder**

```typescript
// app/(dashboard)/trips/[id]/memories/page.tsx
export default function MemoriesPage() {
  return (
    <div className="h-full flex items-center justify-center bg-[#0a0f14]">
      <div className="pixel-panel-violet px-10 py-8 text-center" style={{ maxWidth: 360 }}>
        <p className="text-[10px] text-violet-400 mb-3" style={{ fontFamily: 'var(--font-pixel)' }}>
          MEMORIES
        </p>
        <p className="text-[8px] text-slate-600" style={{ fontFamily: 'var(--font-pixel)' }}>
          FEATURE COMING SOON
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify workspace navigation**

Visit `http://localhost:3000/trips`. Click on a trip card (if seed data exists). Should land on `/trips/[id]/mindmap` with the hero + tab bar. Navigate through the tabs.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/trips/[id]/page.tsx" "app/(dashboard)/trips/[id]/mindmap/page.tsx" "app/(dashboard)/trips/[id]/itinerary/page.tsx" "app/(dashboard)/trips/[id]/memories/page.tsx"
git commit -m "feat(f2): add workspace redirect + placeholder tab pages"
```

---

## Task 10: CoverImageUpload component

**Files:**
- Create: `components/trips/CoverImageUpload.tsx`

- [ ] **Step 1: Create CoverImageUpload.tsx**

```typescript
// components/trips/CoverImageUpload.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import imageCompression from 'browser-image-compression'

interface CoverImageUploadProps {
  recordId: string
  hasExisting: boolean   // true if Cover Image attachment already exists
  onUploadComplete: () => void   // called after successful upload (parent can re-fetch)
  onRemove: () => void           // called when user clicks remove button
}

const pixelFont = { fontFamily: 'var(--font-pixel)' }

export default function CoverImageUpload({
  recordId,
  hasExisting,
  onUploadComplete,
  onRemove,
}: CoverImageUploadProps) {
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const imageUrl = hasExisting
    ? `/api/images?recordId=${recordId}&table=Trips&field=Cover+Image&t=${Date.now()}`
    : null

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.')
      setStatus('error')
      return
    }

    setStatus('compressing')
    setErrorMsg('')

    let compressed: File
    try {
      compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1024,
        fileType: 'image/jpeg',
        useWebWorker: true,
      })
    } catch {
      setErrorMsg('Image compression failed.')
      setStatus('error')
      return
    }

    // Show local preview immediately after compression
    const preview = URL.createObjectURL(compressed)
    setLocalPreview(preview)
    setStatus('uploading')

    const formData = new FormData()
    formData.append('file', compressed, 'cover.jpg')

    try {
      const res = await fetch(
        `/api/airtable/upload?recordId=${recordId}&field=Cover+Image`,
        { method: 'POST', body: formData }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }
      setStatus('idle')
      onUploadComplete()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }, [recordId, onUploadComplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const displayUrl = localPreview ?? imageUrl

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[7px] text-slate-500" style={pixelFont}>COVER IMAGE</p>

      {/* Preview + drop zone */}
      <div
        className="relative border-2 border-dashed border-slate-700 hover:border-teal-700 transition-colors cursor-pointer"
        style={{ minHeight: 120, maxWidth: 300 }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Cover"
            className="w-full object-cover"
            style={{ maxHeight: 180 }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] gap-2">
            <p className="text-[8px] text-slate-600" style={pixelFont}>
              DROP IMAGE HERE
            </p>
            <p className="text-[7px] text-slate-700" style={pixelFont}>
              OR CLICK TO BROWSE
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {(status === 'compressing' || status === 'uploading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
            <p className="text-[8px] text-teal-400" style={pixelFont}>
              {status === 'compressing' ? 'COMPRESSING...' : 'UPLOADING...'}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {status === 'error' && (
        <p className="text-[7px] text-red-400" style={pixelFont}>{errorMsg}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'compressing' || status === 'uploading'}
          className="text-[7px] px-2 py-1 border border-teal-800 text-teal-400 hover:bg-teal-900/30 disabled:opacity-40 transition-colors"
          style={pixelFont}
        >
          {hasExisting || localPreview ? 'CHANGE' : '+ ADD IMAGE'}
        </button>

        {(hasExisting || localPreview) && (
          <button
            type="button"
            onClick={() => {
              setLocalPreview(null)
              onRemove()
            }}
            className="text-[7px] px-2 py-1 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-900 transition-colors"
            style={pixelFont}
          >
            ✕ REMOVE
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/trips/CoverImageUpload.tsx
git commit -m "feat(f2): add CoverImageUpload component"
```

---

## Task 11: TripForm component

**Files:**
- Create: `components/trips/TripForm.tsx`

- [ ] **Step 1: Create TripForm.tsx**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add components/trips/TripForm.tsx
git commit -m "feat(f2): add TripForm component (all PRD fields, create + edit modes)"
```

---

## Task 12: Create trip page

**Files:**
- Create: `app/(dashboard)/trips/new/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(dashboard)/trips/new/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listRecords } from '@/lib/airtable'
import type { CountryFields, CityFields } from '@/lib/types/airtable'
import type { CountryOption, CityOption } from '@/lib/types/trips'
import TripForm from '@/components/trips/TripForm'

export const dynamic = 'force-dynamic'

export default async function NewTripPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [rawCountries, rawCities] = await Promise.all([
    listRecords('Countries'),
    listRecords('Cities'),
  ])

  const countries = rawCountries as unknown as Array<{ id: string } & CountryFields>
  const cities = rawCities as unknown as Array<{ id: string } & CityFields>

  const countryOptions: CountryOption[] = countries
    .map(c => ({ id: c.id, name: c.Name, flagEmoji: c['Flag Emoji'] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const cityOptions: CityOption[] = cities.map(c => ({
    id: c.id,
    name: c.Name,
    countryIds: c.Country ?? [],
  }))

  return (
    <div className="h-full flex flex-col bg-[#0a0f14] pt-[52px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-teal-900/40 bg-slate-950/60 flex-shrink-0">
        <p
          className="text-[9px] text-teal-400"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          NEW TRIP
        </p>
      </div>

      {/* Form */}
      <TripForm
        mode="create"
        userId={session.user.id}
        countries={countryOptions}
        cities={cityOptions}
      />
    </div>
  )
}
```

- [ ] **Step 2: Test create flow**

Open `http://localhost:3000/trips/new`. Fill in Name + Status, click "CREATE TRIP →". Should POST to Airtable and redirect to `/trips/[newId]/mindmap`.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/trips/new/page.tsx"
git commit -m "feat(f2): add create trip page"
```

---

## Task 13: Info tab page

**Files:**
- Create: `app/(dashboard)/trips/[id]/info/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(dashboard)/trips/[id]/info/page.tsx
import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getRecord, listRecords } from '@/lib/airtable'
import type { TripFields, CountryFields, CityFields } from '@/lib/types/airtable'
import type { WorkspaceTrip, CountryOption, CityOption } from '@/lib/types/trips'
import TripForm from '@/components/trips/TripForm'

export const dynamic = 'force-dynamic'

type PageParams = { params: Promise<{ id: string }> }

export default async function TripInfoPage({ params }: PageParams) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  let raw: Record<string, unknown>
  try {
    raw = await getRecord('Trips', id)
  } catch {
    notFound()
  }

  const trip = raw as unknown as { id: string } & TripFields

  if (!Array.isArray(trip.User) || !trip.User.includes(session.user.id)) {
    notFound()
  }

  const [rawCountries, rawCities] = await Promise.all([
    listRecords('Countries'),
    listRecords('Cities'),
  ])

  const countries = rawCountries as unknown as Array<{ id: string } & CountryFields>
  const cities = rawCities as unknown as Array<{ id: string } & CityFields>

  const countryMap = new Map(countries.map(c => [c.id, c]))

  const workspaceTrip: WorkspaceTrip = {
    id: trip.id,
    name: trip.Name,
    status: trip.Status,
    startDate: trip['Start Date'],
    endDate: trip['End Date'],
    rating: trip.Rating,
    hasCoverImage: Array.isArray(trip['Cover Image']) && trip['Cover Image'].length > 0,
    countries: (trip.Country ?? [])
      .map(cid => countryMap.get(cid))
      .filter((c): c is { id: string } & CountryFields => c !== undefined)
      .map(c => ({ id: c.id, name: c.Name, flagEmoji: c['Flag Emoji'] })),
    countryIds: trip.Country ?? [],
    cityIds: trip.Cities ?? [],
    tripType: trip['Trip Type'],
    category: trip.Category,
    summary: trip.summary,
    budgetSpent: trip['Budget Spent'],
  }

  const countryOptions: CountryOption[] = countries
    .map(c => ({ id: c.id, name: c.Name, flagEmoji: c['Flag Emoji'] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const cityOptions: CityOption[] = cities.map(c => ({
    id: c.id,
    name: c.Name,
    countryIds: c.Country ?? [],
  }))

  return (
    <TripForm
      mode="edit"
      userId={session.user.id}
      trip={workspaceTrip}
      countries={countryOptions}
      cities={cityOptions}
    />
  )
}
```

- [ ] **Step 2: Test edit flow**

Navigate to an existing trip → INFO tab. Verify the form is pre-populated with the trip's data. Edit a field and click "SAVE CHANGES". Should see "SAVED ✓" flash. Verify the change persisted in Airtable.

- [ ] **Step 3: Test cover image upload**

In the INFO tab, drop an image onto the upload zone or click "ADD IMAGE". Should compress, upload, and show a preview. Check Airtable to confirm the Cover Image attachment was added.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/trips/[id]/info/page.tsx"
git commit -m "feat(f2): add trip info/edit tab page"
```

---

## Task 14: Smoke test + final commit

- [ ] **Step 1: Build check**

```bash
npm run build
```

Expected: No TypeScript errors, no build failures. Fix any type errors before proceeding.

- [ ] **Step 2: Full smoke test**

With dev server running (`npm run dev`), verify each acceptance criterion:

1. `/trips` — magazine layout renders, filter/sort work client-side
2. Featured trip card shows cover image (or placeholder), name, country flag, dates, status badge
3. Small trip cards render in 2+ column grid
4. "NO TRIPS YET" empty state shows when no trips exist
5. `+ NEW TRIP` button navigates to `/trips/new`
6. Create trip form — fill name + status, submit → redirects to `/trips/[id]/mindmap`
7. `/trips/[id]/mindmap` — placeholder renders with pixel art and blinking cursor
8. `/trips/[id]/itinerary` and `/memories` — empty state placeholders render
9. `/trips/[id]/info` — form pre-populated; save works; "SAVED ✓" appears
10. Cover image upload — compress + upload + preview works in INFO tab
11. Hero strip shows trip name, flag, country, dates, status badge
12. Tab bar highlights active tab correctly when navigating
13. `← TRIPS` back link returns to `/trips`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(f2): complete trip workspaces — list, workspace shell, form, upload"
```
