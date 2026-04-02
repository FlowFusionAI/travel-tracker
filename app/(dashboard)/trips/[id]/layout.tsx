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
      .map(c => ({ id: c.id, name: c.name, flagEmoji: c['Flag Emoji'] })),
    countryIds: trip.Country ?? [],
    cityIds: trip.Cities ?? [],
    tripType: trip['Trip Type'],
    category: trip.Category,
    summary: trip.summary,
    budgetSpent: trip['Budget Spent'],
  }

  return <WorkspaceShell trip={workspaceTrip}>{children}</WorkspaceShell>
}
