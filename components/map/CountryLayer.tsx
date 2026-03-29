'use client'

import { useEffect, useRef, useState } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import type { GeoJsonObject, Feature } from 'geojson'
import type { PathOptions, Layer, Path, LeafletMouseEvent } from 'leaflet'
import type { CountryMapData, CountryStatus } from '@/lib/types/map'

function getPathOptions(status: CountryStatus): PathOptions {
  switch (status) {
    case 'visited':
      return {
        fillColor: '#0F766E',
        fillOpacity: 0.78,
        color: '#0D9488',
        weight: 1,
      }
    case 'planned':
      return {
        // References the SVG <pattern> injected in useEffect below
        fillColor: 'url(#planned-stripe)',
        fillOpacity: 1,
        color: '#D97706',
        weight: 1.5,
      }
    case 'wishlist':
      return {
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#7C3AED',
        weight: 2,
        dashArray: '6 4',
      }
    default: // unvisited
      return {
        fillColor: '#0F172A',
        fillOpacity: 0.12,
        color: '#1E293B',
        weight: 0.5,
      }
  }
}

interface CountryLayerProps {
  countries: CountryMapData[]
  onCountryClick: (country: CountryMapData) => void
}

export default function CountryLayer({ countries, onCountryClick }: CountryLayerProps) {
  const map = useMap()
  const patternInjected = useRef(false)
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null)
  const [geoError, setGeoError] = useState(false)

  // Fetch GeoJSON lazily from public/data/ — avoids Turbopack JSON import issues
  useEffect(() => {
    fetch('/data/countries.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: GeoJsonObject) => setGeoData(data))
      .catch((err) => {
        console.error('Failed to load countries.geojson:', err)
        setGeoError(true)
      })
  }, [])

  // Build ISO → country data lookup
  const countryByIso = new Map<string, CountryMapData>(
    countries.map((c) => [c.isoCode, c])
  )

  // Inject SVG stripe <pattern> into Leaflet's overlay SVG pane for Planned fill
  useEffect(() => {
    function injectPattern() {
      if (patternInjected.current) return
      const overlayPane = map.getPanes().overlayPane
      if (!overlayPane) return
      const svgEl = overlayPane.querySelector('svg')
      if (!svgEl) return
      if (svgEl.querySelector('#planned-stripe')) {
        patternInjected.current = true
        return
      }
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      defs.innerHTML = `
        <pattern id="planned-stripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45 0 0)">
          <rect width="8" height="8" fill="#78350F" fill-opacity="0.4"/>
          <line x1="0" y1="0" x2="0" y2="8" stroke="#D97706" stroke-width="3" stroke-opacity="0.65"/>
        </pattern>
      `
      svgEl.insertBefore(defs, svgEl.firstChild)
      patternInjected.current = true
    }

    injectPattern()
    map.on('layeradd', injectPattern)
    return () => {
      map.off('layeradd', injectPattern)
    }
  }, [map])

  function style(feature: Feature | undefined): PathOptions {
    const rawIso = feature?.properties?.ISO_A2
    const iso = typeof rawIso === 'string' ? rawIso : undefined
    if (!iso || iso === '-99') return getPathOptions('unvisited')
    const country = countryByIso.get(iso)
    return getPathOptions(country?.status ?? 'unvisited')
  }

  function onEachFeature(feature: Feature, layer: Layer) {
    const rawIso = feature.properties?.ISO_A2
    const iso = typeof rawIso === 'string' ? rawIso : undefined
    if (!iso || iso === '-99') return
    const country = countryByIso.get(iso)
    if (!country) return

    layer.on({
      click: (_e: LeafletMouseEvent) => {
        onCountryClick(country)
      },
      mouseover: (e: LeafletMouseEvent) => {
        const path = e.target as Path
        const base = getPathOptions(country.status)
        path.setStyle({
          ...base,
          weight: 2,
          fillOpacity: Math.min((base.fillOpacity ?? 0.5) + 0.15, 1),
        })
        path.bringToFront()
      },
      mouseout: (e: LeafletMouseEvent) => {
        const path = e.target as Path
        path.setStyle(style(feature))
      },
    })
  }

  // GeoJSON failed to load — map still renders (just without country fills)
  if (geoError) return null
  if (!geoData) return null

  return (
    <GeoJSON
      key={countries.map((c) => c.id).join(',')}
      data={geoData}
      style={style}
      onEachFeature={onEachFeature}
    />
  )
}
