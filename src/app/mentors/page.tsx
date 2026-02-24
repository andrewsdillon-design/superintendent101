'use client'

import Link from 'next/link'
import MobileNav from '@/components/mobile-nav'
import { useEffect, useState } from 'react'

interface Mentor {
  id: string
  name: string | null
  username: string
  mentorBio: string | null
  bio: string | null
  skills: string[]
  hourlyRate: number | null
  location: string | null
  yearsExperience: number | null
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (locationFilter) params.set('location', locationFilter)
    if (skillFilter) params.set('skill', skillFilter)

    fetch(`/api/mentors?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setMentors(data.mentors ?? [])
        setLoading(false)
      })
  }, [locationFilter, skillFilter])

  const displayed = mentors.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      m.location?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400">Feed</Link>
              <Link href="/mentors" className="text-white font-semibold">Mentors</Link>
              <Link href="/projects" className="text-gray-400">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400">Dust Logs</Link>
            </nav>
          </div>
          <Link href="/profile" className="text-sm text-gray-400">Profile</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-safety-green">MENTORS</h1>
          <p className="text-gray-400 mt-2">Book 1-on-1 sessions. Pay in USDC. No corporate fluff.</p>
        </div>

        <div className="card mb-6 grid md:grid-cols-3 gap-4">
          <input
            type="text"
            className="bg-blueprint-bg border border-blueprint-grid p-2 text-white"
            placeholder="Search name or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            type="text"
            className="bg-blueprint-bg border border-blueprint-grid p-2 text-white"
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          />
          <input
            type="text"
            className="bg-blueprint-bg border border-blueprint-grid p-2 text-white"
            placeholder="Filter by skill..."
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading mentors...</div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-lg">No mentors found.</p>
            <p className="text-gray-500 text-sm mt-2">Be the first — enable mentor mode in your profile.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {displayed.map((mentor) => (
              <div key={mentor.id} className="card">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-blueprint-paper rounded-full flex items-center justify-center text-xl font-bold text-safety-green shrink-0">
                    {(mentor.name || mentor.username).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{mentor.name || mentor.username}</h3>
                      <span className="badge-safe">MENTOR</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      @{mentor.username}{mentor.location ? ` • ${mentor.location}` : ''}
                      {mentor.yearsExperience ? ` • ${mentor.yearsExperience}yr exp` : ''}
                    </p>
                    <p className="text-sm text-gray-300 mt-2">{mentor.mentorBio || mentor.bio || 'No bio yet.'}</p>
                    {mentor.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {mentor.skills.map(s => <span key={s} className="tag">{s}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blueprint-grid flex justify-between items-center">
                  <span className="text-neon-cyan font-semibold">
                    {mentor.hourlyRate ? `$${mentor.hourlyRate}/hr` : 'Rate TBD'}
                  </span>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-sm">View</button>
                    <button className="btn-primary text-sm">Book</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
