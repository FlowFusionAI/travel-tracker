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
  sort: 'date_desc' | 'date_asc' | 'rating_desc'
}
