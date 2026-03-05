'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

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
  address?: string | null
  permitNumber?: string | null
  planNumber?: string | null
  elevation?: string | null
  electricalSide?: string | null
}

interface MultiLogEntry {
  projectHint?: string
  weather?: string
  crewCounts?: Record<string, number>
  workPerformed?: string
  deliveries?: string
  inspections?: string
  issues?: string
  safetyNotes?: string
  address?: string
  permitNumber?: string
  rfi?: string
}

type TranscribeState = 'idle' | 'recording' | 'transcribing' | 'done' | 'paste'

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function todayStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function NewDailyLogForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId') ?? ''
  const { data: session } = useSession()
  const builderType = (session?.user as any)?.builderType ?? null
  const isResidential = builderType === 'RESIDENTIAL'
  const isCommercial = builderType === 'COMMERCIAL'
  const defaultProjectId = (session?.user as any)?.defaultProjectId ?? null

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
  const [rfi, setRfi] = useState('')
  const [safetyNotes, setSafetyNotes] = useState('')
  const [address, setAddress] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [permitNumber, setPermitNumber] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])

  // Voice transcription
  const [transcribeState, setTranscribeState] = useState<TranscribeState>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [transcribeError, setTranscribeError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [audioFileName, setAudioFileName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [formRevealed, setFormRevealed] = useState(false)

  // Multi-lot state
  const [multiLogs, setMultiLogs] = useState<MultiLogEntry[]>([])
  const [multiProjectSelections, setMultiProjectSelections] = useState<Record<number, string>>({})
  const [savingMulti, setSavingMulti] = useState(false)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {})
  }, [])

  // Auto-select default project if no projectId from URL
  useEffect(() => {
    if (!projectIdParam && defaultProjectId && !projectId) {
      setProjectId(defaultProjectId)
    }
  }, [defaultProjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Project change — auto-fill header fields ─────────────────────────
  function handleProjectChange(id: string) {
    setProjectId(id)
    if (!id) return
    const p = projects.find(p => p.id === id)
    if (!p) return
    if (p.address && !address) setAddress(p.address)
    if (p.permitNumber && !permitNumber) setPermitNumber(p.permitNumber)
  }

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
        await transcribeBlob(blob, 'field-note.webm')
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

  // ── Audio file upload ─────────────────────────────────────────────────
  function handleAudioFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioFileName(file.name)
    setTranscribeError('')
    setTranscribeState('transcribing')
    transcribeBlob(file, file.name)
    e.target.value = ''
  }

  // ── Shared: apply structured AI response to form or multi-lot state ──
  function applyStructured(s: any, rawTranscript: string) {
    setTranscript(rawTranscript)

    // Multi-lot response
    if (s.multi === true && Array.isArray(s.logs) && s.logs.length > 1) {
      setMultiLogs(s.logs)
      // Pre-select projects by fuzzy match on projectHint
      const selections: Record<number, string> = {}
      s.logs.forEach((log: MultiLogEntry, i: number) => {
        if (log.projectHint) {
          const hint = log.projectHint.toLowerCase()
          const match = projects.find(p => p.title.toLowerCase().includes(hint) || hint.includes(p.title.toLowerCase()))
          selections[i] = match?.id ?? ''
        }
      })
      setMultiProjectSelections(selections)
      setTranscribeState('done')
      setFormRevealed(true)
      return
    }

    // Single log — fill form
    setMultiLogs([])
    if (s.weather) setWeather(s.weather as Weather)
    if (s.workPerformed) setWorkPerformed(s.workPerformed)
    if (s.deliveries) setDeliveries(s.deliveries)
    if (s.inspections) setInspections(s.inspections)
    if (s.issues) setIssues(s.issues)
    if (s.safetyNotes) setSafetyNotes(s.safetyNotes)
    if (s.address) setAddress(s.address)
    if (s.lotNumber) setLotNumber(s.lotNumber)
    if (s.permitNumber) setPermitNumber(s.permitNumber)
    if (s.rfi) setRfi(s.rfi)
    if (s.crewCounts && typeof s.crewCounts === 'object') {
      const rows: CrewRow[] = Object.entries(s.crewCounts as Record<string, number>)
        .map(([trade, count]) => ({ trade, count: String(count) }))
      if (rows.length > 0) setCrew(rows)
    }
    setTranscribeState('done')

    // Warn if transcription heard something but structuring produced no fields
    const hasAnyField = s.weather || s.workPerformed || s.inspections || s.issues
    if (!hasAnyField && rawTranscript) {
      setTranscribeError(`Transcribed but form is empty — heard: "${rawTranscript.slice(0, 200)}"`)
    }

    setFormRevealed(true)
  }

  // ── Reset back to mic hero ─────────────────────────────────────────────────
  function resetToMicHero() {
    setFormRevealed(false)
    setTranscribeState('idle')
    setTranscript('')
    setShowTranscript(false)
    setTranscribeError('')
    setAudioFileName('')
    setPasteText('')
    setMultiLogs([])
    setWeather('')
    setCrew([{ trade: '', count: '' }])
    setWorkPerformed('')
    setDeliveries('')
    setInspections('')
    setIssues('')
    setRfi('')
    setSafetyNotes('')
    setAddress('')
    setLotNumber('')
    setPermitNumber('')
  }

  async function transcribeBlob(blob: Blob, filename: string) {
    setTranscribeState('transcribing')
    setTranscribeError('')
    const fd = new FormData()
    fd.append('audio', blob, filename)
    fd.append('projects', JSON.stringify(projects.map(p => ({ id: p.id, title: p.title }))))
    try {
      const res = await fetch('/api/daily-logs/transcribe', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setTranscribeError(data.error || 'Transcription failed')
        setTranscribeState('idle')
        return
      }
      applyStructured(data.structured ?? {}, data.transcript ?? '')
    } catch {
      setTranscribeError('Network error during transcription.')
      setTranscribeState('idle')
    }
  }

  // ── Paste transcript ──────────────────────────────────────────────────
  async function handlePasteSubmit() {
    if (!pasteText.trim()) return
    setTranscribeState('transcribing')
    setTranscribeError('')
    const fd = new FormData()
    fd.append('transcript', pasteText.trim())
    fd.append('projects', JSON.stringify(projects.map(p => ({ id: p.id, title: p.title }))))
    try {
      const res = await fetch('/api/daily-logs/transcribe', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setTranscribeError(data.error || 'Failed to structure transcript')
        setTranscribeState('paste')
        return
      }
      setPasteText('')
      applyStructured(data.structured ?? {}, pasteText.trim())
    } catch {
      setTranscribeError('Network error. Please try again.')
      setTranscribeState('paste')
    }
  }

  // ── Save all multi-lot logs ───────────────────────────────────────────
  async function handleSaveAllMulti() {
    setSavingMulti(true)
    try {
      const logs = multiLogs.map((log, i) => ({
        projectId: multiProjectSelections[i] || undefined,
        date,
        weather: log.weather ?? '',
        crewCounts: log.crewCounts ?? {},
        workPerformed: log.workPerformed ?? '',
        deliveries: log.deliveries ?? '',
        inspections: log.inspections ?? '',
        issues: log.issues ?? '',
        safetyNotes: log.safetyNotes ?? '',
        address: log.address || null,
        permitNumber: log.permitNumber || null,
        rfi: log.rfi ?? '',
      }))
      const res = await fetch('/api/daily-logs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      })
      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error || 'Failed to save logs.')
        return
      }
      router.push('/daily-logs')
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSavingMulti(false)
    }
  }

  // ── Photo / file handling ─────────────────────────────────────────────
  const addFiles = useCallback((incoming: File[]) => {
    setPhotoFiles(prev => [...prev, ...incoming].slice(0, 10))
  }, [])

  const onPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }, [addFiles])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }, [addFiles])

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
          rfi,
          safetyNotes,
          address: address || null,
          lotNumber: isResidential ? (lotNumber || null) : null,
          permitNumber: permitNumber || null,
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

      <main className="max-w-2xl mx-auto px-4 pb-24 md:pb-8">

        {/* ── Mic hero — shown until form is revealed ── */}
        {!formRevealed && (
          <div className="flex flex-col items-center justify-center min-h-[72vh] gap-5">

            {transcribeState === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-safety-orange flex items-center justify-center text-4xl shadow-lg hover:opacity-90 transition-opacity"
                  style={{ boxShadow: '0 0 32px rgba(249,115,22,0.4)' }}
                >
                  🎙
                </button>
                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">Tap to Record</p>
                <div className="flex gap-3 mt-2">
                  <label
                    htmlFor="audio-upload"
                    className="btn-secondary text-sm cursor-pointer px-4 py-2"
                  >
                    ↑ Upload Audio
                  </label>
                  <input
                    id="audio-upload"
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.wma,.opus"
                    onChange={handleAudioFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setTranscribeState('paste')}
                    className="btn-secondary text-sm px-4 py-2"
                  >
                    📋 Paste Transcript
                  </button>
                </div>
                <p className="text-xs text-gray-700">MP3, M4A, WAV, OGG, FLAC — max 25MB</p>
              </>
            )}

            {transcribeState === 'recording' && (
              <>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-4xl animate-pulse hover:opacity-90"
                >
                  ⏹
                </button>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono text-3xl text-white tracking-widest">{formatTime(recordingSeconds)}</span>
                </div>
                <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">Click to Stop</p>
              </>
            )}

            {transcribeState === 'transcribing' && (
              <>
                <div className="w-24 h-24 rounded-full border-2 border-neon-cyan flex items-center justify-center">
                  <span className="font-mono text-neon-cyan text-3xl animate-spin inline-block">⟳</span>
                </div>
                <p className="font-mono text-neon-cyan animate-pulse text-sm">Transcribing &amp; structuring...</p>
                {audioFileName && <p className="text-xs text-gray-600">{audioFileName}</p>}
              </>
            )}

            {transcribeState === 'paste' && (
              <div className="w-full space-y-3">
                <h3 className="font-bold text-safety-orange text-sm uppercase tracking-wide">Paste Transcript</h3>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={7}
                  placeholder="Paste or type your field notes here — AI will structure them into the form..."
                  className="w-full bg-blueprint-bg border border-blueprint-grid p-3 text-white focus:outline-none focus:border-neon-cyan resize-none text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim()}
                    className="btn-primary flex-1 text-sm disabled:opacity-50"
                  >
                    Structure → Fill Form
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTranscribeState('idle'); setPasteText(''); setTranscribeError('') }}
                    className="btn-secondary text-sm px-4"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {transcribeError && (
              <div className="text-sm text-red-400 p-3 bg-red-900/20 border border-red-500/30 w-full">
                {transcribeError}
              </div>
            )}
          </div>
        )}

        {/* ── Re-record bar + form — shown after transcription ── */}
        {formRevealed && (
          <>
            <div className="flex items-center gap-3 py-4 border-b border-blueprint-grid mb-6">
              <button
                type="button"
                onClick={resetToMicHero}
                className="text-sm text-safety-orange border border-safety-orange/50 hover:border-safety-orange px-3 py-1.5 transition-colors"
              >
                🎙 Re-record
              </button>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setShowTranscript(v => !v)}
                  className="text-sm text-gray-500 hover:text-gray-300 px-3 py-1.5 border border-blueprint-grid"
                >
                  📋 {showTranscript ? 'Hide' : 'Transcript'}
                </button>
              )}
              {transcribeError && (
                <span className="text-xs text-red-400 flex-1 text-right">{transcribeError}</span>
              )}
            </div>
            {showTranscript && transcript && (
              <div className="mb-6 p-3 bg-blueprint-paper/10 border border-blueprint-grid text-xs text-gray-400 max-h-32 overflow-auto">
                {transcript}
              </div>
            )}
          </>
        )}

        {/* ── Multi-lot + form — shown after transcription ── */}
        {formRevealed && multiLogs.length > 1 && (
          <div className="card mb-6 border-2 border-safety-yellow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-safety-yellow text-sm uppercase tracking-wide">
                {multiLogs.length} Lots Detected — Review &amp; Save
              </h3>
              <button
                type="button"
                onClick={() => setMultiLogs([])}
                className="text-xs text-gray-500 hover:text-white"
              >
                ✕ Dismiss
              </button>
            </div>
            <div className="space-y-4">
              {multiLogs.map((log, i) => {
                const crewTotal = Object.values(log.crewCounts ?? {}).reduce((s, n) => s + (n || 0), 0)
                return (
                  <div key={i} className="p-3 bg-blueprint-bg border border-blueprint-grid">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-bold text-safety-orange tracking-wide">
                          {log.projectHint || `Lot ${i + 1}`}
                        </p>
                        {log.address && <p className="text-xs text-gray-400 mt-0.5">📍 {log.address}</p>}
                        {log.permitNumber && <p className="text-xs text-gray-400">📋 Permit: {log.permitNumber}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          {log.weather && <span>{log.weather}</span>}
                          {crewTotal > 0 && <span>{crewTotal} crew</span>}
                        </div>
                      </div>
                      <select
                        value={multiProjectSelections[i] ?? ''}
                        onChange={e => setMultiProjectSelections(prev => ({ ...prev, [i]: e.target.value }))}
                        className="text-xs bg-blueprint-bg border border-blueprint-grid p-1.5 text-white focus:outline-none focus:border-neon-cyan ml-3 flex-shrink-0"
                      >
                        <option value="">No project</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    {log.workPerformed && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">{log.workPerformed}</p>
                    )}
                  </div>
                )
              })}
            </div>
            {submitError && <p className="text-red-400 text-sm mt-3">{submitError}</p>}
            <button
              type="button"
              onClick={handleSaveAllMulti}
              disabled={savingMulti}
              className="btn-primary w-full mt-4 disabled:opacity-50"
            >
              {savingMulti ? 'Saving...' : `Save All ${multiLogs.length} Logs →`}
            </button>
          </div>
        )}

        {formRevealed && <form onSubmit={handleSubmit} className="space-y-6">

          {/* Project Picker */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Project</label>
            {!showNewProject ? (
              <div className="flex gap-2">
                <select
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
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

          {/* Lot # — residential only */}
          {isResidential && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Lot #</label>
              <input
                type="text"
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="Lot number..."
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
              />
            </div>
          )}

          {/* Address */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Job Site Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
            />
          </div>

          {/* Permit # */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Permit #</label>
            <input
              type="text"
              value={permitNumber}
              onChange={e => setPermitNumber(e.target.value)}
              placeholder="Optional..."
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
            />
          </div>

          {/* Residential: plan set / elevation / electrical side from selected project */}
          {isResidential && selectedProject && (selectedProject.planNumber || selectedProject.elevation || selectedProject.electricalSide) && (
            <div className="p-3 bg-blueprint-paper/10 border border-blue-900/40 text-xs space-y-1">
              <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mb-2">Project Details</p>
              {selectedProject.planNumber && (
                <p className="text-gray-400">Plan Set: <span className="text-blue-300 font-semibold">{selectedProject.planNumber}</span></p>
              )}
              {selectedProject.elevation && (
                <p className="text-gray-400">Elevation: <span className="text-blue-300 font-semibold">{selectedProject.elevation}</span></p>
              )}
              {selectedProject.electricalSide && (
                <p className="text-gray-400">Electrical Side: <span className="text-blue-300 font-semibold">{selectedProject.electricalSide}</span></p>
              )}
            </div>
          )}

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

          {/* RFIs — commercial: shown prominently before inspections; residential: hidden */}
          {!isResidential && (
            <div className={isCommercial ? 'border border-neon-cyan/20 p-3 -mx-3' : ''}>
              {isCommercial && <p className="text-[10px] text-neon-cyan font-bold uppercase tracking-widest mb-2">RFIs</p>}
              {!isCommercial && <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">RFIs</label>}
              <textarea
                value={rfi}
                onChange={e => setRfi(e.target.value)}
                rows={2}
                placeholder="Requests for Information submitted or received..."
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-safety-orange resize-none text-sm"
              />
            </div>
          )}

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
              placeholder="Problems, delays, concerns..."
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

          {/* Photos & Files */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Site Photos &amp; Files</label>

            {/* Hidden inputs */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={onPhotoChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.heic,.heif,.png,.jpg,.jpeg"
              multiple
              onChange={onFileChange}
              className="hidden"
            />

            {/* Thumbnails */}
            {photoFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photoFiles.map((f, i) => (
                  <div key={i} className="relative">
                    <div className="w-16 h-16 bg-blueprint-paper border border-blueprint-grid overflow-hidden flex items-center justify-center">
                      {f.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400 text-center px-1 break-all leading-tight">{f.name.split('.').pop()?.toUpperCase()}</span>
                      )}
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

            <div className="flex gap-2">
              {/* Primary: opens phone camera/photos */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="btn-primary text-sm flex-1"
              >
                📷 Camera / Photos
              </button>
              {/* Secondary: opens file browser (shows all files + photos) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm flex-1"
              >
                📁 Browse Files
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">Max 10 files total</p>
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
        </form>}
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
