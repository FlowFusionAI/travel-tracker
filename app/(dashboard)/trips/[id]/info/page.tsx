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
      .map(c => ({ id: c.id, name: c.name, flagEmoji: c['Flag Emoji'] })),
    countryIds: trip.Country ?? [],
    cityIds: trip.Cities ?? [],
    tripType: trip['Trip Type'],
    category: trip.Category,
    summary: trip.summary,
    budgetSpent: trip['Budget Spent'],
  }

  const countryOptions: CountryOption[] = countries
    .map(c => ({ id: c.id, name: c.name, flagEmoji: c['Flag Emoji'] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const cityOptions: CityOption[] = cities.map(c => ({
    id: c.id,
    name: c.name,
    countryIds: c.country ?? [],
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
