'use client'

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { useState, useMemo } from 'react'
import { CITY_COORDS, STATE_ABBR_TO_NAME } from '@/data/city-coords'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

export interface MentorForMap {
  id: string
  name: string | null
  username: string
  mentorBio: string | null
  bio: string | null
  skills: string[]
  location: string | null
  hourlyRate: number | null
}

interface CityGroup {
  city: string
  coords: [number, number]
  mentors: MentorForMap[]
}

interface Props {
  mentors: MentorForMap[]
  activeTag: string | null
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function MentorMap({ mentors, activeTag }: Props) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-96, 38],
    zoom: 1,
  })

  const filtered = activeTag
    ? mentors.filter(m => m.skills.includes(activeTag))
    : mentors

  // Group by city, skip if no coords
  const cityGroups = useMemo<CityGroup[]>(() => {
    const map: Record<string, MentorForMap[]> = {}
    for (const m of filtered) {
      if (!m.location) continue
      const key = m.location.trim()
      if (!CITY_COORDS[key]) continue
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return Object.entries(map).map(([city, ms]) => ({
      city,
      coords: CITY_COORDS[city],
      mentors: ms,
    }))
  }, [filtered])

  // States that have mentors (for highlighting)
  const statesWithMentors = useMemo(() => {
    const names = new Set<string>()
    for (const m of filtered) {
      if (!m.location) continue
      const parts = m.location.trim().split(', ')
      const abbr = parts[parts.length - 1]
      const name = STATE_ABBR_TO_NAME[abbr]
      if (name) names.add(name)
    }
    return names
  }, [filtered])

  const selectedMentors = selectedCity
    ? cityGroups.find(g => g.city === selectedCity)?.mentors ?? []
    : []

  function handleZoomIn() {
    setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))
  }
  function handleZoomOut() {
    setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))
  }
  function handleReset() {
    setPosition({ coordinates: [-96, 38], zoom: 1 })
    setSelectedCity(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Map */}
        <div className="flex-1 relative bg-blueprint-paper/20 border border-blueprint-grid">
          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            <button onClick={handleZoomIn} className="w-8 h-8 bg-blueprint-bg border border-blueprint-grid text-neon-cyan hover:border-neon-cyan flex items-center justify-center text-lg font-bold">+</button>
            <button onClick={handleZoomOut} className="w-8 h-8 bg-blueprint-bg border border-blueprint-grid text-neon-cyan hover:border-neon-cyan flex items-center justify-center text-lg font-bold">−</button>
            <button onClick={handleReset} className="w-8 h-8 bg-blueprint-bg border border-blueprint-grid text-gray-400 hover:border-gray-400 flex items-center justify-center text-xs">⟳</button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-10 text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neon-cyan opacity-80" />
              <span>Mentors available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-safety-yellow opacity-80" />
              <span>Selected city</span>
            </div>
          </div>

          <ComposableMap
            projection="geoAlbersUsa"
            style={{ width: '100%', height: 'auto' }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={({ coordinates, zoom }) =>
                setPosition({ coordinates: coordinates as [number, number], zoom })
              }
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const stateName: string = geo.properties.name
                    const hasMentors = statesWithMentors.has(stateName)
                    const isHovered = hoveredState === stateName
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          isHovered
                            ? hasMentors ? '#00e5ff18' : '#ffffff08'
                            : hasMentors ? '#0d2f20' : '#12192e'
                        }
                        stroke="#2a3f5f"
                        strokeWidth={0.5}
                        onMouseEnter={() => setHoveredState(stateName)}
                        onMouseLeave={() => setHoveredState(null)}
                        style={{
                          default: { outline: 'none' },
                          hover: { outline: 'none' },
                          pressed: { outline: 'none' },
                        }}
                      />
                    )
                  })
                }
              </Geographies>

              {cityGroups.map(group => {
                const isSelected = selectedCity === group.city
                const count = group.mentors.length
                const r = Math.min(5 + count * 3, 18)
                return (
                  <Marker
                    key={group.city}
                    coordinates={group.coords}
                    onClick={() => setSelectedCity(isSelected ? null : group.city)}
                  >
                    <circle
                      r={r}
                      fill={isSelected ? '#facc15' : '#00e5ff'}
                      fillOpacity={isSelected ? 1 : 0.85}
                      stroke={isSelected ? '#fbbf24' : '#0a0e1a'}
                      strokeWidth={isSelected ? 2 : 1}
                      style={{ cursor: 'pointer' }}
                    />
                    <text
                      textAnchor="middle"
                      y={r * 0.35}
                      style={{
                        fontSize: `${Math.max(6, r * 0.7)}px`,
                        fill: '#0a0e1a',
                        fontWeight: 'bold',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    >
                      {count}
                    </text>
                  </Marker>
                )
              })}
            </ZoomableGroup>
          </ComposableMap>

          {hoveredState && (
            <div className="absolute top-3 left-3 z-10 text-xs bg-blueprint-bg border border-blueprint-grid px-2 py-1 text-gray-300">
              {hoveredState}
              {statesWithMentors.has(hoveredState) && (
                <span className="text-safety-green ml-1">• mentors</span>
              )}
            </div>
          )}
        </div>

        {/* Selected city mentor panel */}
        {selectedCity && selectedMentors.length > 0 && (
          <div className="lg:w-80 border border-blueprint-grid bg-blueprint-paper/10">
            <div className="p-3 border-b border-blueprint-grid flex justify-between items-center">
              <div>
                <p className="font-bold text-safety-yellow text-sm">{selectedCity}</p>
                <p className="text-xs text-gray-400">{selectedMentors.length} mentor{selectedMentors.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setSelectedCity(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="overflow-y-auto max-h-80 lg:max-h-[420px]">
              {selectedMentors.map(mentor => (
                <div key={mentor.id} className="p-3 border-b border-blueprint-grid/50 hover:bg-blueprint-paper/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blueprint-paper rounded-full flex items-center justify-center text-safety-green font-bold text-sm shrink-0">
                      {initials(mentor.name || mentor.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{mentor.name || mentor.username}</p>
                      <p className="text-xs text-gray-500">@{mentor.username}</p>
                    </div>
                    {mentor.hourlyRate && (
                      <span className="text-xs text-neon-cyan font-semibold shrink-0">${mentor.hourlyRate}/hr</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    {mentor.mentorBio || mentor.bio || 'No bio yet.'}
                  </p>
                  {mentor.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mentor.skills.slice(0, 4).map(s => (
                        <span key={s} className="tag text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                  <button className="btn-primary text-xs w-full mt-3 py-1.5">Book Session</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No mentors in filtered result */}
      {cityGroups.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border border-blueprint-grid/50">
          {activeTag
            ? `No mentors with tag "${activeTag}" have location data yet.`
            : 'No mentors with mapped locations yet. Be the first to enable mentor mode.'}
        </div>
      )}
    </div>
  )
}
