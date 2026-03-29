import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { listRecords } from '@/lib/airtable'
import type { CountryFields, CityFields, TripFields } from '@/lib/types/airtable'
import type { CountryMapData, CityMapData, TripSummary, CountryStatus } from '@/lib/types/map'
import MapLoader from '@/components/map/MapLoader'

// Fetch fresh on every request — trips have mutable Status fields
export const dynamic = 'force-dynamic'

// Derive a country's map status from the trips linked to it
function deriveCountryStatus(
  countryId: string,
  trips: Array<{ id: string } & TripFields>
): CountryStatus {
  const linked = trips.filter((t) => Array.isArray(t.Country) && t.Country.includes(countryId))
  if (linked.some((t) => t.Status === 'Completed')) return 'visited'
  if (linked.some((t) => t.Status === 'Planned' || t.Status === 'In Progress')) return 'planned'
  if (linked.some((t) => t.Status === 'Wishlist')) return 'wishlist'
  return 'unvisited'
}

export default async function MapPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // Countries and Cities are global (no User link field in schema).
  // Trips are user-scoped — filter by the authenticated user's Airtable record ID.
  const [rawCountries, rawCities, rawTrips] = await Promise.all([
    listRecords('Countries'),
    listRecords('Cities'),
    listRecords('Trips', `{User}="${userId}"`),
  ])

  const countries = rawCountries as unknown as Array<{ id: string } & CountryFields>
  const cities = rawCities as unknown as Array<{ id: string } & CityFields>
  const trips = rawTrips as unknown as Array<{ id: string } & TripFields>

  // Build a lookup for trip summaries by record ID
  const tripSummaryMap = new Map<string, TripSummary>(
    trips.map((t) => [
      t.id,
      {
        id: t.id,
        name: t.Name,
        status: t.Status,
        startDate: t['Start Date'],
        endDate: t['End Date'],
        rating: t.Rating,
      },
    ])
  )

  // Build CountryMapData — only include countries with a valid ISO code
  const countryData: CountryMapData[] = countries
    .filter((c) => c['ISO Code'] && c['ISO Code'] !== '-99')
    .map((c) => ({
      id: c.id,
      name: c.Name,
      isoCode: c['ISO Code'],
      flagEmoji: c['Flag Emoji'],
      continent: c.Continent,
      status: deriveCountryStatus(c.id, trips),
      timesVisited: c['Times Visited'] ?? 0,
      firstVisited: c['First Visited'],
      trips: (c.Trips ?? [])
        .map((tid) => tripSummaryMap.get(tid))
        .filter((t): t is TripSummary => t !== undefined),
    }))

  // Build CityMapData — only cities that have coordinates
  const cityData: CityMapData[] = cities
    .filter((c) => c.Latitude != null && c.Longitude != null)
    .map((c) => ({
      id: c.id,
      name: c.Name,
      latitude: c.Latitude!,
      longitude: c.Longitude!,
      rating: c.Rating,
      timesVisited: c['Times Visited'] ?? 0,
      trips: (c.Trips ?? [])
        .map((tid) => tripSummaryMap.get(tid))
        .filter((t): t is TripSummary => t !== undefined),
    }))

  return <MapLoader countries={countryData} cities={cityData} />
}
