import type { TripStatus, Continent } from './airtable'

export type CountryStatus = 'visited' | 'planned' | 'wishlist' | 'unvisited'

/** Minimal country data passed to the map client component */
export interface CountryMapData {
  id: string
  name: string
  isoCode: string       // 2-letter ISO code — matches GeoJSON ISO_A2
  flagEmoji?: string
  continent?: Continent
  status: CountryStatus
  timesVisited: number
  firstVisited?: string
  trips: TripSummary[]  // trips linked to this country
}

/** Minimal trip data for display in country sidebar / city popup */
export interface TripSummary {
  id: string
  name: string
  status: TripStatus
  startDate?: string
  endDate?: string
  rating?: number
}

/** Minimal city data passed to the map client component */
export interface CityMapData {
  id: string
  name: string
  latitude: number
  longitude: number
  rating?: number
  timesVisited: number
  trips: TripSummary[]
}
