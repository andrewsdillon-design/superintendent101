'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Weather = 'Clear' | 'Partly Cloudy' | 'Rain' | 'Storm' | 'Fog' | 'Snow' | 'Windy'

const WEATHER_OPTIONS: { label: Weather; emoji: string }[] = [
  { label: 'Clear', emoji: '☀️' },
  { label: 'Partly Cloudy', emoji: '⛅' },
  { label: 'Rain', emoji: '🌧' },
  { label: 'Storm', emoji: '🌩' },
  { label: 'Fog', emoji: '🌫' },
  { label: 'Snow', emoji: '🌨' },
  { label: 'Windy', emoji: '💨' },
]

interface CrewRow { trade: string; count: string }
interface Project { id: string; title: string; status: string }

function EditDailyLogForm() {
  const router = useRouter()
  const params = useParams()
  const logId = params.id as string

  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState('')
  const [weather, setWeather] = useState<Weather | ''>('')
  const [crew, setCrew] = useState<CrewRow[]>([{ trade: '', count: '' }])
  const [workPerformed, setWorkPerformed] = useState('')
  const [deliveries, setDeliveries] = useState('')
  const [inspections, setInspections] = useState('')
  const [issues, setIssues] = useState('')
  const [rfi, setRfi] = useState('')
  const [safetyNotes, setSafetyNotes] = useState('')
  const [address, setAddress] = useState('')
  const [permitNumber, setPermitNumber] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`/api/daily-logs/${logId}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        const log = data.log
        setDate(log.date ? log.date.split('T')[0] : '')
        setWeather((log.weather as Weather) ?? '')
        setWorkPerformed(log.workPerformed ?? '')
        setDeliveries(log.deliveries ?? '')
        setInspections(log.inspections ?? '')
        setIssues(log.issues ?? '')
        setRfi(log.rfi ?? '')
        setSafetyNotes(log.safetyNotes ?? '')
        setAddress(log.address ?? '')
        setPermitNumber(log.permitNumber ?? '')
        setProjectId(log.project?.id ?? '')
        const crewCounts: Record<string, number> = log.crewCounts ?? {}
        const rows = Object.entries(crewCounts).map(([trade, count]) => ({ trade, count: String(count) }))
        setCrew(rows.length > 0 ? rows : [{ trade: '', count: '' }])
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [logId])

  function addCrewRow() { setCrew(prev => [...prev, { trade: '', count: '' }]) }
  function updateCrew(i: number, field: 'trade' | 'count', value: string) {
    setCrew(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  function removeCrew(i: number) { setCrew(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    const crewCounts: Record<string, number> = {}
    crew.forEach(r => {
      if (r.trade.trim() && r.count) crewCounts[r.trade.trim()] = parseInt(r.count) || 0
    })

    try {
      const res = await fetch(`/api/daily-logs/${logId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          weather,
          crewCounts,
          workPerformed,
          deliveries,
          inspections,
          issues,
          rfi,
          safetyNotes,
          address: address || null,
          permitNumber: permitNumber || null,
          projectId: projectId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to update log.')
        setSubmitting(false)
        return
      }
      router.push('/daily-logs')
    } catch {
      setSubmitError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen blueprint-bg flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>
  if (notFound) return (
    <div className="min-h-screen blueprint-bg flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Log not found.</p>
      <Link href="/daily-logs" className="btn-secondary text-sm">← Back to Logs</Link>
    </div>
  )

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/daily-logs" className="text-gray-400 hover:text-white">Daily Logs</Link>
            </nav>
          </div>
          <Link href="/daily-logs" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <h1 className="font-display text-2xl font-bold text-safety-green mb-1">EDIT DAILY LOG</h1>
        <p className="text-gray-400 text-sm mb-6">Update the fields below and save.</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Project */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Project</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
            >
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {/* Address + Permit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Job Site Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St..."
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Permit #</label>
              <input type="text" value={permitNumber} onChange={e => setPermitNumber(e.target.value)} placeholder="Optional..."
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm" />
          </div>

          {/* Weather */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Weather</label>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map(({ label, emoji }) => (
                <button key={label} type="button" onClick={() => setWeather(weather === label ? '' : label)}
                  className={`px-3 py-1.5 text-sm border transition-colors rounded ${weather === label ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10' : 'border-blueprint-grid text-gray-400 hover:border-gray-400'}`}>
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Crew Counts */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Crew Counts</label>
            <div className="space-y-2">
              {crew.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={row.trade} onChange={e => updateCrew(i, 'trade', e.target.value)} placeholder="Trade (e.g. Framers)"
                    className="flex-1 bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm" />
                  <input type="number" value={row.count} onChange={e => updateCrew(i, 'count', e.target.value)} placeholder="Count" min="0"
                    className="w-20 bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm" />
                  {crew.length > 1 && (
                    <button type="button" onClick={() => removeCrew(i)} className="text-gray-600 hover:text-red-400 px-2 text-sm">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addCrewRow} className="text-xs text-neon-cyan hover:text-neon-cyan/80 mt-2">+ Add trade</button>
          </div>

          {/* Work Performed */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Work Performed</label>
            <textarea value={workPerformed} onChange={e => setWorkPerformed(e.target.value)} rows={4} placeholder="What was built or accomplished today..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-green resize-none text-sm" />
          </div>

          {/* Deliveries */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Deliveries</label>
            <textarea value={deliveries} onChange={e => setDeliveries(e.target.value)} rows={2} placeholder="Materials or equipment delivered..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-blue resize-none text-sm" />
          </div>

          {/* Inspections */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Inspections</label>
            <textarea value={inspections} onChange={e => setInspections(e.target.value)} rows={2} placeholder="Inspections today, pass/fail..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-yellow resize-none text-sm" />
          </div>

          {/* Issues */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Issues / Delays</label>
            <textarea value={issues} onChange={e => setIssues(e.target.value)} rows={3} placeholder="Problems, delays, concerns..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-orange resize-none text-sm" />
          </div>

          {/* RFIs */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">RFIs</label>
            <textarea value={rfi} onChange={e => setRfi(e.target.value)} rows={2} placeholder="Requests for Information..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-orange resize-none text-sm" />
          </div>

          {/* Safety Notes */}
          <div>
            <label className="text-xs text-red-400 uppercase tracking-wide block mb-1">⚠ Safety Notes</label>
            <textarea value={safetyNotes} onChange={e => setSafetyNotes(e.target.value)} rows={3} placeholder="Safety observations, incidents, toolbox topics..."
              className="w-full bg-blueprint-bg border border-red-500/30 p-2 text-white focus:outline-none focus:border-red-400 resize-none text-sm" />
          </div>

          {submitError && (
            <div className="p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">{submitError}</div>
          )}

          <div className="flex gap-3 pb-4">
            <button type="submit" disabled={submitting || !date}
              className="btn-primary flex-1 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/daily-logs" className="btn-secondary px-6 py-3">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function EditDailyLogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen blueprint-bg" />}>
      <EditDailyLogForm />
    </Suspense>
  )
}
