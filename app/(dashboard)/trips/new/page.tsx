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
    .map(c => ({ id: c.id, name: c.name, flagEmoji: c['Flag Emoji'] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const cityOptions: CityOption[] = cities.map(c => ({
    id: c.id,
    name: c.name,
    countryIds: c.country ?? [],
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
