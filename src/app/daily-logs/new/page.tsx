'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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

interface CrewRow {
  trade: string
  count: string
}

interface Project {
  id: string
  title: string
  status: string
}

type TranscribeState = 'idle' | 'recording' | 'transcribing' | 'done'

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function NewDailyLogForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId') ?? ''

  // Projects
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState(projectIdParam)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [savingProject, setSavingProject] = useState(false)

  // Form fields
  const [date, setDate] = useState(todayStr())
  const [weather, setWeather] = useState<Weather | ''>('')
  const [crew, setCrew] = useState<CrewRow[]>([{ trade: '', count: '' }])
  const [workPerformed, setWorkPerformed] = useState('')
  const [deliveries, setDeliveries] = useState('')
  const [inspections, setInspections] = useState('')
  const [issues, setIssues] = useState('')
  const [safetyNotes, setSafetyNotes] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])

  // Voice transcription
  const [transcribeState, setTranscribeState] = useState<TranscribeState>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [transcribeError, setTranscribeError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Quick-create project ──────────────────────────────────────────────
  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    setSavingProject(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProjectName.trim(), status: 'ACTIVE' }),
      })
      const data = await res.json()
      if (res.ok) {
        setProjects(prev => [data.project, ...prev])
        setProjectId(data.project.id)
        setNewProjectName('')
        setShowNewProject(false)
      }
    } catch {}
    setSavingProject(false)
  }

  // ── Crew helpers ──────────────────────────────────────────────────────
  function addCrewRow() {
    setCrew(prev => [...prev, { trade: '', count: '' }])
  }

  function updateCrew(index: number, field: 'trade' | 'count', value: string) {
    setCrew(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function removeCrew(index: number) {
    setCrew(prev => prev.filter((_, i) => i !== index))
  }

  // ── Voice recording ───────────────────────────────────────────────────
  async function startRecording() {
    setTranscribeError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(blob)
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setRecordingSeconds(0)
      setTranscribeState('recording')
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      setTranscribeError('Microphone access denied. Allow microphone permission and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setTranscribeState('transcribing')
  }

  async function transcribeAudio(blob: Blob) {
    setTranscribeState('transcribing')
    setTranscribeError('')
    const fd = new FormData()
    fd.append('audio', blob, 'field-note.webm')
    try {
      const res = await fetch('/api/daily-logs/transcribe', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setTranscribeError(data.error || 'Transcription failed')
        setTranscribeState('idle')
        return
      }
      setTranscript(data.transcript ?? '')
      const s = data.structured ?? {}
      if (s.weather) setWeather(s.weather.split(',')[0].trim() as Weather || s.weather)
      if (s.workPerformed) setWorkPerformed(s.workPerformed)
      if (s.deliveries) setDeliveries(s.deliveries)
      if (s.inspections) setInspections(s.inspections)
      if (s.issues) setIssues(s.issues)
      if (s.safetyNotes) setSafetyNotes(s.safetyNotes)
      if (s.crewCounts && typeof s.crewCounts === 'object') {
        const rows: CrewRow[] = Object.entries(s.crewCounts as Record<string, number>)
          .map(([trade, count]) => ({ trade, count: String(count) }))
        if (rows.length > 0) setCrew(rows)
      }
      setTranscribeState('done')
    } catch {
      setTranscribeError('Network error during transcription.')
      setTranscribeState('idle')
    }
  }

  // ── Photo handling ────────────────────────────────────────────────────
  const onPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotoFiles(prev => [...prev, ...files].slice(0, 10))
    e.target.value = ''
  }, [])

  function removePhoto(index: number) {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')

    let photoUrls: string[] = []
    if (photoFiles.length > 0) {
      try {
        const fd = new FormData()
        photoFiles.forEach(f => fd.append('files', f))
        const uploadRes = await fetch('/api/uploads', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          photoUrls = uploadData.urls ?? []
        }
      } catch {}
    }

    const crewCounts: Record<string, number> = {}
    crew.forEach(r => {
      if (r.trade.trim() && r.count) {
        crewCounts[r.trade.trim()] = parseInt(r.count) || 0
      }
    })

    try {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          weather,
          crewCounts,
          workPerformed,
          deliveries,
          inspections,
          issues,
          safetyNotes,
          photoUrls,
          transcript: transcript || null,
          projectId: projectId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to save log.')
        setSubmitting(false)
        return
      }
      router.push(projectId ? `/daily-logs?projectId=${projectId}` : '/daily-logs')
    } catch {
      setSubmitError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  const selectedProject = projects.find(p => p.id === projectId)

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/daily-logs" className="text-gray-400 hover:text-white">Daily Logs</Link>
              <Link href="/daily-logs/new" className="text-white font-semibold">New Log</Link>
            </nav>
          </div>
          <Link href="/daily-logs" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <h1 className="font-display text-2xl font-bold text-safety-green mb-1">NEW DAILY LOG</h1>
        <p className="text-gray-400 text-sm mb-6">
          Use voice transcription to auto-fill, or fill in the fields manually.
        </p>

        {/* Voice Transcription Banner */}
        <div className={`card mb-6 border-2 ${transcribeState === 'done' ? 'border-safety-green' : 'border-safety-orange/50'}`}>
          <h3 className="font-bold text-safety-orange text-sm uppercase mb-3">Voice Transcription</h3>
          {transcribeError && (
            <div className="mb-3 text-sm text-red-400 p-2 bg-red-900/20 border border-red-500/30">
              {transcribeError}
            </div>
          )}
          {transcribeState === 'idle' && (
            <button type="button" onClick={startRecording} className="btn-primary w-full">
              ● Start Recording
            </button>
          )}
          {transcribeState === 'recording' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="font-mono text-2xl text-white">{formatTime(recordingSeconds)}</span>
              </div>
              <p className="text-xs text-gray-400">Recording — speak clearly about what you observed today</p>
              <button type="button" onClick={stopRecording} className="btn-primary w-full">
                ■ Stop &amp; Transcribe
              </button>
            </div>
          )}
          {transcribeState === 'transcribing' && (
            <div className="text-center py-4">
              <p className="font-mono text-neon-cyan animate-pulse">⟳ Transcribing &amp; structuring...</p>
              <p className="text-xs text-gray-500 mt-2">Whisper + AI filling your form fields</p>
            </div>
          )}
          {transcribeState === 'done' && (
            <div>
              <p className="text-safety-green text-sm font-semibold mb-2">✓ Form auto-filled from voice note</p>
              {transcript && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTranscript(v => !v)}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    {showTranscript ? '▲ Hide' : '▼ Show'} raw transcript
                  </button>
                  {showTranscript && (
                    <div className="mt-2 p-2 bg-blueprint-paper/20 border border-blueprint-grid text-xs text-gray-400 max-h-32 overflow-auto">
                      {transcript}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => { setTranscribeState('idle'); setTranscript(''); setTranscribeError('') }}
                className="text-xs text-gray-500 hover:text-white mt-2 block"
              >
                Re-record
              </button>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-3">Audio is transcribed in-memory and not stored.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Project Picker */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Project</label>
            {!showNewProject ? (
              <div className="flex gap-2">
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="flex-1 bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                >
                  <option value="">No project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewProject(true)}
                  className="btn-secondary text-xs px-3 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="flex-1 bg-blueprint-bg border border-neon-cyan/50 p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={savingProject || !newProjectName.trim()}
                  className="btn-primary text-xs px-3 disabled:opacity-50"
                >
                  {savingProject ? '...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewProject(false); setNewProjectName('') }}
                  className="text-gray-500 hover:text-white text-xs px-2"
                >
                  Cancel
                </button>
              </div>
            )}
            {selectedProject && (
              <p className="text-xs text-safety-yellow mt-1">Filing under: {selectedProject.title}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
            />
          </div>

          {/* Weather Chips */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Weather</label>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map(({ label, emoji }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setWeather(weather === label ? '' : label)}
                  className={`px-3 py-1.5 text-sm border transition-colors rounded ${
                    weather === label
                      ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10'
                      : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
                  }`}
                >
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
                  <input
                    type="text"
                    value={row.trade}
                    onChange={e => updateCrew(i, 'trade', e.target.value)}
                    placeholder="Trade (e.g. Framers)"
                    className="flex-1 bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                  />
                  <input
                    type="number"
                    value={row.count}
                    onChange={e => updateCrew(i, 'count', e.target.value)}
                    placeholder="Count"
                    min="0"
                    className="w-20 bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                  />
                  {crew.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCrew(i)}
                      className="text-gray-600 hover:text-red-400 px-2 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addCrewRow} className="text-xs text-neon-cyan hover:text-neon-cyan/80 mt-2">
              + Add trade
            </button>
          </div>

          {/* Work Performed */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Work Performed</label>
            <textarea
              value={workPerformed}
              onChange={e => setWorkPerformed(e.target.value)}
              rows={4}
              placeholder="What was built or accomplished today..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-green resize-none text-sm"
            />
          </div>

          {/* Deliveries */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Deliveries</label>
            <textarea
              value={deliveries}
              onChange={e => setDeliveries(e.target.value)}
              rows={2}
              placeholder="Materials or equipment delivered..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-blue resize-none text-sm"
            />
          </div>

          {/* Inspections */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Inspections</label>
            <textarea
              value={inspections}
              onChange={e => setInspections(e.target.value)}
              rows={2}
              placeholder="Inspections today, pass/fail..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-yellow resize-none text-sm"
            />
          </div>

          {/* Issues / Delays */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Issues / Delays</label>
            <textarea
              value={issues}
              onChange={e => setIssues(e.target.value)}
              rows={3}
              placeholder="Problems, RFIs, delays, concerns..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-orange resize-none text-sm"
            />
          </div>

          {/* Safety Notes */}
          <div>
            <label className="text-xs text-red-400 uppercase tracking-wide block mb-1">⚠ Safety Notes</label>
            <textarea
              value={safetyNotes}
              onChange={e => setSafetyNotes(e.target.value)}
              rows={3}
              placeholder="Safety observations, incidents, toolbox topics..."
              className="w-full bg-blueprint-bg border border-red-500/30 p-2 text-white focus:outline-none focus:border-red-400 resize-none text-sm"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Photos</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotoChange}
              className="hidden"
            />
            {photoFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photoFiles.map((f, i) => (
                  <div key={i} className="relative">
                    <div className="w-16 h-16 bg-blueprint-paper border border-blueprint-grid overflow-hidden">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => photoInputRef.current?.click()} className="btn-secondary text-sm">
              + Add Photos
            </button>
            <p className="text-xs text-gray-600 mt-1">Max 10 photos</p>
          </div>

          {submitError && (
            <div className="p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">{submitError}</div>
          )}

          <div className="flex gap-3 pb-4">
            <button
              type="submit"
              disabled={submitting || !date}
              className="btn-primary flex-1 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Daily Log'}
            </button>
            <Link href="/daily-logs" className="btn-secondary px-6 py-3">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}

export default function NewDailyLogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen blueprint-bg" />}>
      <NewDailyLogForm />
    </Suspense>
  )
}
