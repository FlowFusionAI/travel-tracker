'use client'

import 'leaflet/dist/leaflet.css'
import { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import type { CountryMapData, CityMapData } from '@/lib/types/map'
import CountryLayer from './CountryLayer'
import CityMarkers from './CityMarkers'
import CountrySidebar from './CountrySidebar'
import MapControls from './MapControls'
import MapLegend from './MapLegend'

interface WorldMapProps {
  countries: CountryMapData[]
  cities: CityMapData[]
}

// This component is always rendered client-side (wrapped in dynamic({ ssr: false })
// in MapLoader.tsx), so no mounted check needed here.
export default function WorldMap({ countries, cities }: WorldMapProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryMapData | null>(null)

  return (
    <div className="relative h-screen w-screen">
      <MapContainer
        center={[20, 0]}
        zoom={2.5}
        minZoom={2}
        maxZoom={10}
        className="h-full w-full"
        zoomControl={false}
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        <CountryLayer
          countries={countries}
          onCountryClick={setSelectedCountry}
        />
        <CityMarkers cities={cities} />
        <MapControls />
      </MapContainer>

      {/* Floating overlays (outside MapContainer so they're not inside Leaflet's DOM) */}
      <MapLegend />

      <CountrySidebar
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
      />
    </div>
  )
}
