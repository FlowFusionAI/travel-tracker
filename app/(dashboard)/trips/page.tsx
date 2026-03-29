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
    listRecords('Trips'),
    listRecords('Countries'),
  ])

  const allTrips = rawTrips as unknown as Array<{ id: string } & TripFields>
  const countries = rawCountries as unknown as Array<{ id: string } & CountryFields>

  // Filter trips by current user (User is a linked records array of IDs)
  const trips = allTrips.filter(t => Array.isArray(t.User) && t.User.includes(userId))

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
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))

  return (
    <div className="h-full flex flex-col bg-[#0a0f14] pt-[52px]">
      {/* pt-[52px] clears the floating nav pill */}
      <TripGrid trips={tripItems} countries={countryOptions} />
    </div>
  )
}
