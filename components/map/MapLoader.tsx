'use client'

import dynamicImport from 'next/dynamic'
import type { CountryMapData, CityMapData } from '@/lib/types/map'

// ssr: false is only allowed in Client Components in Next.js 15+
const WorldMap = dynamicImport(() => import('./WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0A0F14]">
      <div className="text-center">
        <p
          className="text-teal-400 text-[10px] animate-pulse mb-4"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          LOADING MAP...
        </p>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-teal-700"
              style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  ),
})

interface MapLoaderProps {
  countries: CountryMapData[]
  cities: CityMapData[]
}

export default function MapLoader({ countries, cities }: MapLoaderProps) {
  return <WorldMap countries={countries} cities={cities} />
}
